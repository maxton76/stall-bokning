import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";

/**
 * Update organization member count statistics
 */
async function updateOrganizationStats(organizationId: string): Promise<void> {
  const membersSnapshot = await db
    .collection("organizationMembers")
    .where("organizationId", "==", organizationId)
    .where("status", "==", "active")
    .get();

  const totalMemberCount = membersSnapshot.size;

  await db.collection("organizations").doc(organizationId).update({
    "stats.totalMemberCount": totalMemberCount,
  });
}

export default async function organizationMemberRoutes(
  fastify: FastifyInstance,
) {
  // GET /api/v1/organization-members - Get authenticated user's active memberships
  fastify.get(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;

        const membersSnapshot = await db
          .collection("organizationMembers")
          .where("userId", "==", user.uid)
          .where("status", "==", "active")
          .get();

        const members = membersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        return reply.send({ members });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch organization members");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch organization members",
        });
      }
    },
  );

  // POST /api/v1/organization-members/:memberId/accept - Accept membership invite
  fastify.post(
    "/:memberId/accept",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { memberId } = request.params as { memberId: string };
        const user = (request as AuthenticatedRequest).user!;

        // Parse memberId to get userId and organizationId
        const parts = memberId.split("_");

        if (parts.length !== 2) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid membership ID format",
          });
        }

        const [userId, organizationId] = parts;

        // Verify this is the invited user (security check)
        if (userId !== user.uid) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You can only accept invites sent to you",
          });
        }

        // Get the membership document
        const memberDoc = await db
          .collection("organizationMembers")
          .doc(memberId)
          .get();

        if (!memberDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Membership invitation not found",
          });
        }

        const member = memberDoc.data();

        // Validate membership data matches the memberId
        if (
          member?.userId !== userId ||
          member?.organizationId !== organizationId
        ) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Membership data does not match membership ID",
          });
        }

        // Check if membership is pending
        if (member?.status !== "pending") {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Membership is not pending",
          });
        }

        // Check if membership has expired
        if (member?.expiresAt) {
          const expiresAtDate = member.expiresAt.toDate
            ? member.expiresAt.toDate()
            : new Date(member.expiresAt._seconds * 1000);
          if (expiresAtDate < new Date()) {
            return reply.status(400).send({
              error: "Bad Request",
              message: "Membership invitation has expired",
            });
          }
        }

        // Use batch write for atomic operations
        const batch = db.batch();
        const now = Timestamp.now();

        // Update membership to active
        batch.update(db.collection("organizationMembers").doc(memberId), {
          status: "active",
          inviteAcceptedAt: now,
        });

        // Mark the invite notification as read
        const notifId = `membership_invite_${memberId}`;
        const notifDoc = await db
          .collection("notifications")
          .doc(notifId)
          .get();
        if (notifDoc.exists) {
          batch.update(db.collection("notifications").doc(notifId), {
            read: true,
            readAt: now,
          });
        }

        await batch.commit();

        // Update organization stats (non-critical, outside batch)
        await updateOrganizationStats(organizationId);

        return reply.send({
          message: "Membership accepted successfully",
          organizationId,
        });
      } catch (error) {
        request.log.error({ error }, "Failed to accept membership");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to accept membership",
        });
      }
    },
  );

  // POST /api/v1/organization-members/:memberId/decline - Decline membership invite
  fastify.post(
    "/:memberId/decline",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { memberId } = request.params as { memberId: string };
        const user = (request as AuthenticatedRequest).user!;

        // Parse memberId to get userId and organizationId
        const parts = memberId.split("_");

        if (parts.length !== 2) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid membership ID format",
          });
        }

        const [userId, organizationId] = parts;

        // Verify this is the invited user (security check)
        if (userId !== user.uid) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You can only decline invites sent to you",
          });
        }

        // Get the membership document
        const memberDoc = await db
          .collection("organizationMembers")
          .doc(memberId)
          .get();

        if (!memberDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Membership invitation not found",
          });
        }

        const member = memberDoc.data();

        // Validate membership data matches the memberId
        if (
          member?.userId !== userId ||
          member?.organizationId !== organizationId
        ) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Membership data does not match membership ID",
          });
        }

        // Check if membership is pending
        if (member?.status !== "pending") {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Membership is not pending",
          });
        }

        // Use batch write for atomic operations
        const batch = db.batch();
        const now = Timestamp.now();

        // Mark membership as expired (declined)
        batch.update(db.collection("organizationMembers").doc(memberId), {
          status: "expired",
          expiredAt: now,
          expiredReason: "declined",
        });

        // Mark the invite notification as read
        const notifId = `membership_invite_${memberId}`;
        const notifDoc = await db
          .collection("notifications")
          .doc(notifId)
          .get();
        if (notifDoc.exists) {
          batch.update(db.collection("notifications").doc(notifId), {
            read: true,
            readAt: now,
          });
        }

        // Notify the inviter about the decline
        if (member?.invitedBy) {
          // Get organization name for notification
          const orgDoc = await db
            .collection("organizations")
            .doc(organizationId)
            .get();
          const orgName = orgDoc.data()?.name || "Unknown";

          const responseNotifId = `membership_response_${memberId}_declined`;
          batch.set(db.collection("notifications").doc(responseNotifId), {
            id: responseNotifId,
            userId: member.invitedBy,
            organizationId,
            type: "membership_invite_response",
            priority: "normal",
            title: "Invite Declined",
            titleKey: "notifications.membershipInviteResponse.title",
            body: `${member.userEmail} declined the invitation to ${orgName}`,
            bodyKey: "notifications.membershipInviteResponse.body",
            bodyParams: {
              userEmail: member.userEmail,
              organizationName: orgName,
              reason: "declined",
            },
            entityType: "organizationMember",
            entityId: memberId,
            channels: ["inApp"],
            deliveryStatus: { inApp: "sent" },
            deliveryAttempts: 1,
            read: false,
            createdAt: now,
            updatedAt: now,
          });
        }

        await batch.commit();

        return reply.send({
          message: "Invitation declined successfully",
        });
      } catch (error) {
        request.log.error({ error }, "Failed to decline membership");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to decline membership",
        });
      }
    },
  );
}
