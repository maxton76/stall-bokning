import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../utils/firebase.js";
import {
  authenticate,
  requireRole,
  requireStableAccess,
  requireStableOwnership,
} from "../middleware/auth.js";
import type { AuthenticatedRequest, Stable } from "../types/index.js";

const createStableSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  address: z.string().optional(),
  organizationId: z.string().optional(),
  ownerEmail: z.string().email().optional(),
  // Optional marketplace fields
  capacity: z.number().int().positive().optional(),
  availableStalls: z.number().int().min(0).optional(),
  pricePerMonth: z.number().positive().optional(),
  amenities: z.array(z.string()).default([]),
});

const updateStableSchema = createStableSchema.partial();

export async function stablesRoutes(fastify: FastifyInstance) {
  // Get all stables (requires authentication)
  // Returns only stables where user is a member or owner
  fastify.get(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { ownedOnly, ownerId } = request.query as {
          ownedOnly?: string;
          ownerId?: string;
        };

        // If ownerId is specified (admin or self), filter by that owner
        const targetOwnerId = ownerId || (ownedOnly === "true" ? user.uid : null);

        // System admins can see all stables (or filter by ownerId)
        if (user.role === "system_admin") {
          let query = db.collection("stables");
          if (targetOwnerId) {
            query = query.where("ownerId", "==", targetOwnerId) as any;
          }
          const snapshot = await query.get();
          const stables = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          return { stables };
        }

        // If requesting owned stables only
        if (ownedOnly === "true") {
          const snapshot = await db
            .collection("stables")
            .where("ownerId", "==", user.uid)
            .get();
          const stables = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          return { stables };
        }

        // Regular users: get stables where they are owner or member
        const [ownedStables, memberStables] = await Promise.all([
          // Stables owned by user
          db.collection("stables").where("ownerId", "==", user.uid).get(),
          // Stables where user is a member
          db
            .collection("stableMembers")
            .where("userId", "==", user.uid)
            .where("status", "==", "active")
            .get(),
        ]);

        const ownedStablesList = ownedStables.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Get stable details for memberships
        const memberStableIds = memberStables.docs.map(
          (doc) => doc.data().stableId,
        );
        const memberStablesList = [];

        for (const stableId of memberStableIds) {
          const stableDoc = await db.collection("stables").doc(stableId).get();
          if (stableDoc.exists) {
            memberStablesList.push({
              id: stableDoc.id,
              ...stableDoc.data(),
            });
          }
        }

        // Combine and deduplicate
        const allStables = [...ownedStablesList, ...memberStablesList];
        const uniqueStables = Array.from(
          new Map(allStables.map((stable) => [stable.id, stable])).values(),
        );

        return { stables: uniqueStables };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch stables");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch stables",
        });
      }
    },
  );

  // Get single stable (requires authentication and membership)
  fastify.get(
    "/:id",
    {
      preHandler: [authenticate, requireStableAccess()],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const doc = await db.collection("stables").doc(id).get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Stable not found",
          });
        }

        return {
          id: doc.id,
          ...doc.data(),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch stable");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch stable",
        });
      }
    },
  );

  // Create stable (requires authentication and stable_owner or system_admin role)
  fastify.post(
    "/",
    {
      preHandler: [authenticate, requireRole(["stable_owner", "system_admin"])],
    },
    async (request, reply) => {
      try {
        const validation = createStableSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const user = (request as AuthenticatedRequest).user!;
        const stableData: Stable = {
          ...validation.data,
          ownerId: user.uid,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const docRef = await db.collection("stables").add(stableData);
        const doc = await docRef.get();

        return reply.status(201).send({
          id: doc.id,
          ...doc.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to create stable");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create stable",
        });
      }
    },
  );

  // Update stable (requires authentication and ownership or admin)
  fastify.patch(
    "/:id",
    {
      preHandler: [authenticate, requireStableOwnership()],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const validation = updateStableSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const docRef = db.collection("stables").doc(id);

        // Middleware already verified ownership, no need to check again
        const updateData = {
          ...validation.data,
          updatedAt: new Date(),
        };

        await docRef.update(updateData);
        const updatedDoc = await docRef.get();

        return {
          id: updatedDoc.id,
          ...updatedDoc.data(),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to update stable");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update stable",
        });
      }
    },
  );

  // Delete stable (requires authentication and ownership or admin)
  fastify.delete(
    "/:id",
    {
      preHandler: [authenticate, requireStableOwnership()],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const docRef = db.collection("stables").doc(id);

        // Middleware already verified ownership and existence, no need to check again
        await docRef.delete();

        return reply.status(204).send();
      } catch (error) {
        request.log.error({ error }, "Failed to delete stable");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete stable",
        });
      }
    },
  );

  // Get members for a stable with optional user details
  fastify.get(
    "/:id/members",
    {
      preHandler: [authenticate, requireStableAccess()],
    },
    async (request, reply) => {
      try {
        const { id: stableId } = request.params as { id: string };
        const { includeUserDetails } = request.query as {
          includeUserDetails?: string;
        };

        // Query active members for this stable
        const membersSnapshot = await db
          .collection("stableMembers")
          .where("stableId", "==", stableId)
          .where("status", "==", "active")
          .get();

        if (includeUserDetails === "true") {
          // Batch fetch user details to avoid N+1 queries
          const userIds = membersSnapshot.docs.map((doc) => doc.data().userId);

          if (userIds.length === 0) {
            return { members: [] };
          }

          // Firestore getAll method for batch fetching
          const userRefs = userIds.map((id) => db.collection("users").doc(id));
          const usersSnapshot = await db.getAll(...userRefs);

          // Create a map of userId -> user data
          const userMap = new Map();
          usersSnapshot.forEach((doc) => {
            if (doc.exists) {
              userMap.set(doc.id, doc.data());
            }
          });

          // Combine member + user data
          const members = membersSnapshot.docs.map((doc) => {
            const memberData = doc.data();
            const userData = userMap.get(memberData.userId) || {};

            return {
              id: doc.id,
              ...memberData,
              displayName:
                userData.displayName ||
                `${userData.firstName || ""} ${userData.lastName || ""}`.trim(),
              email: userData.email,
              firstName: userData.firstName,
              lastName: userData.lastName,
            };
          });

          return { members };
        } else {
          // Return members without user details
          const members = membersSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          return { members };
        }
      } catch (error) {
        request.log.error({ error }, "Failed to fetch stable members");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch stable members",
        });
      }
    },
  );

  // Delete a stable member
  fastify.delete(
    "/:stableId/members/:memberId",
    {
      preHandler: [authenticate, requireStableAccess()],
    },
    async (request, reply) => {
      try {
        const { stableId, memberId } = request.params as {
          stableId: string;
          memberId: string;
        };

        // Verify the member exists and belongs to this stable
        const memberDoc = await db
          .collection("stableMembers")
          .doc(memberId)
          .get();

        if (!memberDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Member not found",
          });
        }

        const memberData = memberDoc.data();

        if (memberData?.stableId !== stableId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Member does not belong to this stable",
          });
        }

        // Delete the stable member
        await db.collection("stableMembers").doc(memberId).delete();

        return reply.status(204).send();
      } catch (error) {
        request.log.error({ error }, "Failed to delete stable member");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete stable member",
        });
      }
    },
  );

  // Get invites for a stable
  fastify.get(
    "/:id/invites",
    {
      preHandler: [authenticate, requireStableAccess()],
    },
    async (request, reply) => {
      try {
        const { id: stableId } = request.params as { id: string };

        // Query all invites for this stable
        const invitesSnapshot = await db
          .collection("invites")
          .where("stableId", "==", stableId)
          .get();

        const invites = invitesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        return { invites };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch stable invites");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch stable invites",
        });
      }
    },
  );
}
