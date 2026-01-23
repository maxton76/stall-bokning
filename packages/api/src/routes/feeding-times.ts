import type { FastifyInstance } from "fastify";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { Timestamp } from "firebase-admin/firestore";
import {
  canAccessStable,
  canManageStable,
  isSystemAdmin,
} from "../utils/authorization.js";
import { serializeTimestamps } from "../utils/serialization.js";
import {
  badRequest,
  forbidden,
  notFound,
  serverError,
  created,
  ok,
} from "../utils/responses.js";

/**
 * Default feeding times to create when stable has none
 */
const DEFAULT_FEEDING_TIMES = [
  { name: "morning", time: "07:00", sortOrder: 1 },
  { name: "afternoon", time: "13:00", sortOrder: 2 },
  { name: "evening", time: "20:00", sortOrder: 3 },
];

export async function feedingTimesRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/feeding-times/stable/:stableId
   * Get all feeding times for a stable
   * Creates default feeding times if none exist
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
            return forbidden(
              reply,
              "You do not have permission to access this stable",
            );
          }
        }

        // Build query
        let query = db
          .collection("feedingTimes")
          .where("stableId", "==", stableId);

        if (activeOnly === "true") {
          query = query.where("isActive", "==", true) as any;
        }

        query = query.orderBy("sortOrder", "asc") as any;

        let snapshot = await query.get();

        // Auto-create default feeding times if none exist
        if (snapshot.empty && activeOnly === "true") {
          const canManage = await canManageStable(user.uid, stableId);
          if (canManage || isSystemAdmin(user.role)) {
            const batch = db.batch();
            const now = Timestamp.now();

            for (const defaultTime of DEFAULT_FEEDING_TIMES) {
              const docRef = db.collection("feedingTimes").doc();
              batch.set(docRef, {
                ...defaultTime,
                stableId,
                isActive: true,
                createdBy: user.uid,
                createdAt: now,
                updatedAt: now,
              });
            }

            await batch.commit();

            request.log.info(
              { stableId, count: DEFAULT_FEEDING_TIMES.length },
              "Created default feeding times",
            );

            // Re-fetch after creating defaults
            snapshot = await query.get();
          }
        }

        const feedingTimes = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { feedingTimes };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch feeding times");
        return serverError(reply, error, "fetch feeding times");
      }
    },
  );

  /**
   * GET /api/v1/feeding-times/:id
   * Get a single feeding time by ID
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

        const doc = await db.collection("feedingTimes").doc(id).get();

        if (!doc.exists) {
          return notFound(reply, "Feeding time", id);
        }

        const feedingTime = doc.data()!;

        // Check stable access
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessStable(
            user.uid,
            feedingTime.stableId,
          );
          if (!hasAccess) {
            return forbidden(
              reply,
              "You do not have permission to access this feeding time",
            );
          }
        }

        return serializeTimestamps({ id: doc.id, ...feedingTime });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch feeding time");
        return serverError(reply, error, "fetch feeding time");
      }
    },
  );

  /**
   * POST /api/v1/feeding-times
   * Create a new feeding time
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
          return badRequest(reply, "stableId is required");
        }

        // Check stable management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageStable(user.uid, data.stableId);
          if (!canManage) {
            return forbidden(
              reply,
              "You do not have permission to create feeding times for this stable",
            );
          }
        }

        // Validate required fields
        if (!data.name || !data.time) {
          return badRequest(reply, "name and time are required");
        }

        // Validate time format (HH:mm)
        if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(data.time)) {
          return badRequest(
            reply,
            "time must be in HH:mm format (e.g., '07:00', '13:30')",
          );
        }

        // Get the next sort order
        let sortOrder = data.sortOrder;
        if (sortOrder === undefined) {
          const existingSnapshot = await db
            .collection("feedingTimes")
            .where("stableId", "==", data.stableId)
            .orderBy("sortOrder", "desc")
            .limit(1)
            .get();

          if (existingSnapshot.empty) {
            sortOrder = 1;
          } else {
            sortOrder = (existingSnapshot.docs[0].data().sortOrder || 0) + 1;
          }
        }

        const feedingTimeData = {
          stableId: data.stableId,
          name: data.name,
          time: data.time,
          sortOrder,
          isActive: true,
          createdBy: user.uid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        const docRef = await db.collection("feedingTimes").add(feedingTimeData);

        return created(reply, docRef.id, serializeTimestamps(feedingTimeData));
      } catch (error) {
        request.log.error({ error }, "Failed to create feeding time");
        return serverError(reply, error, "create feeding time");
      }
    },
  );

  /**
   * PUT /api/v1/feeding-times/:id
   * Update a feeding time
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

        const docRef = db.collection("feedingTimes").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return notFound(reply, "Feeding time", id);
        }

        const existing = doc.data()!;

        // Check stable management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageStable(user.uid, existing.stableId);
          if (!canManage) {
            return forbidden(
              reply,
              "You do not have permission to update this feeding time",
            );
          }
        }

        // Prevent changing stableId
        if (updates.stableId && updates.stableId !== existing.stableId) {
          return badRequest(reply, "Cannot change stableId");
        }

        // Validate time format if provided
        if (updates.time && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(updates.time)) {
          return badRequest(
            reply,
            "time must be in HH:mm format (e.g., '07:00', '13:30')",
          );
        }

        const updateData = {
          ...updates,
          updatedAt: Timestamp.now(),
        };
        delete updateData.stableId; // Ensure stableId is not updated
        delete updateData.createdBy; // Ensure createdBy is not updated
        delete updateData.createdAt; // Ensure createdAt is not updated

        await docRef.update(updateData);

        return ok(
          reply,
          serializeTimestamps({ id, ...existing, ...updateData }),
        );
      } catch (error) {
        request.log.error({ error }, "Failed to update feeding time");
        return serverError(reply, error, "update feeding time");
      }
    },
  );

  /**
   * DELETE /api/v1/feeding-times/:id
   * Delete a feeding time
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

        const docRef = db.collection("feedingTimes").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return notFound(reply, "Feeding time", id);
        }

        const existing = doc.data()!;

        // Check stable management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageStable(user.uid, existing.stableId);
          if (!canManage) {
            return forbidden(
              reply,
              "You do not have permission to delete this feeding time",
            );
          }
        }

        // Check if feeding time is being used in horse feedings
        const usageSnapshot = await db
          .collection("horseFeedings")
          .where("feedingTimeId", "==", id)
          .where("isActive", "==", true)
          .limit(1)
          .get();

        if (!usageSnapshot.empty) {
          // Soft delete - mark as inactive
          await docRef.update({
            isActive: false,
            updatedAt: Timestamp.now(),
          });
          return ok(reply, { success: true, id, softDeleted: true });
        }

        // Hard delete if not in use
        await docRef.delete();

        return ok(reply, { success: true, id });
      } catch (error) {
        request.log.error({ error }, "Failed to delete feeding time");
        return serverError(reply, error, "delete feeding time");
      }
    },
  );
}
