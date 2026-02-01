import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import { checkModuleAccess } from "../middleware/checkModuleAccess.js";
import type { AuthenticatedRequest } from "../types/index.js";
import {
  canAccessOrganization,
  canManageOrganization,
  isOrganizationAdmin,
  isSystemAdmin,
} from "../utils/authorization.js";
import { serializeTimestamps } from "../utils/serialization.js";
import type { TrainerAttributionSummary } from "@equiduty/shared";

// ============================================
// Zod Schemas
// ============================================

const createTrainerAttributionSchema = z.object({
  trainerId: z.string().min(1),
  trainerName: z.string().optional(),
  activityId: z.string().min(1),
  activityType: z.string().min(1),
  activityDate: z.string().min(1),
  participantCount: z.number().int().min(0),
  totalRevenue: z.number().int().min(0),
});

const COLLECTION = "trainerAttributions";

export async function trainerAttributionRoutes(fastify: FastifyInstance) {
  // Addon gate: invoicing module required
  fastify.addHook("preHandler", checkModuleAccess("invoicing"));

  /**
   * GET /:organizationId/trainer-attributions
   * List trainer attributions for an organization.
   * Query params: trainerId (optional), from (ISO date), to (ISO date),
   *               limit (default 100), offset (default 0)
   */
  fastify.get(
    "/:organizationId/trainer-attributions",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId } = request.params as {
          organizationId: string;
        };
        const {
          trainerId,
          from,
          to,
          limit = "100",
          offset = "0",
        } = request.query as {
          trainerId?: string;
          from?: string;
          to?: string;
          limit?: string;
          offset?: string;
        };

        // Check organization access — attribution data restricted to admins + own trainer
        let effectiveTrainerId = trainerId;
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessOrganization(
            user.uid,
            organizationId,
          );
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to access this organization",
            });
          }

          // Non-admins can only view their own attribution data
          const isAdmin = await isOrganizationAdmin(user.uid, organizationId);
          if (!isAdmin) {
            if (trainerId && trainerId !== user.uid) {
              return reply.status(403).send({
                error: "Forbidden",
                message: "You can only view your own attribution data",
              });
            }
            effectiveTrainerId = user.uid;
          }
        }

        // Build query
        let query = db
          .collection(COLLECTION)
          .where("organizationId", "==", organizationId) as any;

        if (effectiveTrainerId) {
          query = query.where("trainerId", "==", effectiveTrainerId);
        }

        if (from) {
          const fromDate = Timestamp.fromDate(new Date(from));
          query = query.where("activityDate", ">=", fromDate);
        }

        if (to) {
          const toDate = Timestamp.fromDate(new Date(to));
          query = query.where("activityDate", "<=", toDate);
        }

        query = query.orderBy("activityDate", "desc");

        const parsedLimit = Math.min(parseInt(limit, 10) || 100, 500);
        const parsedOffset = parseInt(offset, 10) || 0;

        // For offset-based pagination, fetch offset + limit then slice
        const snapshot = await query.limit(parsedOffset + parsedLimit).get();
        const allDocs = snapshot.docs.slice(parsedOffset);

        const items = allDocs.map(
          (doc: FirebaseFirestore.QueryDocumentSnapshot) =>
            serializeTimestamps({
              id: doc.id,
              ...doc.data(),
            }),
        );

        return {
          items,
          pagination: {
            limit: parsedLimit,
            offset: parsedOffset,
            count: items.length,
          },
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch trainer attributions");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch trainer attributions",
        });
      }
    },
  );

  /**
   * GET /:organizationId/trainer-attributions/summary
   * Aggregate trainer attribution data over a date range.
   * Query params: from (ISO date, required), to (ISO date, required),
   *               trainerId (optional)
   */
  fastify.get(
    "/:organizationId/trainer-attributions/summary",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId } = request.params as {
          organizationId: string;
        };
        const { from, to, trainerId } = request.query as {
          from?: string;
          to?: string;
          trainerId?: string;
        };

        if (!from || !to) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Query parameters 'from' and 'to' are required",
          });
        }

        // Check organization access — attribution data restricted to admins + own trainer
        let effectiveSummaryTrainerId = trainerId;
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessOrganization(
            user.uid,
            organizationId,
          );
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to access this organization",
            });
          }

          // Non-admins can only view their own attribution summary
          const isAdmin = await isOrganizationAdmin(user.uid, organizationId);
          if (!isAdmin) {
            if (trainerId && trainerId !== user.uid) {
              return reply.status(403).send({
                error: "Forbidden",
                message: "You can only view your own attribution data",
              });
            }
            effectiveSummaryTrainerId = user.uid;
          }
        }

        const fromDate = Timestamp.fromDate(new Date(from));
        const toDate = Timestamp.fromDate(new Date(to));

        let query = db
          .collection(COLLECTION)
          .where("organizationId", "==", organizationId)
          .where("activityDate", ">=", fromDate)
          .where("activityDate", "<=", toDate) as any;

        if (effectiveSummaryTrainerId) {
          query = query.where("trainerId", "==", effectiveSummaryTrainerId);
        }

        const snapshot = await query.get();

        // Aggregate by trainerId
        const summaryMap = new Map<string, TrainerAttributionSummary>();

        snapshot.docs.forEach(
          (doc: FirebaseFirestore.QueryDocumentSnapshot) => {
            const data = doc.data();
            const tid: string = data.trainerId;

            if (!summaryMap.has(tid)) {
              summaryMap.set(tid, {
                trainerId: tid,
                trainerName: data.trainerName || undefined,
                totalActivities: 0,
                totalParticipants: 0,
                totalRevenue: 0,
                activityBreakdown: {},
              });
            }

            const summary = summaryMap.get(tid)!;
            summary.totalActivities += 1;
            summary.totalParticipants += data.participantCount || 0;
            summary.totalRevenue += data.totalRevenue || 0;

            const actType: string = data.activityType || "unknown";
            summary.activityBreakdown[actType] =
              (summary.activityBreakdown[actType] || 0) + 1;
          },
        );

        const summaries = Array.from(summaryMap.values());

        return { summaries };
      } catch (error) {
        request.log.error(
          { error },
          "Failed to fetch trainer attribution summary",
        );
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch trainer attribution summary",
        });
      }
    },
  );

  /**
   * POST /:organizationId/trainer-attributions
   * Create a new trainer attribution record.
   * Body: CreateTrainerAttributionData
   */
  fastify.post(
    "/:organizationId/trainer-attributions",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId } = request.params as {
          organizationId: string;
        };
        // Validate request body with Zod
        const parseResult = createTrainerAttributionSchema.safeParse(
          request.body,
        );
        if (!parseResult.success) {
          return reply.status(400).send({
            error: "Validation failed",
            details: parseResult.error.flatten().fieldErrors,
          });
        }
        const data = parseResult.data;

        // Check organization management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageOrganization(
            user.uid,
            organizationId,
          );
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to manage trainer attributions for this organization",
            });
          }
        }

        const now = Timestamp.now();
        const attributionData = {
          trainerId: data.trainerId,
          trainerName: data.trainerName || null,
          activityId: data.activityId,
          activityType: data.activityType,
          organizationId,
          activityDate: Timestamp.fromDate(new Date(data.activityDate)),
          participantCount: data.participantCount,
          totalRevenue: data.totalRevenue,
          createdAt: now,
          updatedAt: now,
        };

        const docRef = await db.collection(COLLECTION).add(attributionData);

        return reply.status(201).send(
          serializeTimestamps({
            id: docRef.id,
            ...attributionData,
          }),
        );
      } catch (error) {
        request.log.error({ error }, "Failed to create trainer attribution");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create trainer attribution",
        });
      }
    },
  );
}
