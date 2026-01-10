import type { FastifyInstance } from "fastify";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { Timestamp } from "firebase-admin/firestore";

/**
 * Convert Firestore Timestamps to ISO date strings
 */
function serializeTimestamps(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Timestamp || (obj && typeof obj.toDate === "function")) {
    return obj.toDate().toISOString();
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => serializeTimestamps(item));
  }
  if (typeof obj === "object" && obj.constructor === Object) {
    const serialized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        serialized[key] = serializeTimestamps(obj[key]);
      }
    }
    return serialized;
  }
  return obj;
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

  // Check if user is stable member
  const memberId = `${userId}_${stableId}`;
  const memberDoc = await db.collection("stableMembers").doc(memberId).get();
  if (memberDoc.exists && memberDoc.data()?.status === "active") {
    return true;
  }

  return false;
}

export async function activityTypesRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/activity-types/stable/:stableId
   * Get all activity types for a stable
   * Query params: activeOnly (boolean, default: true)
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
        const { activeOnly = "true" } = request.query as {
          activeOnly?: string;
        };

        // Check stable access
        const hasAccess = await hasStableAccess(stableId, user.uid, user.role);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this stable",
          });
        }

        // Build query
        let query = db
          .collection("activityTypes")
          .where("stableId", "==", stableId);

        if (activeOnly === "true") {
          query = query.where("isActive", "==", true) as any;
        }

        query = query.orderBy("sortOrder", "asc") as any;

        const snapshot = await query.get();

        const activityTypes = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { activityTypes };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch activity types");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch activity types",
        });
      }
    },
  );

  /**
   * GET /api/v1/activity-types/:id
   * Get a single activity type by ID
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

        const doc = await db.collection("activityTypes").doc(id).get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Activity type not found",
          });
        }

        const activityType = doc.data()!;

        // Check stable access
        const hasAccess = await hasStableAccess(
          activityType.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this activity type",
          });
        }

        return serializeTimestamps({ id: doc.id, ...activityType });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch activity type");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch activity type",
        });
      }
    },
  );

  /**
   * POST /api/v1/activity-types
   * Create a new activity type
   */
  fastify.post(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        if (!data.stableId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "stableId is required",
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
              "You do not have permission to create activity types for this stable",
          });
        }

        // Prevent creating standard types
        if (data.isStandard) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Cannot create custom activity types with isStandard=true",
          });
        }

        const activityTypeData = {
          ...data,
          createdBy: user.uid,
          lastModifiedBy: user.uid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        const docRef = await db
          .collection("activityTypes")
          .add(activityTypeData);

        return reply.status(201).send({
          id: docRef.id,
          ...serializeTimestamps(activityTypeData),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to create activity type");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create activity type",
        });
      }
    },
  );

  /**
   * PUT /api/v1/activity-types/:id
   * Update an activity type
   */
  fastify.put(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { id } = request.params as { id: string };
        const updates = request.body as any;

        const docRef = db.collection("activityTypes").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Activity type not found",
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
            message: "You do not have permission to update this activity type",
          });
        }

        // For standard types, only allow specific field updates
        if (existing.isStandard) {
          const allowedFields = ["color", "icon", "isActive", "sortOrder"];
          const attemptedFields = Object.keys(updates);
          const invalidFields = attemptedFields.filter(
            (field) => !allowedFields.includes(field),
          );

          if (invalidFields.length > 0) {
            return reply.status(400).send({
              error: "Bad Request",
              message: `Cannot modify fields [${invalidFields.join(", ")}] on standard activity type. Only [${allowedFields.join(", ")}] can be modified.`,
            });
          }
        }

        const updateData = {
          ...updates,
          lastModifiedBy: user.uid,
          updatedAt: Timestamp.now(),
        };

        await docRef.update(updateData);

        return serializeTimestamps({ id, ...existing, ...updateData });
      } catch (error) {
        request.log.error({ error }, "Failed to update activity type");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update activity type",
        });
      }
    },
  );

  /**
   * DELETE /api/v1/activity-types/:id
   * Delete an activity type (soft delete for standard types, hard delete for custom)
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

        const docRef = db.collection("activityTypes").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Activity type not found",
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
            message: "You do not have permission to delete this activity type",
          });
        }

        if (existing.isStandard) {
          // Soft delete for standard types
          await docRef.update({
            isActive: false,
            lastModifiedBy: user.uid,
            updatedAt: Timestamp.now(),
          });
        } else {
          // Hard delete for custom types
          await docRef.delete();
        }

        return { success: true, id };
      } catch (error) {
        request.log.error({ error }, "Failed to delete activity type");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete activity type",
        });
      }
    },
  );
}
