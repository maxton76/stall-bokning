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
import { PERMISSIONS } from "../utils/openapiPermissions.js";

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
    {
      preHandler: [authenticate],
      schema: {
        description:
          "Get activity history for a specific horse (horse timeline view)",
        tags: ["Activities"],
        params: {
          type: "object",
          required: ["horseId"],
          properties: {
            horseId: { type: "string", description: "Horse ID" },
          },
        },
        querystring: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description: "Filter by routine category",
            },
            startDate: {
              type: "string",
              format: "date-time",
              description: "Filter from this date (ISO 8601)",
            },
            endDate: {
              type: "string",
              format: "date-time",
              description: "Filter to this date (ISO 8601)",
            },
            limit: {
              type: "string",
              description: "Maximum number of entries to return (default: 50)",
            },
            cursor: {
              type: "string",
              description: "Pagination cursor (last document ID)",
            },
          },
        },
        response: {
          200: {
            description: "Activity history for the horse",
            type: "object",
            properties: {
              activities: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    horseId: { type: "string" },
                    routineInstanceId: { type: "string" },
                    stepId: { type: "string" },
                    category: { type: "string" },
                    name: { type: "string" },
                    completedAt: {
                      type: "string",
                      format: "date-time",
                      description: "ISO 8601 timestamp",
                    },
                    completedBy: { type: "string" },
                    completedByName: { type: "string" },
                  },
                },
              },
              nextCursor: {
                type: "string",
                description: "Cursor for next page",
              },
              hasMore: {
                type: "boolean",
                description: "Whether more results are available",
              },
              horseName: {
                type: "string",
                description: "Name of the horse",
              },
            },
          },
          401: {
            description: "Missing or invalid JWT token",
            type: "object",
            properties: {
              error: { type: "string" },
              message: { type: "string" },
            },
          },
          403: {
            description:
              "Insufficient permissions to access this horse's activity history",
            type: "object",
            properties: {
              error: { type: "string" },
              message: { type: "string" },
            },
          },
          404: {
            description: "Horse not found",
            type: "object",
            properties: {
              error: { type: "string" },
              message: { type: "string" },
            },
          },
          500: {
            description: "Internal server error",
            type: "object",
            properties: {
              error: { type: "string" },
              message: { type: "string" },
            },
          },
        },
        ...PERMISSIONS.AUTHENTICATED,
      },
    },
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

        // Debug logging: Check photo URLs in response
        request.log.info({
          msg: `[PHOTO DEBUG] Returning ${result.activities.length} history entries`,
        });
        result.activities.forEach(
          (act: HorseActivityHistoryEntry, idx: number) => {
            request.log.info({
              msg: `[PHOTO DEBUG] Entry ${idx}`,
              id: act.id,
              category: act.category,
              photoUrls: act.photoUrls,
              photoCount: act.photoUrls?.length || 0,
            });
          },
        );

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
