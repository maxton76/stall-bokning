import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { serializeTimestamps } from "../utils/serialization.js";

/**
 * Check if user has organization membership with stable access
 */
async function hasOrgStableAccess(
  stableId: string,
  userId: string,
): Promise<boolean> {
  const stableDoc = await db.collection("stables").doc(stableId).get();
  if (!stableDoc.exists) return false;

  const stable = stableDoc.data()!;
  const organizationId = stable.organizationId;

  if (!organizationId) return false;

  // Check organizationMembers collection
  const memberId = `${userId}_${organizationId}`;
  const memberDoc = await db
    .collection("organizationMembers")
    .doc(memberId)
    .get();

  if (!memberDoc.exists) return false;

  const member = memberDoc.data()!;
  if (member.status !== "active") return false;

  // Check stable access permissions
  if (member.stableAccess === "all") return true;
  if (member.stableAccess === "specific") {
    const assignedStables = member.assignedStableIds || [];
    if (assignedStables.includes(stableId)) return true;
  }

  return false;
}

/**
 * Check if user has access to a stable
 */
async function hasStableAccess(
  stableId: string,
  userId: string,
  userRole: string,
): Promise<boolean> {
  if (userRole === "system_admin") return true;

  // Check if user is stable owner
  const stableDoc = await db.collection("stables").doc(stableId).get();
  if (stableDoc.exists && stableDoc.data()?.ownerId === userId) {
    return true;
  }

  // Check organization membership with stable access
  if (await hasOrgStableAccess(stableId, userId)) {
    return true;
  }

  return false;
}

export async function shiftTypesRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/shift-types/stable/:stableId
   * Get all shift types for a stable
   */
  fastify.get(
    "/stable/:stableId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { stableId } = request.params as { stableId: string };

        // Check stable access
        const hasAccess = await hasStableAccess(stableId, user.uid, user.role);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this stable",
          });
        }

        const snapshot = await db
          .collection("shiftTypes")
          .where("stableId", "==", stableId)
          .orderBy("name", "asc")
          .get();

        const shiftTypes = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { shiftTypes };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch shift types");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch shift types",
        });
      }
    },
  );

  /**
   * GET /api/v1/shift-types/:id
   * Get a single shift type by ID
   */
  fastify.get(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { id } = request.params as { id: string };

        const doc = await db.collection("shiftTypes").doc(id).get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Shift type not found",
          });
        }

        const shiftType = doc.data()!;

        // Check stable access
        const hasAccess = await hasStableAccess(
          shiftType.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this shift type",
          });
        }

        return serializeTimestamps({ id: doc.id, ...shiftType });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch shift type");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch shift type",
        });
      }
    },
  );

  /**
   * POST /api/v1/shift-types
   * Create a new shift type
   */
  fastify.post(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as {
          stableId: string;
          name: string;
          description?: string;
          time: string;
          points: number;
          daysOfWeek: string[];
        };

        if (!data.stableId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "stableId is required",
          });
        }

        if (!data.name || !data.time || data.points === undefined) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "name, time, and points are required",
          });
        }

        // Check stable access
        const hasAccess = await hasStableAccess(
          data.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You do not have permission to create shift types for this stable",
          });
        }

        const shiftTypeData = {
          stableId: data.stableId,
          name: data.name,
          description: data.description || undefined,
          time: data.time,
          points: data.points,
          daysOfWeek: data.daysOfWeek || [],
          createdBy: user.uid,
          lastModifiedBy: user.uid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        const docRef = await db.collection("shiftTypes").add(shiftTypeData);

        return reply.status(201).send({
          id: docRef.id,
          ...serializeTimestamps(shiftTypeData),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to create shift type");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create shift type",
        });
      }
    },
  );

  /**
   * PATCH /api/v1/shift-types/:id
   * Update a shift type
   */
  fastify.patch(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { id } = request.params as { id: string };
        const updates = request.body as Partial<{
          name: string;
          description: string;
          time: string;
          points: number;
          daysOfWeek: string[];
        }>;

        const docRef = db.collection("shiftTypes").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Shift type not found",
          });
        }

        const existing = doc.data()!;

        // Check stable access
        const hasAccess = await hasStableAccess(
          existing.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to update this shift type",
          });
        }

        const updateData = {
          ...updates,
          lastModifiedBy: user.uid,
          updatedAt: Timestamp.now(),
        };

        await docRef.update(updateData);

        return serializeTimestamps({ id, ...existing, ...updateData });
      } catch (error) {
        request.log.error({ error }, "Failed to update shift type");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update shift type",
        });
      }
    },
  );

  /**
   * DELETE /api/v1/shift-types/:id
   * Delete a shift type
   */
  fastify.delete(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { id } = request.params as { id: string };

        const docRef = db.collection("shiftTypes").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Shift type not found",
          });
        }

        const existing = doc.data()!;

        // Check stable access
        const hasAccess = await hasStableAccess(
          existing.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to delete this shift type",
          });
        }

        await docRef.delete();

        return { success: true, id };
      } catch (error) {
        request.log.error({ error }, "Failed to delete shift type");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete shift type",
        });
      }
    },
  );
}
