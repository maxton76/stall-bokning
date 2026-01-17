import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import {
  canAccessStable,
  canManageStable,
  isSystemAdmin,
} from "../utils/authorization.js";
import { serializeTimestamps } from "../utils/serialization.js";

export async function feedTypesRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/feed-types/stable/:stableId
   * Get all feed types for a stable
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
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessStable(user.uid, stableId);
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to access this stable",
            });
          }
        }

        // Build query
        let query = db
          .collection("feedTypes")
          .where("stableId", "==", stableId);

        if (activeOnly === "true") {
          query = query.where("isActive", "==", true) as any;
        }

        query = query.orderBy("name", "asc") as any;

        const snapshot = await query.get();

        const feedTypes = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { feedTypes };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch feed types");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch feed types",
        });
      }
    },
  );

  /**
   * GET /api/v1/feed-types/:id
   * Get a single feed type by ID
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

        const doc = await db.collection("feedTypes").doc(id).get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Feed type not found",
          });
        }

        const feedType = doc.data()!;

        // Check stable access
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessStable(user.uid, feedType.stableId);
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to access this feed type",
            });
          }
        }

        return serializeTimestamps({ id: doc.id, ...feedType });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch feed type");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch feed type",
        });
      }
    },
  );

  /**
   * POST /api/v1/feed-types
   * Create a new feed type
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

        // Check stable management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageStable(user.uid, data.stableId);
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to create feed types for this stable",
            });
          }
        }

        // Validate required fields
        if (
          !data.name ||
          !data.brand ||
          !data.category ||
          !data.quantityMeasure ||
          data.defaultQuantity === undefined
        ) {
          return reply.status(400).send({
            error: "Bad Request",
            message:
              "name, brand, category, quantityMeasure, and defaultQuantity are required",
          });
        }

        const feedTypeData = {
          stableId: data.stableId,
          name: data.name,
          brand: data.brand,
          category: data.category,
          quantityMeasure: data.quantityMeasure,
          defaultQuantity: data.defaultQuantity,
          warning: data.warning || null,
          isActive: true,
          createdBy: user.uid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        const docRef = await db.collection("feedTypes").add(feedTypeData);

        return reply.status(201).send({
          id: docRef.id,
          ...serializeTimestamps(feedTypeData),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to create feed type");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create feed type",
        });
      }
    },
  );

  /**
   * PUT /api/v1/feed-types/:id
   * Update a feed type
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

        const docRef = db.collection("feedTypes").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Feed type not found",
          });
        }

        const existing = doc.data()!;

        // Check stable management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageStable(user.uid, existing.stableId);
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to update this feed type",
            });
          }
        }

        // Prevent changing stableId
        if (updates.stableId && updates.stableId !== existing.stableId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Cannot change stableId",
          });
        }

        const updateData = {
          ...updates,
          updatedAt: Timestamp.now(),
        };
        delete updateData.stableId; // Ensure stableId is not updated
        delete updateData.createdBy; // Ensure createdBy is not updated
        delete updateData.createdAt; // Ensure createdAt is not updated

        await docRef.update(updateData);

        return serializeTimestamps({ id, ...existing, ...updateData });
      } catch (error) {
        request.log.error({ error }, "Failed to update feed type");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update feed type",
        });
      }
    },
  );

  /**
   * DELETE /api/v1/feed-types/:id
   * Delete a feed type
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

        const docRef = db.collection("feedTypes").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Feed type not found",
          });
        }

        const existing = doc.data()!;

        // Check stable management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageStable(user.uid, existing.stableId);
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to delete this feed type",
            });
          }
        }

        // Check if feed type is being used in horse feedings
        const usageSnapshot = await db
          .collection("horseFeedings")
          .where("feedTypeId", "==", id)
          .where("isActive", "==", true)
          .limit(1)
          .get();

        if (!usageSnapshot.empty) {
          // Soft delete - mark as inactive
          await docRef.update({
            isActive: false,
            updatedAt: Timestamp.now(),
          });
          return { success: true, id, softDeleted: true };
        }

        // Hard delete if not in use
        await docRef.delete();

        return { success: true, id };
      } catch (error) {
        request.log.error({ error }, "Failed to delete feed type");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete feed type",
        });
      }
    },
  );
}
