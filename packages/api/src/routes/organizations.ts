import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate, requireRole } from "../middleware/auth.js";
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
import {
  canInviteMembers,
  DEFAULT_HOLIDAY_SETTINGS,
} from "@stall-bokning/shared";

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
  "veterinarian",
  "dentist",
  "farrier",
  "customer",
  "groom",
  "saddle_maker",
  "horse_owner",
  "rider",
  "inseminator",
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
      preHandler: [authenticate],
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
            joinedAt: Timestamp.now(),
            invitedBy: user.uid,
          };

          await db
            .collection("organizationMembers")
            .doc(memberId)
            .set(memberData);

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

  // Remove member from organization
  fastify.delete(
    "/:id/members/:userId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id, userId } = request.params as { id: string; userId: string };
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
