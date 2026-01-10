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

        // Update membership to active
        await db.collection("organizationMembers").doc(memberId).update({
          status: "active",
          inviteAcceptedAt: Timestamp.now(),
        });

        // Update organization stats
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

        // Delete the membership document
        await db.collection("organizationMembers").doc(memberId).delete();

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
