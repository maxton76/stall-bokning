import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { db } from "../utils/firebase.js";
import { serializeTimestamps } from "../utils/serialization.js";
import { canAccessStable, isSystemAdmin } from "../utils/authorization.js";
import {
  getByHorseId,
  getByRoutineInstanceId,
  getByStableId,
} from "../services/horseActivityHistoryService.js";
import type {
  RoutineCategory,
  HorseActivityHistoryEntry,
} from "@equiduty/shared";

/**
 * Horse Activity History Routes
 * Provides endpoints for querying horse routine activity history
 */
export async function horseActivityHistoryRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/horse-activity-history/horse/:horseId
   * Get activity history for a specific horse (horse timeline)
   *
   * Query params:
   *   - category: RoutineCategory - filter by category
   *   - startDate: ISO date string - filter from this date
   *   - endDate: ISO date string - filter to this date
   *   - limit: number (default: 50) - max entries to return
   *   - cursor: string - pagination cursor (last doc ID)
   */
  fastify.get(
    "/horse/:horseId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { horseId } = request.params as { horseId: string };
        const { category, startDate, endDate, limit, cursor } =
          request.query as Record<string, string | undefined>;

        // Get horse to check access
        const horseDoc = await db.collection("horses").doc(horseId).get();
        if (!horseDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Horse not found",
          });
        }

        const horse = horseDoc.data()!;

        // Authorization: must have access to horse's stable or be owner
        if (!isSystemAdmin(user.role)) {
          const isOwner = horse.ownerId === user.uid;
          const hasStableAccess = horse.currentStableId
            ? await canAccessStable(user.uid, horse.currentStableId)
            : false;

          if (!isOwner && !hasStableAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to view this horse's activity history",
            });
          }
        }

        const result = await getByHorseId(horseId, {
          category: category as RoutineCategory | undefined,
          startDate,
          endDate,
          limit: limit ? Number(limit) : undefined,
          cursor,
        });

        return {
          activities: result.activities.map((a: HorseActivityHistoryEntry) =>
            serializeTimestamps(a),
          ),
          nextCursor: result.nextCursor,
          hasMore: result.hasMore,
          horseName: horse.name,
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch horse activity history");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch horse activity history",
        });
      }
    },
  );

  /**
   * GET /api/v1/horse-activity-history/routine/:routineInstanceId
   * Get activity history for a completed routine
   * Returns activities grouped by step for routine summary view
   */
  fastify.get(
    "/routine/:routineInstanceId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { routineInstanceId } = request.params as {
          routineInstanceId: string;
        };

        // Get routine instance to check access
        const routineDoc = await db
          .collection("routineInstances")
          .doc(routineInstanceId)
          .get();

        if (!routineDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Routine instance not found",
          });
        }

        const routine = routineDoc.data()!;

        // Authorization: must have access to routine's stable
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessStable(user.uid, routine.stableId);
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to view this routine's history",
            });
          }
        }

        const result = await getByRoutineInstanceId(routineInstanceId);

        // Serialize timestamps in grouped data
        const serializedGroupedByStep: Record<string, any[]> = {};
        for (const [stepId, activities] of Object.entries(
          result.groupedByStep,
        )) {
          serializedGroupedByStep[stepId] = activities.map(
            (a: HorseActivityHistoryEntry) => serializeTimestamps(a),
          );
        }

        return {
          activities: result.activities.map((a: HorseActivityHistoryEntry) =>
            serializeTimestamps(a),
          ),
          groupedByStep: serializedGroupedByStep,
          routineInfo: {
            id: routineInstanceId,
            templateName: routine.templateName,
            status: routine.status,
            scheduledDate: routine.scheduledDate,
            completedAt: routine.completedAt,
            completedBy: routine.completedBy,
            completedByName: routine.completedByName,
          },
        };
      } catch (error) {
        request.log.error(
          { error },
          "Failed to fetch routine activity history",
        );
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch routine activity history",
        });
      }
    },
  );

  /**
   * GET /api/v1/horse-activity-history/stable/:stableId
   * Get activity history for all horses in a stable
   *
   * Query params:
   *   - category: RoutineCategory - filter by category
   *   - startDate: ISO date string
   *   - endDate: ISO date string
   *   - horseId: string - filter by specific horse
   *   - limit: number (default: 50)
   *   - cursor: string - pagination cursor
   */
  fastify.get(
    "/stable/:stableId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { stableId } = request.params as { stableId: string };
        const { category, startDate, endDate, horseId, limit, cursor } =
          request.query as Record<string, string | undefined>;

        // Authorization check
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessStable(user.uid, stableId);
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to access this stable's activity history",
            });
          }
        }

        const result = await getByStableId(stableId, {
          category: category as RoutineCategory | undefined,
          startDate,
          endDate,
          horseId,
          limit: limit ? Number(limit) : undefined,
          cursor,
        });

        return {
          activities: result.activities.map((a: HorseActivityHistoryEntry) =>
            serializeTimestamps(a),
          ),
          nextCursor: result.nextCursor,
          hasMore: result.hasMore,
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch stable activity history");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch stable activity history",
        });
      }
    },
  );
}
