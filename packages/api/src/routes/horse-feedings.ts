import type { FastifyInstance } from "fastify";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { Timestamp } from "firebase-admin/firestore";
import { canAccessStable, isSystemAdmin } from "../utils/authorization.js";
import { serializeTimestamps } from "../utils/serialization.js";
import {
  createAuditLog,
  calculateChanges,
} from "../services/auditLogService.js";

/**
 * Parse date string to Timestamp
 */
function parseDate(dateStr: string): Timestamp {
  return Timestamp.fromDate(new Date(dateStr));
}

export async function horseFeedingsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/horse-feedings/stable/:stableId
   * Get all horse feedings for a stable
   * Query params:
   *   - date: ISO date string - filter feedings active on this date
   *   - horseId: string - filter by specific horse
   *   - feedingTimeId: string - filter by feeding time
   *   - activeOnly: boolean (default: true)
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
        const {
          date,
          horseId,
          feedingTimeId,
          activeOnly = "true",
        } = request.query as {
          date?: string;
          horseId?: string;
          feedingTimeId?: string;
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
          .collection("horseFeedings")
          .where("stableId", "==", stableId);

        if (activeOnly === "true") {
          query = query.where("isActive", "==", true) as any;
        }

        if (horseId) {
          query = query.where("horseId", "==", horseId) as any;
        }

        if (feedingTimeId) {
          query = query.where("feedingTimeId", "==", feedingTimeId) as any;
        }

        const snapshot = await query.get();

        let horseFeedings = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Filter by date if provided
        // Show feedings where: startDate <= date && (endDate == null || endDate >= date)
        if (date) {
          const targetDate = new Date(date);
          targetDate.setHours(0, 0, 0, 0);
          const targetTimestamp = targetDate.getTime();

          horseFeedings = horseFeedings.filter((feeding: any) => {
            const startDate = feeding.startDate?.toDate
              ? feeding.startDate.toDate()
              : new Date(feeding.startDate);
            startDate.setHours(0, 0, 0, 0);

            const endDate = feeding.endDate
              ? feeding.endDate.toDate
                ? feeding.endDate.toDate()
                : new Date(feeding.endDate)
              : null;
            if (endDate) {
              endDate.setHours(23, 59, 59, 999);
            }

            const startsBeforeOrOn = startDate.getTime() <= targetTimestamp;
            const endsAfterOrOngoing =
              !endDate || endDate.getTime() >= targetTimestamp;

            return startsBeforeOrOn && endsAfterOrOngoing;
          });
        }

        const serializedFeedings = horseFeedings.map((feeding) =>
          serializeTimestamps(feeding),
        );

        return { horseFeedings: serializedFeedings };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch horse feedings");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch horse feedings",
        });
      }
    },
  );

  /**
   * GET /api/v1/horse-feedings/horse/:horseId
   * Get all feedings for a specific horse
   * Query params: activeOnly (boolean, default: true)
   */
  fastify.get(
    "/horse/:horseId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { horseId } = request.params as { horseId: string };
        const { activeOnly = "true" } = request.query as {
          activeOnly?: string;
        };

        // Get the horse to check access
        const horseDoc = await db.collection("horses").doc(horseId).get();
        if (!horseDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Horse not found",
          });
        }

        const horse = horseDoc.data()!;

        // Check access via horse ownership or stable membership
        if (!isSystemAdmin(user.role)) {
          const isOwner = horse.ownerId === user.uid;
          const hasStableAccess = horse.currentStableId
            ? await canAccessStable(user.uid, horse.currentStableId)
            : false;

          if (!isOwner && !hasStableAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to access this horse's feedings",
            });
          }
        }

        // Build query
        let query = db
          .collection("horseFeedings")
          .where("horseId", "==", horseId);

        if (activeOnly === "true") {
          query = query.where("isActive", "==", true) as any;
        }

        const snapshot = await query.get();

        const horseFeedings = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { horseFeedings };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch horse feedings");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch horse feedings",
        });
      }
    },
  );

  /**
   * GET /api/v1/horse-feedings/:id
   * Get a single horse feeding by ID
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

        const doc = await db.collection("horseFeedings").doc(id).get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Horse feeding not found",
          });
        }

        const horseFeeding = doc.data()!;

        // Check stable access
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessStable(
            user.uid,
            horseFeeding.stableId,
          );
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to access this horse feeding",
            });
          }
        }

        return serializeTimestamps({ id: doc.id, ...horseFeeding });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch horse feeding");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch horse feeding",
        });
      }
    },
  );

  /**
   * POST /api/v1/horse-feedings
   * Create a new horse feeding
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

        // Check stable access (any member can create feedings)
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessStable(user.uid, data.stableId);
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to create feedings for this stable",
            });
          }
        }

        // Validate required fields
        if (
          !data.horseId ||
          !data.feedTypeId ||
          !data.feedingTimeId ||
          !data.startDate ||
          data.quantity === undefined
        ) {
          return reply.status(400).send({
            error: "Bad Request",
            message:
              "horseId, feedTypeId, feedingTimeId, startDate, and quantity are required",
          });
        }

        // Get feed type for denormalized fields
        const feedTypeDoc = await db
          .collection("feedTypes")
          .doc(data.feedTypeId)
          .get();
        if (!feedTypeDoc.exists) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid feedTypeId",
          });
        }
        const feedType = feedTypeDoc.data()!;

        // Get feeding time for denormalized fields
        const feedingTimeDoc = await db
          .collection("feedingTimes")
          .doc(data.feedingTimeId)
          .get();
        if (!feedingTimeDoc.exists) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid feedingTimeId",
          });
        }
        const feedingTime = feedingTimeDoc.data()!;

        // Get horse for denormalized fields
        const horseDoc = await db.collection("horses").doc(data.horseId).get();
        if (!horseDoc.exists) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid horseId",
          });
        }
        const horse = horseDoc.data()!;

        const horseFeedingData = {
          stableId: data.stableId,
          horseId: data.horseId,
          feedTypeId: data.feedTypeId,
          feedingTimeId: data.feedingTimeId,
          quantity: data.quantity,
          startDate: parseDate(data.startDate),
          endDate: data.endDate ? parseDate(data.endDate) : null,
          notes: data.notes || null,
          isActive: true,
          createdBy: user.uid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          // Denormalized fields
          feedTypeName: feedType.name,
          feedTypeCategory: feedType.category,
          quantityMeasure: feedType.quantityMeasure,
          horseName: horse.name,
          feedingTimeName: feedingTime.name,
        };

        const docRef = await db
          .collection("horseFeedings")
          .add(horseFeedingData);

        // Create audit log for feeding creation
        try {
          await createAuditLog({
            userId: user.uid,
            userEmail: user.email,
            userName: user.displayName,
            action: "create",
            resource: "horseFeeding",
            resourceId: docRef.id,
            resourceName: `${horse.name} - ${feedingTime.name} - ${feedType.name}`,
            stableId: data.stableId,
            details: {
              horseId: data.horseId,
              horseName: horse.name,
              feedTypeId: data.feedTypeId,
              feedTypeName: feedType.name,
              feedingTimeId: data.feedingTimeId,
              feedingTimeName: feedingTime.name,
              quantity: data.quantity,
              quantityMeasure: feedType.quantityMeasure,
              startDate: data.startDate,
              endDate: data.endDate,
              notes: data.notes,
            },
          });
        } catch (auditError) {
          // Log audit failure but don't fail the request
          request.log.error(
            { error: auditError },
            "Failed to create audit log for feeding creation",
          );
        }

        return reply.status(201).send({
          id: docRef.id,
          ...serializeTimestamps(horseFeedingData),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to create horse feeding");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create horse feeding",
        });
      }
    },
  );

  /**
   * PUT /api/v1/horse-feedings/:id
   * Update a horse feeding
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

        const docRef = db.collection("horseFeedings").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Horse feeding not found",
          });
        }

        const existing = doc.data()!;

        // Check stable access
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessStable(user.uid, existing.stableId);
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to update this horse feeding",
            });
          }
        }

        // Prevent changing immutable fields
        const immutableFields = [
          "stableId",
          "horseId",
          "createdBy",
          "createdAt",
        ];
        for (const field of immutableFields) {
          if (updates[field] && updates[field] !== existing[field]) {
            return reply.status(400).send({
              error: "Bad Request",
              message: `Cannot change ${field}`,
            });
          }
        }

        const updateData: any = {
          updatedAt: Timestamp.now(),
        };

        // Handle date fields
        if (updates.startDate) {
          updateData.startDate = parseDate(updates.startDate);
        }
        if (updates.endDate !== undefined) {
          updateData.endDate = updates.endDate
            ? parseDate(updates.endDate)
            : null;
        }

        // Handle other fields
        if (updates.quantity !== undefined) {
          updateData.quantity = updates.quantity;
        }
        if (updates.notes !== undefined) {
          updateData.notes = updates.notes || null;
        }
        if (updates.isActive !== undefined) {
          updateData.isActive = updates.isActive;
        }

        // Update denormalized fields if feedTypeId changes
        if (updates.feedTypeId && updates.feedTypeId !== existing.feedTypeId) {
          const feedTypeDoc = await db
            .collection("feedTypes")
            .doc(updates.feedTypeId)
            .get();
          if (!feedTypeDoc.exists) {
            return reply.status(400).send({
              error: "Bad Request",
              message: "Invalid feedTypeId",
            });
          }
          const feedType = feedTypeDoc.data()!;
          updateData.feedTypeId = updates.feedTypeId;
          updateData.feedTypeName = feedType.name;
          updateData.feedTypeCategory = feedType.category;
          updateData.quantityMeasure = feedType.quantityMeasure;
        }

        // Update denormalized fields if feedingTimeId changes
        if (
          updates.feedingTimeId &&
          updates.feedingTimeId !== existing.feedingTimeId
        ) {
          const feedingTimeDoc = await db
            .collection("feedingTimes")
            .doc(updates.feedingTimeId)
            .get();
          if (!feedingTimeDoc.exists) {
            return reply.status(400).send({
              error: "Bad Request",
              message: "Invalid feedingTimeId",
            });
          }
          const feedingTime = feedingTimeDoc.data()!;
          updateData.feedingTimeId = updates.feedingTimeId;
          updateData.feedingTimeName = feedingTime.name;
        }

        // Calculate changes for audit log
        const changes = calculateChanges(
          existing,
          { ...existing, ...updateData },
          [
            "quantity",
            "feedTypeId",
            "feedingTimeId",
            "startDate",
            "endDate",
            "notes",
            "isActive",
          ],
        );

        await docRef.update(updateData);

        // Create audit log for feeding update (only if something changed)
        if (changes.length > 0) {
          try {
            await createAuditLog({
              userId: user.uid,
              userEmail: user.email,
              userName: user.displayName,
              action: "update",
              resource: "horseFeeding",
              resourceId: id,
              resourceName: `${existing.horseName} - ${updateData.feedingTimeName || existing.feedingTimeName}`,
              stableId: existing.stableId,
              details: {
                changes,
                horseId: existing.horseId,
                horseName: existing.horseName,
              },
            });
          } catch (auditError) {
            // Log audit failure but don't fail the request
            request.log.error(
              { error: auditError },
              "Failed to create audit log for feeding update",
            );
          }
        }

        return serializeTimestamps({ id, ...existing, ...updateData });
      } catch (error) {
        request.log.error({ error }, "Failed to update horse feeding");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update horse feeding",
        });
      }
    },
  );

  /**
   * DELETE /api/v1/horse-feedings/:id
   * Delete a horse feeding
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

        const docRef = db.collection("horseFeedings").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Horse feeding not found",
          });
        }

        const existing = doc.data()!;

        // Check stable access
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessStable(user.uid, existing.stableId);
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to delete this horse feeding",
            });
          }
        }

        // Hard delete
        await docRef.delete();

        // Create audit log for feeding deletion
        try {
          await createAuditLog({
            userId: user.uid,
            userEmail: user.email,
            userName: user.displayName,
            action: "delete",
            resource: "horseFeeding",
            resourceId: id,
            resourceName: `${existing.horseName} - ${existing.feedingTimeName}`,
            stableId: existing.stableId,
            details: {
              horseId: existing.horseId,
              horseName: existing.horseName,
              feedTypeId: existing.feedTypeId,
              feedTypeName: existing.feedTypeName,
              quantity: existing.quantity,
              quantityMeasure: existing.quantityMeasure,
              startDate: existing.startDate,
              endDate: existing.endDate,
            },
          });
        } catch (auditError) {
          // Log audit failure but don't fail the request
          request.log.error(
            { error: auditError },
            "Failed to create audit log for feeding deletion",
          );
        }

        return { success: true, id };
      } catch (error) {
        request.log.error({ error }, "Failed to delete horse feeding");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete horse feeding",
        });
      }
    },
  );
}
