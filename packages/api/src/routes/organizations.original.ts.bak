import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { createOrganizationInvite } from "../services/inviteService.js";
import {
  sendMemberInviteEmail,
  sendSignupInviteEmail,
} from "../services/emailService.js";

// Zod schemas for validation
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

const updateOrganizationSchema = createOrganizationSchema.partial();

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

        const organizationData = {
          ...validation.data,
          ownerId: user.uid,
          ownerEmail: userData?.email || user.email,
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

        const updateData = {
          ...validation.data,
          updatedAt: FieldValue.serverTimestamp(),
        };

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

  // ========================================================================
  // MEMBER MANAGEMENT ROUTES
  // ========================================================================

  // Get organization members
  fastify.get(
    "/:id/members",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
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

        const snapshot = await db
          .collection("organizationMembers")
          .where("organizationId", "==", id)
          .get();

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
          const { token, inviteId } = await createOrganizationInvite(
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
}
