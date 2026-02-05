import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db, auth } from "../utils/firebase.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { checkSubscriptionLimit } from "../middleware/checkSubscriptionLimit.js";
import type { AuthenticatedRequest } from "../types/index.js";
import {
  createOrganizationInvite,
  getOrganizationInvites,
  resendInvite,
  cancelInvite,
} from "../services/inviteService.js";
import {
  sendMemberInviteEmail,
  sendSignupInviteEmail,
} from "../services/emailService.js";
import { serializeTimestamps } from "../utils/serialization.js";
import { canInviteMembers, DEFAULT_HOLIDAY_SETTINGS } from "@equiduty/shared";
import { getTierDefaults } from "../utils/tierDefaults.js";

// Zod schemas for validation
const supportedCountryCodeSchema = z.enum(["SE"]);

const holidayCalendarSettingsSchema = z.object({
  countryCode: supportedCountryCodeSchema.default(
    DEFAULT_HOLIDAY_SETTINGS.countryCode,
  ),
  enableHolidayDisplay: z
    .boolean()
    .default(DEFAULT_HOLIDAY_SETTINGS.enableHolidayDisplay),
  enableHolidayMultiplier: z
    .boolean()
    .default(DEFAULT_HOLIDAY_SETTINGS.enableHolidayMultiplier),
  holidayMultiplier: z
    .number()
    .min(1.0)
    .max(3.0)
    .default(DEFAULT_HOLIDAY_SETTINGS.holidayMultiplier),
  enableSchedulingRestrictions: z
    .boolean()
    .default(DEFAULT_HOLIDAY_SETTINGS.enableSchedulingRestrictions),
  restrictedHolidays: z.array(z.string()).optional(),
});

const organizationSettingsSchema = z.object({
  holidayCalendar: holidayCalendarSettingsSchema.optional(),
});

const organizationRoleSchema = z.enum([
  "administrator",
  "schedule_planner",
  "veterinarian",
  "dentist",
  "farrier",
  "customer",
  "groom",
  "saddle_maker",
  "horse_owner",
  "rider",
  "inseminator",
  "trainer",
  "training_admin",
  "support_contact",
]);

const createOrganizationSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  contactType: z.enum(["Personal", "Business"]),
  primaryEmail: z.string().email(),
  phoneNumber: z.string().optional(),
  timezone: z.string().default("Europe/Stockholm"),
});

const updateOrganizationSchema = createOrganizationSchema.partial().extend({
  settings: organizationSettingsSchema.optional(),
});

const inviteContactAddressSchema = z.object({
  street: z.string(),
  houseNumber: z.string(),
  addressLine2: z.string().optional(),
  postcode: z.string(),
  city: z.string(),
  stateProvince: z.string().optional(),
  country: z.string(),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().optional(),
  roles: z.array(organizationRoleSchema).min(1),
  primaryRole: organizationRoleSchema,
  showInPlanning: z.boolean().default(true),
  stableAccess: z.enum(["all", "specific"]).default("all"),
  assignedStableIds: z.array(z.string()).optional(),
  // Contact creation fields
  contactType: z.enum(["Personal", "Business"]).default("Personal"),
  businessName: z.string().optional(),
  address: inviteContactAddressSchema.optional(),
});

const updateMemberRolesSchema = z.object({
  roles: z.array(organizationRoleSchema).min(1),
  primaryRole: organizationRoleSchema,
  showInPlanning: z.boolean().optional(),
  stableAccess: z.enum(["all", "specific"]).optional(),
  assignedStableIds: z.array(z.string()).optional(),
});

/**
 * Count existing support_contact members + pending invites for an organization.
 * The org owner is never counted against the limit.
 */
async function countSupportContacts(
  organizationId: string,
  ownerId: string,
  excludeMemberId?: string,
): Promise<number> {
  // Count active/pending members with support_contact role (excluding owner)
  const membersSnapshot = await db
    .collection("organizationMembers")
    .where("organizationId", "==", organizationId)
    .get();

  let count = 0;
  for (const doc of membersSnapshot.docs) {
    if (excludeMemberId && doc.id === excludeMemberId) continue;
    const data = doc.data();
    if (data.userId === ownerId) continue;
    if (
      (data.status === "active" || data.status === "pending") &&
      data.roles?.includes("support_contact")
    ) {
      count++;
    }
  }

  // Count pending invites with support_contact role
  const invitesSnapshot = await db
    .collection("invites")
    .where("organizationId", "==", organizationId)
    .where("status", "==", "pending")
    .get();

  for (const doc of invitesSnapshot.docs) {
    const data = doc.data();
    if (data.roles?.includes("support_contact")) {
      count++;
    }
  }

  return count;
}

/**
 * Validate that assigning support_contact role doesn't exceed the tier limit.
 * Returns null if OK, or an error message string if the limit would be exceeded.
 */
async function validateSupportContactLimit(
  organizationId: string,
  ownerId: string,
  subscriptionTier: string,
  excludeMemberId?: string,
): Promise<string | null> {
  const tierDef = await getTierDefaults(subscriptionTier);
  if (!tierDef) return null; // Unknown tier, allow

  const maxContacts = tierDef.limits.supportContacts;
  if (maxContacts === -1) return null; // Unlimited

  const currentCount = await countSupportContacts(
    organizationId,
    ownerId,
    excludeMemberId,
  );

  if (currentCount >= maxContacts) {
    return `Support contact limit reached (${maxContacts}). Remove an existing support contact or upgrade your plan.`;
  }

  return null;
}

export async function organizationsRoutes(fastify: FastifyInstance) {
  // List all organizations for authenticated user
  fastify.get(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;

        // Get organizations where user is owner or member
        const ownerOrgsSnapshot = await db
          .collection("organizations")
          .where("ownerId", "==", user.uid)
          .get();

        const memberOrgsSnapshot = await db
          .collection("organizationMembers")
          .where("userId", "==", user.uid)
          .where("status", "==", "active")
          .get();

        const memberOrgIds = memberOrgsSnapshot.docs.map(
          (doc) => doc.data().organizationId,
        );
        const memberOrgs =
          memberOrgIds.length > 0
            ? await Promise.all(
                memberOrgIds.map((id) =>
                  db.collection("organizations").doc(id).get(),
                ),
              )
            : [];

        const allOrgs = [
          ...ownerOrgsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })),
          ...memberOrgs
            .filter((doc) => doc.exists)
            .map((doc) => ({ id: doc.id, ...doc.data() })),
        ];

        // Remove duplicates
        const uniqueOrgs = Array.from(
          new Map(allOrgs.map((org) => [org.id, org])).values(),
        );

        return { organizations: uniqueOrgs };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch organizations");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch organizations",
        });
      }
    },
  );

  // Get single organization
  fastify.get(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        const doc = await db.collection("organizations").doc(id).get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Organization not found",
          });
        }

        const org = doc.data()!;

        // Check access: owner, member, or system_admin
        const memberId = `${user.uid}_${id}`;
        const memberDoc = await db
          .collection("organizationMembers")
          .doc(memberId)
          .get();
        const isMember =
          memberDoc.exists && memberDoc.data()?.status === "active";

        if (
          org.ownerId !== user.uid &&
          !isMember &&
          user.role !== "system_admin"
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this organization",
          });
        }

        return { id: doc.id, ...org };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch organization");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch organization",
        });
      }
    },
  );

  // Create organization (requires stable_owner or system_admin role)
  fastify.post(
    "/",
    {
      preHandler: [authenticate, requireRole(["stable_owner", "system_admin"])],
    },
    async (request, reply) => {
      try {
        const validation = createOrganizationSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const user = (request as AuthenticatedRequest).user!;

        // Get user details for ownerEmail
        const userDoc = await db.collection("users").doc(user.uid).get();
        const userData = userDoc.data();

        // Determine organization type:
        // - stable_owner or system_admin creating via explicit endpoint → 'business'
        // Note: 'personal' orgs are auto-created during signup, not via this endpoint
        const organizationType = "business" as const;

        const organizationData = {
          ...validation.data,
          ownerId: user.uid,
          ownerEmail: userData?.email || user.email,
          organizationType,
          subscriptionTier: "free" as const,
          stats: {
            stableCount: 0,
            totalMemberCount: 1, // Owner counts as first member
          },
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };

        const docRef = await db
          .collection("organizations")
          .add(organizationData);
        const doc = await docRef.get();
        const organizationId = doc.id;

        // Create organizationMember record for owner
        const memberId = `${user.uid}_${organizationId}`;
        await db
          .collection("organizationMembers")
          .doc(memberId)
          .set({
            id: memberId,
            organizationId,
            userId: user.uid,
            userEmail: (userData?.email || user.email).toLowerCase(),
            firstName: userData?.firstName || "",
            lastName: userData?.lastName || "",
            phoneNumber: userData?.phoneNumber || null,
            roles: ["administrator"],
            primaryRole: "administrator",
            status: "active",
            showInPlanning: true,
            stableAccess: "all",
            assignedStableIds: [],
            joinedAt: Timestamp.now(),
            invitedBy: user.uid, // Self-created
            inviteAcceptedAt: Timestamp.now(),
          });

        return reply.status(201).send({
          id: doc.id,
          ...doc.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to create organization");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create organization",
        });
      }
    },
  );

  // Update organization (requires owner, administrator, or system_admin)
  fastify.patch(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const validation = updateOrganizationSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const user = (request as AuthenticatedRequest).user!;
        const docRef = db.collection("organizations").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Organization not found",
          });
        }

        const org = doc.data()!;

        // Check permissions: owner, administrator, or system_admin
        const memberId = `${user.uid}_${id}`;
        const memberDoc = await db
          .collection("organizationMembers")
          .doc(memberId)
          .get();
        const memberData = memberDoc.data();
        const isAdministrator =
          memberData?.status === "active" &&
          memberData?.roles?.includes("administrator");

        if (
          org.ownerId !== user.uid &&
          !isAdministrator &&
          user.role !== "system_admin"
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to update this organization",
          });
        }

        // Handle settings specially to use dot notation for nested updates
        // This prevents overwriting other settings fields when only updating one
        const { settings, ...otherData } = validation.data;
        const updateData: Record<string, unknown> = {
          ...otherData,
          updatedAt: FieldValue.serverTimestamp(),
        };

        // Convert nested settings to dot notation for proper Firestore merge
        if (settings) {
          if (settings.holidayCalendar !== undefined) {
            updateData["settings.holidayCalendar"] = settings.holidayCalendar;
          }
          // Add other settings fields here as they are added to the schema
        }

        await docRef.update(updateData);
        const updatedDoc = await docRef.get();

        return {
          id: updatedDoc.id,
          ...updatedDoc.data(),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to update organization");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update organization",
        });
      }
    },
  );

  // Delete organization (requires owner or system_admin)
  fastify.delete(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const docRef = db.collection("organizations").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Organization not found",
          });
        }

        const org = doc.data()!;

        // Only owner or system_admin can delete
        if (org.ownerId !== user.uid && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to delete this organization",
          });
        }

        await docRef.delete();

        return reply.status(204).send();
      } catch (error) {
        request.log.error({ error }, "Failed to delete organization");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete organization",
        });
      }
    },
  );

  // Update organization stats (stableCount, totalMemberCount)
  fastify.patch(
    "/:id/stats",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        const docRef = db.collection("organizations").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Organization not found",
          });
        }

        const org = doc.data()!;

        // Only owner or system_admin can update stats
        if (org.ownerId !== user.uid && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to update this organization",
          });
        }

        // Build updates object for nested stats fields
        const updates: Record<string, number> = {};
        if (data.stableCount !== undefined) {
          updates["stats.stableCount"] = data.stableCount;
        }
        if (data.totalMemberCount !== undefined) {
          updates["stats.totalMemberCount"] = data.totalMemberCount;
        }

        if (Object.keys(updates).length === 0) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "No valid stats fields provided",
          });
        }

        await docRef.update(updates);

        // Get updated document
        const updatedDoc = await docRef.get();

        return serializeTimestamps({
          id: updatedDoc.id,
          ...updatedDoc.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to update organization stats");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update organization stats",
        });
      }
    },
  );

  // ========================================================================
  // ORGANIZATION UPGRADE ROUTE
  // ========================================================================

  // Upgrade organization from personal to business
  // POST /api/v1/organizations/:id/upgrade
  fastify.post(
    "/:id/upgrade",
    {
      preHandler: [authenticate, requireRole(["stable_owner", "system_admin"])],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        const orgRef = db.collection("organizations").doc(id);
        const orgDoc = await orgRef.get();

        if (!orgDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Organization not found",
          });
        }

        const org = orgDoc.data()!;

        // Only owner can upgrade their organization
        if (org.ownerId !== user.uid && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Only the organization owner can upgrade",
          });
        }

        // Check if already a business organization
        if (org.organizationType === "business") {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Organization is already a business organization",
          });
        }

        // Start a batch for atomic operations
        const batch = db.batch();

        // Update organization type
        batch.update(orgRef, {
          organizationType: "business",
          upgradedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Handle implicit stable if it exists
        if (org.implicitStableId) {
          const stableRef = db.collection("stables").doc(org.implicitStableId);
          const stableDoc = await stableRef.get();

          if (stableDoc.exists) {
            const stableData = stableDoc.data()!;
            // Rename implicit stable to a proper business stable name
            // If it's still named "My Horses", rename to organization name
            const newName =
              stableData.name === "My Horses" ||
              stableData.name === "Mina hästar"
                ? `${org.name} Stable`
                : stableData.name;

            batch.update(stableRef, {
              name: newName,
              isImplicit: false,
              updatedAt: FieldValue.serverTimestamp(),
            });
          }

          // Remove implicitStableId from organization
          batch.update(orgRef, {
            implicitStableId: FieldValue.delete(),
          });
        }

        await batch.commit();

        // Get updated organization
        const updatedDoc = await orgRef.get();

        request.log.info(
          { organizationId: id, userId: user.uid },
          "Organization upgraded from personal to business",
        );

        return {
          id: updatedDoc.id,
          ...updatedDoc.data(),
          message: "Organization successfully upgraded to business",
        };
      } catch (error) {
        request.log.error({ error }, "Failed to upgrade organization");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to upgrade organization",
        });
      }
    },
  );

  // ========================================================================
  // MEMBER MANAGEMENT ROUTES
  // ========================================================================

  // Get organization members
  // Supports optional ?status= query parameter for server-side filtering
  fastify.get(
    "/:id/members",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { status } = request.query as { status?: string };
        const user = (request as AuthenticatedRequest).user!;

        // Verify organization exists and user has access
        const orgDoc = await db.collection("organizations").doc(id).get();
        if (!orgDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Organization not found",
          });
        }

        const org = orgDoc.data()!;
        const memberId = `${user.uid}_${id}`;
        const userMemberDoc = await db
          .collection("organizationMembers")
          .doc(memberId)
          .get();
        const isUserMember =
          userMemberDoc.exists && userMemberDoc.data()?.status === "active";

        if (
          org.ownerId !== user.uid &&
          !isUserMember &&
          user.role !== "system_admin"
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to view members",
          });
        }

        // Build query with optional status filter
        let query: FirebaseFirestore.Query = db
          .collection("organizationMembers")
          .where("organizationId", "==", id);

        // Apply server-side status filter if provided
        if (status && ["active", "inactive", "pending"].includes(status)) {
          query = query.where("status", "==", status);
        }

        const snapshot = await query.get();

        const members = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        return { members };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch organization members");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch organization members",
        });
      }
    },
  );

  // POST /api/v1/organizations/:id/members - Invite member (existing or new user)
  fastify.post(
    "/:id/members",
    {
      preHandler: [
        authenticate,
        checkSubscriptionLimit("members", "organizationMembers"),
      ],
    },
    async (request, reply) => {
      try {
        const { id: organizationId } = request.params as { id: string };
        const validation = inviteMemberSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const user = (request as AuthenticatedRequest).user!;
        const inviteData = validation.data;

        // Get inviter user details for email
        const inviterUserDoc = await db.collection("users").doc(user.uid).get();
        const inviterUserData = inviterUserDoc.data();

        // Get organization
        const orgDoc = await db
          .collection("organizations")
          .doc(organizationId)
          .get();
        if (!orgDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Organization not found",
          });
        }

        const org = orgDoc.data()!;

        // Feature gate: Check if organization can invite members
        if (!canInviteMembers(org as any)) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "Personal organizations cannot invite members. Upgrade to a business organization to invite team members.",
            code: "PERSONAL_ORG_LIMIT",
          });
        }

        // Check permissions: owner, administrator, or system_admin
        const userMemberId = `${user.uid}_${organizationId}`;
        const userMemberDoc = await db
          .collection("organizationMembers")
          .doc(userMemberId)
          .get();
        const userMemberData = userMemberDoc.data();
        const isAdministrator =
          userMemberData?.status === "active" &&
          userMemberData?.roles?.includes("administrator");

        if (
          org.ownerId !== user.uid &&
          !isAdministrator &&
          user.role !== "system_admin"
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to invite members",
          });
        }

        // Enforce support_contact delegate limit when inviting with that role
        if (inviteData.roles.includes("support_contact")) {
          const limitError = await validateSupportContactLimit(
            organizationId,
            org.ownerId,
            org.subscriptionTier,
          );
          if (limitError) {
            return reply.status(403).send({
              error: "Forbidden",
              message: limitError,
              code: "SUPPORT_CONTACT_LIMIT",
            });
          }
        }

        // Check if email is already a member (by email, regardless of userId)
        const existingMemberSnapshot = await db
          .collection("organizationMembers")
          .where("organizationId", "==", organizationId)
          .where("userEmail", "==", inviteData.email.toLowerCase())
          .limit(1)
          .get();

        if (!existingMemberSnapshot.empty) {
          return reply.status(409).send({
            error: "Conflict",
            message: "User is already a member of this organization",
            code: "ALREADY_MEMBER",
          });
        }

        // Check if there's already a pending invite for this email
        const existingInviteSnapshot = await db
          .collection("invites")
          .where("organizationId", "==", organizationId)
          .where("email", "==", inviteData.email.toLowerCase())
          .where("status", "==", "pending")
          .limit(1)
          .get();

        if (!existingInviteSnapshot.empty) {
          return reply.status(409).send({
            error: "Conflict",
            message:
              "An invitation has already been sent to this email address",
            code: "INVITE_ALREADY_PENDING",
          });
        }

        // Check if user exists in the system
        const userSnapshot = await db
          .collection("users")
          .where("email", "==", inviteData.email.toLowerCase())
          .limit(1)
          .get();

        if (!userSnapshot.empty) {
          // EXISTING USER FLOW
          const existingUser = userSnapshot.docs[0];
          const existingUserData = existingUser.data();
          const userId = existingUser.id;
          const memberId = `${userId}_${organizationId}`;

          // Create organizationMember with pending status
          const expiresAt = Timestamp.fromDate(
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          );
          const memberData = {
            id: memberId,
            organizationId,
            userId,
            userEmail: inviteData.email.toLowerCase(),
            firstName: inviteData.firstName || existingUserData.firstName || "",
            lastName: inviteData.lastName || existingUserData.lastName || "",
            phoneNumber: inviteData.phoneNumber || existingUserData.phoneNumber,
            roles: inviteData.roles,
            primaryRole: inviteData.primaryRole,
            status: "pending" as const,
            showInPlanning: inviteData.showInPlanning,
            stableAccess: inviteData.stableAccess,
            assignedStableIds: inviteData.assignedStableIds || [],
            expiresAt,
            joinedAt: Timestamp.now(),
            invitedBy: user.uid,
          };

          await db
            .collection("organizationMembers")
            .doc(memberId)
            .set(memberData);

          // Create in-app notification for the invited user
          const inviterName =
            `${inviterUserData?.firstName || ""} ${inviterUserData?.lastName || ""}`.trim();
          const notificationId = `membership_invite_${memberId}`;
          try {
            await db
              .collection("notifications")
              .doc(notificationId)
              .set({
                id: notificationId,
                userId,
                organizationId,
                type: "membership_invite",
                priority: "high",
                title: "Organization Invite",
                titleKey: "notifications.membershipInvite.title",
                body: `You've been invited to ${org.name}`,
                bodyKey: "notifications.membershipInvite.body",
                bodyParams: {
                  organizationName: org.name,
                  inviterName,
                },
                entityType: "organizationMember",
                entityId: memberId,
                channels: ["inApp", "email"],
                deliveryStatus: { inApp: "sent" },
                deliveryAttempts: 1,
                read: false,
                actionUrl: `/invites/accept?memberId=${memberId}`,
                expiresAt,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              });
          } catch (notifError) {
            request.log.error(
              { notifError },
              "Failed to create invite notification",
            );
          }

          // Send email with accept/decline links
          const frontendUrl =
            process.env.FRONTEND_URL || "http://localhost:5555";
          const acceptUrl = `${frontendUrl}/invites/accept?memberId=${memberId}`;
          const declineUrl = `${frontendUrl}/invites/decline?memberId=${memberId}`;

          try {
            await sendMemberInviteEmail({
              email: inviteData.email,
              organizationName: org.name,
              inviterName:
                `${inviterUserData?.firstName || ""} ${inviterUserData?.lastName || ""}`.trim(),
              roles: inviteData.roles,
              acceptUrl,
              declineUrl,
            });
          } catch (emailError) {
            request.log.error({ emailError }, "Failed to send invite email");
            // Continue - membership created, email failure is not critical
          }

          return reply.status(201).send({
            type: "existing_user",
            memberId,
            ...memberData,
          });
        } else {
          // NON-EXISTING USER FLOW
          const { token, inviteId, contactId } = await createOrganizationInvite(
            organizationId,
            user.uid,
            inviteData,
          );

          // Get the created invite for email
          const inviteDoc = await db.collection("invites").doc(inviteId).get();
          const invite = inviteDoc.data();

          // Send signup email
          const frontendUrl =
            process.env.FRONTEND_URL || "http://localhost:5555";
          const signupUrl = `${frontendUrl}/signup?invite=${token}`;

          try {
            await sendSignupInviteEmail(invite as any, signupUrl);
          } catch (emailError) {
            request.log.error(
              { emailError },
              "Failed to send signup invite email",
            );
            // Continue - invite created, email failure is not critical
          }

          return reply.status(201).send({
            type: "new_user",
            inviteId,
            contactId,
            email: inviteData.email,
            status: "pending",
            message: "Invite sent to new user",
          });
        }
      } catch (error) {
        request.log.error({ error }, "Failed to invite member");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to invite member",
        });
      }
    },
  );

  // Get single organization member
  fastify.get(
    "/:id/members/:userId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id, userId } = request.params as { id: string; userId: string };
        const user = (request as AuthenticatedRequest).user!;

        // Verify organization exists and user has access
        const orgDoc = await db.collection("organizations").doc(id).get();
        if (!orgDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Organization not found",
          });
        }

        const org = orgDoc.data()!;
        const memberId = `${user.uid}_${id}`;
        const userMemberDoc = await db
          .collection("organizationMembers")
          .doc(memberId)
          .get();
        const isUserMember =
          userMemberDoc.exists && userMemberDoc.data()?.status === "active";

        if (
          org.ownerId !== user.uid &&
          !isUserMember &&
          user.role !== "system_admin"
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to view members",
          });
        }

        const targetMemberId = `${userId}_${id}`;
        const memberDoc = await db
          .collection("organizationMembers")
          .doc(targetMemberId)
          .get();

        if (!memberDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Member not found",
          });
        }

        return {
          id: memberDoc.id,
          ...memberDoc.data(),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch organization member");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch organization member",
        });
      }
    },
  );

  // Update member roles
  fastify.patch(
    "/:id/members/:userId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id, userId } = request.params as { id: string; userId: string };
        const validation = updateMemberRolesSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const user = (request as AuthenticatedRequest).user!;
        const orgDoc = await db.collection("organizations").doc(id).get();

        if (!orgDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Organization not found",
          });
        }

        const org = orgDoc.data()!;

        // Check permissions: owner, administrator, or system_admin
        const userMemberId = `${user.uid}_${id}`;
        const userMemberDoc = await db
          .collection("organizationMembers")
          .doc(userMemberId)
          .get();
        const userMemberData = userMemberDoc.data();
        const isAdministrator =
          userMemberData?.status === "active" &&
          userMemberData?.roles?.includes("administrator");

        if (
          org.ownerId !== user.uid &&
          !isAdministrator &&
          user.role !== "system_admin"
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to update member roles",
          });
        }

        const memberId = `${userId}_${id}`;
        const memberDoc = await db
          .collection("organizationMembers")
          .doc(memberId)
          .get();

        if (!memberDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Member not found",
          });
        }

        // Enforce support_contact delegate limit when adding the role
        const existingRoles: string[] = memberDoc.data()?.roles ?? [];
        const newRoles: string[] = validation.data.roles;
        const addingSupportContact =
          newRoles.includes("support_contact") &&
          !existingRoles.includes("support_contact");

        if (addingSupportContact) {
          const limitError = await validateSupportContactLimit(
            id,
            org.ownerId,
            org.subscriptionTier,
            memberId,
          );
          if (limitError) {
            return reply.status(403).send({
              error: "Forbidden",
              message: limitError,
              code: "SUPPORT_CONTACT_LIMIT",
            });
          }
        }

        await db
          .collection("organizationMembers")
          .doc(memberId)
          .update(validation.data);
        const updatedMember = await db
          .collection("organizationMembers")
          .doc(memberId)
          .get();

        return {
          id: updatedMember.id,
          ...updatedMember.data(),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to update member roles");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update member roles",
        });
      }
    },
  );

  // Check if member owns horses in organization (used before removal)
  fastify.get(
    "/:id/members/:userId/horses",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id, userId: targetUserId } = request.params as {
          id: string;
          userId: string;
        };
        const user = (request as AuthenticatedRequest).user!;

        const orgDoc = await db.collection("organizations").doc(id).get();
        if (!orgDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Organization not found",
          });
        }

        // Check permissions: owner, administrator, system_admin, or self-check
        const userMemberId = `${user.uid}_${id}`;
        const userMemberDoc = await db
          .collection("organizationMembers")
          .doc(userMemberId)
          .get();
        const userMemberData = userMemberDoc.data();
        const isAdministrator =
          userMemberData?.status === "active" &&
          userMemberData?.roles?.includes("administrator");
        const isSelf = targetUserId === user.uid;
        const org = orgDoc.data()!;

        if (
          org.ownerId !== user.uid &&
          !isAdministrator &&
          !isSelf &&
          user.role !== "system_admin"
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to check this member's horses",
          });
        }

        // Get all stables in this organization
        const stablesSnapshot = await db
          .collection("stables")
          .where("organizationId", "==", id)
          .get();
        const orgStableIds = stablesSnapshot.docs.map((doc) => doc.id);

        if (orgStableIds.length === 0) {
          return { horses: [], hasHorses: false };
        }

        // Find horses owned by this user that are in any of these stables
        // Need to query in batches since Firestore 'in' supports max 30 values
        const ownedHorses: Array<{
          id: string;
          name: string;
          stableId?: string;
          stableName?: string;
        }> = [];

        for (let i = 0; i < orgStableIds.length; i += 30) {
          const batchStableIds = orgStableIds.slice(i, i + 30);
          const horsesSnapshot = await db
            .collection("horses")
            .where("ownerId", "==", targetUserId)
            .where("currentStableId", "in", batchStableIds)
            .get();

          horsesSnapshot.docs.forEach((doc) => {
            const data = doc.data();
            ownedHorses.push({
              id: doc.id,
              name: data.name,
              stableId: data.currentStableId,
              stableName: data.currentStableName,
            });
          });
        }

        return {
          horses: ownedHorses,
          hasHorses: ownedHorses.length > 0,
          organizationId: id,
          userId: targetUserId,
        };
      } catch (error) {
        request.log.error({ error }, "Failed to check member horses");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to check member horses",
        });
      }
    },
  );

  // Remove member from organization
  fastify.delete(
    "/:id/members/:userId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id, userId } = request.params as { id: string; userId: string };
        const { forceRemove } = request.query as {
          forceRemove?: string;
        };
        const user = (request as AuthenticatedRequest).user!;

        const orgDoc = await db.collection("organizations").doc(id).get();

        if (!orgDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Organization not found",
          });
        }

        const org = orgDoc.data()!;

        // Check permissions: owner, administrator, system_admin, or self-remove
        const userMemberId = `${user.uid}_${id}`;
        const userMemberDoc = await db
          .collection("organizationMembers")
          .doc(userMemberId)
          .get();
        const userMemberData = userMemberDoc.data();
        const isAdministrator =
          userMemberData?.status === "active" &&
          userMemberData?.roles?.includes("administrator");
        const isSelfRemove = userId === user.uid;

        if (
          org.ownerId !== user.uid &&
          !isAdministrator &&
          !isSelfRemove &&
          user.role !== "system_admin"
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to remove this member",
          });
        }

        const memberId = `${userId}_${id}`;
        const memberDoc = await db
          .collection("organizationMembers")
          .doc(memberId)
          .get();

        if (!memberDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Member not found",
          });
        }

        // forceRemove requires admin/owner permission - users cannot force-remove themselves
        const isOrgOwner = org.ownerId === user.uid;
        const canForceRemove =
          isOrgOwner || isAdministrator || user.role === "system_admin";

        if (forceRemove === "true" && !canForceRemove) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "Only organization owners and administrators can use forceRemove",
          });
        }

        // Check if member owns horses in this org's stables (unless forceRemove is set)
        if (forceRemove !== "true") {
          const stablesSnapshot = await db
            .collection("stables")
            .where("organizationId", "==", id)
            .get();
          const orgStableIds = stablesSnapshot.docs.map((doc) => doc.id);

          if (orgStableIds.length > 0) {
            // Query horses in batches
            const ownedHorses: Array<{ id: string; name: string }> = [];
            for (let i = 0; i < orgStableIds.length; i += 30) {
              const batchStableIds = orgStableIds.slice(i, i + 30);
              const horsesSnapshot = await db
                .collection("horses")
                .where("ownerId", "==", userId)
                .where("currentStableId", "in", batchStableIds)
                .get();

              horsesSnapshot.docs.forEach((doc) => {
                const data = doc.data();
                ownedHorses.push({ id: doc.id, name: data.name });
              });
            }

            if (ownedHorses.length > 0) {
              return reply.status(400).send({
                error: "ActionRequired",
                code: "HORSES_OWNED",
                message: `Member owns ${ownedHorses.length} horse(s) in this organization. Please handle horse ownership before removal.`,
                horses: ownedHorses,
                actions: ["transfer_to_stable", "leave_with_member"],
              });
            }
          }
        }

        // Log if forceRemove was used (audit trail)
        if (forceRemove === "true") {
          request.log.info(
            {
              action: "member_force_removed",
              organizationId: id,
              removedUserId: userId,
              removedBy: user.uid,
              isOrgOwner,
              isAdministrator,
              isSystemAdmin: user.role === "system_admin",
            },
            "Member force-removed without horse check",
          );
        }

        await db.collection("organizationMembers").doc(memberId).delete();

        // Update organization stats
        const memberCount = (
          await db
            .collection("organizationMembers")
            .where("organizationId", "==", id)
            .where("status", "==", "active")
            .get()
        ).size;

        await db.collection("organizations").doc(id).update({
          "stats.totalMemberCount": memberCount,
          updatedAt: FieldValue.serverTimestamp(),
        });

        return reply.status(204).send();
      } catch (error) {
        request.log.error({ error }, "Failed to remove member");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to remove member",
        });
      }
    },
  );

  // Update member status
  fastify.patch(
    "/:id/members/:userId/status",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id, userId } = request.params as { id: string; userId: string };
        const { status } = request.body as {
          status: "active" | "inactive" | "pending";
        };
        const user = (request as AuthenticatedRequest).user!;

        if (!["active", "inactive", "pending"].includes(status)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid status value",
          });
        }

        const orgDoc = await db.collection("organizations").doc(id).get();

        if (!orgDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Organization not found",
          });
        }

        const org = orgDoc.data()!;

        // Check permissions: owner, administrator, or system_admin
        const userMemberId = `${user.uid}_${id}`;
        const userMemberDoc = await db
          .collection("organizationMembers")
          .doc(userMemberId)
          .get();
        const userMemberData = userMemberDoc.data();
        const isAdministrator =
          userMemberData?.status === "active" &&
          userMemberData?.roles?.includes("administrator");

        if (
          org.ownerId !== user.uid &&
          !isAdministrator &&
          user.role !== "system_admin"
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to update member status",
          });
        }

        const memberId = `${userId}_${id}`;
        const memberDoc = await db
          .collection("organizationMembers")
          .doc(memberId)
          .get();

        if (!memberDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Member not found",
          });
        }

        const updates: Record<string, any> = { status };

        // If activating, add inviteAcceptedAt timestamp
        if (status === "active") {
          updates.inviteAcceptedAt = FieldValue.serverTimestamp();
        }

        await db
          .collection("organizationMembers")
          .doc(memberId)
          .update(updates);
        const updatedMember = await db
          .collection("organizationMembers")
          .doc(memberId)
          .get();

        return {
          id: updatedMember.id,
          ...updatedMember.data(),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to update member status");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update member status",
        });
      }
    },
  );

  // Get all organizations where user is a member
  fastify.get(
    "/users/:userId/organizations",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { userId } = request.params as { userId: string };
        const user = (request as AuthenticatedRequest).user!;

        // Security: Only allow querying own organizations unless system_admin
        if (userId !== user.uid && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You can only query your own organizations",
          });
        }

        const membersSnapshot = await db
          .collection("organizationMembers")
          .where("userId", "==", userId)
          .where("status", "==", "active")
          .get();

        const organizationIds = membersSnapshot.docs.map(
          (doc) => doc.data().organizationId,
        );

        return { organizationIds };
      } catch (error) {
        request.log.error({ error }, "Failed to get user organizations");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to get user organizations",
        });
      }
    },
  );

  // Get all stables for an organization
  fastify.get(
    "/:id/stables",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        // Check organization membership
        const memberDoc = await db
          .collection("organizationMembers")
          .doc(`${user.uid}_${id}`)
          .get();

        if (!memberDoc.exists && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this organization",
          });
        }

        // Get stables for this organization
        const stablesSnapshot = await db
          .collection("stables")
          .where("organizationId", "==", id)
          .orderBy("createdAt", "desc")
          .get();

        const stables = stablesSnapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { stables };
      } catch (error) {
        request.log.error({ error }, "Failed to get organization stables");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to get organization stables",
        });
      }
    },
  );

  // ========================================================================
  // INVITE MANAGEMENT ROUTES
  // ========================================================================

  // GET /api/v1/organizations/:id/invites - List pending invites
  fastify.get(
    "/:id/invites",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        // Verify organization exists and user has admin access
        const orgDoc = await db.collection("organizations").doc(id).get();
        if (!orgDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Organization not found",
          });
        }

        const org = orgDoc.data()!;

        // Check permissions: owner, administrator, or system_admin
        const userMemberId = `${user.uid}_${id}`;
        const userMemberDoc = await db
          .collection("organizationMembers")
          .doc(userMemberId)
          .get();
        const userMemberData = userMemberDoc.data();
        const isAdministrator =
          userMemberData?.status === "active" &&
          userMemberData?.roles?.includes("administrator");

        if (
          org.ownerId !== user.uid &&
          !isAdministrator &&
          user.role !== "system_admin"
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to view invites",
          });
        }

        const invites = await getOrganizationInvites(id);

        return { invites };
      } catch (error) {
        request.log.error({ error }, "Failed to get organization invites");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to get organization invites",
        });
      }
    },
  );

  // POST /api/v1/organizations/:id/invites/force-activate - Force activate pending invites
  // NOTE: Must be registered BEFORE parameterized /:inviteId routes to avoid Fastify matching "force-activate" as :inviteId
  const forceActivateSchema = z.object({
    inviteIds: z.array(z.string()).min(1),
  });

  fastify.post(
    "/:id/invites/force-activate",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id: organizationId } = request.params as { id: string };
        const validation = forceActivateSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const user = (request as AuthenticatedRequest).user!;
        const { inviteIds } = validation.data;

        // Verify organization exists
        const orgDoc = await db
          .collection("organizations")
          .doc(organizationId)
          .get();
        if (!orgDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Organization not found",
          });
        }

        const org = orgDoc.data()!;

        // Check permissions: owner, administrator, or system_admin
        const userMemberId = `${user.uid}_${organizationId}`;
        const userMemberDoc = await db
          .collection("organizationMembers")
          .doc(userMemberId)
          .get();
        const userMemberData = userMemberDoc.data();
        const isAdministrator =
          userMemberData?.status === "active" &&
          userMemberData?.roles?.includes("administrator");

        if (
          org.ownerId !== user.uid &&
          !isAdministrator &&
          user.role !== "system_admin"
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to force-activate invites",
          });
        }

        const results: Array<{
          inviteId: string;
          status: "activated" | "error";
          userId?: string;
          error?: string;
        }> = [];

        for (const inviteId of inviteIds) {
          try {
            // 1. Validate invite exists, belongs to org, status is pending
            const inviteDoc = await db
              .collection("invites")
              .doc(inviteId)
              .get();
            if (!inviteDoc.exists) {
              results.push({
                inviteId,
                status: "error",
                error: "Invite not found",
              });
              continue;
            }

            const invite = inviteDoc.data()!;
            if (invite.organizationId !== organizationId) {
              results.push({
                inviteId,
                status: "error",
                error: "Invite does not belong to this organization",
              });
              continue;
            }

            if (invite.status !== "pending") {
              results.push({
                inviteId,
                status: "error",
                error: `Invite is not pending (status: ${invite.status})`,
              });
              continue;
            }

            // 2. Create Firebase Auth user (no password — user uses "Forgot password" later)
            const displayName =
              [invite.firstName, invite.lastName].filter(Boolean).join(" ") ||
              undefined;
            const firebaseUser = await auth.createUser({
              email: invite.email,
              displayName,
            });
            const uid = firebaseUser.uid;

            // 3. Create Firestore users/{uid} document
            const userData = {
              email: invite.email.toLowerCase(),
              firstName: invite.firstName || "",
              lastName: invite.lastName || "",
              phoneNumber: invite.phoneNumber || null,
              systemRole: "stable_user",
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            };
            await db.collection("users").doc(uid).set(userData);

            // 4. Create personal organization + implicit stable + owner membership (batch)
            const personalOrgRef = db.collection("organizations").doc();
            const personalOrgId = personalOrgRef.id;
            const implicitStableRef = db.collection("stables").doc();
            const implicitStableId = implicitStableRef.id;
            const personalMemberId = `${uid}_${personalOrgId}`;

            const personalBatch = db.batch();
            personalBatch.set(implicitStableRef, {
              id: implicitStableId,
              name: "My Horses",
              description: "Auto-created stable for personal use",
              ownerId: uid,
              ownerEmail: invite.email.toLowerCase(),
              organizationId: personalOrgId,
              isImplicit: true,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            });
            personalBatch.set(personalOrgRef, {
              name: `${invite.firstName || invite.email.split("@")[0]}'s Organization`,
              ownerId: uid,
              ownerEmail: invite.email.toLowerCase(),
              organizationType: "personal",
              subscriptionTier: "free",
              implicitStableId,
              stats: { stableCount: 1, totalMemberCount: 1 },
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            });
            personalBatch.set(
              db.collection("organizationMembers").doc(personalMemberId),
              {
                id: personalMemberId,
                organizationId: personalOrgId,
                userId: uid,
                userEmail: invite.email.toLowerCase(),
                firstName: invite.firstName || "",
                lastName: invite.lastName || "",
                phoneNumber: invite.phoneNumber || null,
                roles: ["administrator"],
                primaryRole: "administrator",
                status: "active",
                showInPlanning: true,
                stableAccess: "all",
                assignedStableIds: [],
                joinedAt: Timestamp.now(),
                invitedBy: "system",
                inviteAcceptedAt: Timestamp.now(),
              },
            );
            await personalBatch.commit();

            // 5. Mark invite as accepted
            await db.collection("invites").doc(inviteId).update({
              status: "accepted",
              respondedAt: Timestamp.now(),
              acceptedByForceActivation: true,
            });

            // 6. Create organizationMember for the inviting org
            const orgMemberId = `${uid}_${organizationId}`;
            await db
              .collection("organizationMembers")
              .doc(orgMemberId)
              .set({
                id: orgMemberId,
                organizationId,
                userId: uid,
                userEmail: invite.email.toLowerCase(),
                firstName: invite.firstName || "",
                lastName: invite.lastName || "",
                phoneNumber: invite.phoneNumber || null,
                roles: invite.roles || [],
                primaryRole:
                  invite.primaryRole || invite.roles?.[0] || "customer",
                status: "active",
                showInPlanning:
                  invite.showInPlanning !== undefined
                    ? invite.showInPlanning
                    : true,
                stableAccess: invite.stableAccess || "all",
                assignedStableIds: invite.assignedStableIds || [],
                joinedAt: Timestamp.now(),
                invitedBy: invite.invitedBy || user.uid,
                inviteAcceptedAt: Timestamp.now(),
              });

            // 7. Update linked contact document if exists
            if (invite.contactId) {
              try {
                await db.collection("contacts").doc(invite.contactId).update({
                  linkedUserId: uid,
                  linkedMemberId: orgMemberId,
                  updatedAt: Timestamp.now(),
                });
              } catch (contactError) {
                request.log.warn(
                  { contactError, contactId: invite.contactId },
                  "Failed to update linked contact",
                );
              }
            }

            // 8. Set default organization preference
            try {
              await db
                .collection("users")
                .doc(uid)
                .collection("settings")
                .doc("preferences")
                .set(
                  { defaultOrganizationId: organizationId },
                  { merge: true },
                );
            } catch (prefError) {
              request.log.warn(
                { prefError },
                "Failed to set default organization preference",
              );
            }

            results.push({
              inviteId,
              status: "activated",
              userId: uid,
            });

            request.log.info(
              { inviteId, userId: uid, organizationId },
              "Force-activated invite",
            );
          } catch (inviteError: any) {
            request.log.error(
              { inviteError, inviteId },
              "Failed to force-activate invite",
            );
            results.push({
              inviteId,
              status: "error",
              error: inviteError.message || "Unknown error",
            });
          }
        }

        // Update org stats with new member count
        try {
          const activatedCount = results.filter(
            (r) => r.status === "activated",
          ).length;
          if (activatedCount > 0) {
            const memberCount = (
              await db
                .collection("organizationMembers")
                .where("organizationId", "==", organizationId)
                .where("status", "==", "active")
                .get()
            ).size;

            await db.collection("organizations").doc(organizationId).update({
              "stats.totalMemberCount": memberCount,
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
        } catch (statsError) {
          request.log.warn(
            { statsError },
            "Failed to update organization stats after force-activate",
          );
        }

        return { results };
      } catch (error) {
        request.log.error({ error }, "Failed to force-activate invites");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to force-activate invites",
        });
      }
    },
  );

  // POST /api/v1/organizations/:id/invites/:inviteId/resend - Resend invite email
  fastify.post(
    "/:id/invites/:inviteId/resend",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id, inviteId } = request.params as {
          id: string;
          inviteId: string;
        };
        const user = (request as AuthenticatedRequest).user!;

        // Verify organization exists and user has admin access
        const orgDoc = await db.collection("organizations").doc(id).get();
        if (!orgDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Organization not found",
          });
        }

        const org = orgDoc.data()!;

        // Check permissions: owner, administrator, or system_admin
        const userMemberId = `${user.uid}_${id}`;
        const userMemberDoc = await db
          .collection("organizationMembers")
          .doc(userMemberId)
          .get();
        const userMemberData = userMemberDoc.data();
        const isAdministrator =
          userMemberData?.status === "active" &&
          userMemberData?.roles?.includes("administrator");

        if (
          org.ownerId !== user.uid &&
          !isAdministrator &&
          user.role !== "system_admin"
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to resend invites",
          });
        }

        // Verify invite belongs to this organization
        const inviteDoc = await db.collection("invites").doc(inviteId).get();
        if (!inviteDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Invite not found",
          });
        }

        const invite = inviteDoc.data()!;
        if (invite.organizationId !== id) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Invite does not belong to this organization",
          });
        }

        // Resend the invite
        const { token, expiresAt } = await resendInvite(inviteId);

        // Send the email again
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5555";
        const signupUrl = `${frontendUrl}/signup?invite=${token}`;

        try {
          await sendSignupInviteEmail(invite as any, signupUrl);
        } catch (emailError) {
          request.log.error({ emailError }, "Failed to send resend email");
        }

        return {
          message: "Invite resent successfully",
          inviteId,
          expiresAt,
        };
      } catch (error) {
        request.log.error({ error }, "Failed to resend invite");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to resend invite",
        });
      }
    },
  );

  // DELETE /api/v1/organizations/:id/invites/:inviteId - Cancel invite
  fastify.delete(
    "/:id/invites/:inviteId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id, inviteId } = request.params as {
          id: string;
          inviteId: string;
        };
        const user = (request as AuthenticatedRequest).user!;

        // Verify organization exists and user has admin access
        const orgDoc = await db.collection("organizations").doc(id).get();
        if (!orgDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Organization not found",
          });
        }

        const org = orgDoc.data()!;

        // Check permissions: owner, administrator, or system_admin
        const userMemberId = `${user.uid}_${id}`;
        const userMemberDoc = await db
          .collection("organizationMembers")
          .doc(userMemberId)
          .get();
        const userMemberData = userMemberDoc.data();
        const isAdministrator =
          userMemberData?.status === "active" &&
          userMemberData?.roles?.includes("administrator");

        if (
          org.ownerId !== user.uid &&
          !isAdministrator &&
          user.role !== "system_admin"
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to cancel invites",
          });
        }

        // Verify invite belongs to this organization
        const inviteDoc = await db.collection("invites").doc(inviteId).get();
        if (!inviteDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Invite not found",
          });
        }

        const invite = inviteDoc.data()!;
        if (invite.organizationId !== id) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Invite does not belong to this organization",
          });
        }

        // Cancel the invite
        await cancelInvite(inviteId);

        return reply.status(204).send();
      } catch (error) {
        request.log.error({ error }, "Failed to cancel invite");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to cancel invite",
        });
      }
    },
  );
}
