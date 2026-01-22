import type { FastifyInstance } from "fastify";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { canAccessStable, isSystemAdmin } from "../utils/authorization.js";
import { serializeTimestamps } from "../utils/serialization.js";

/**
 * Feeding history routes - Query audit logs for feeding changes
 */
export async function feedingHistoryRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/feeding-history/stable/:stableId
   * Get feeding change history for a stable
   *
   * Query params:
   *   - startDate: ISO date string - filter logs from this date
   *   - endDate: ISO date string - filter logs to this date
   *   - horseId: string - filter by specific horse
   *   - action: 'create' | 'update' | 'delete' | 'all' - filter by action type
   *   - limit: number (default: 100) - max number of logs to return
   */
  fastify.get(
    "/stable/:stableId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { stableId } = request.params as { stableId: string };
        const {
          startDate,
          endDate,
          horseId,
          action,
          limit = "100",
        } = request.query as Record<string, string>;

        // Authorization check
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessStable(user.uid, stableId);
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to access this stable's history",
            });
          }
        }

        // Build query
        let query = db
          .collection("auditLogs")
          .where("stableId", "==", stableId)
          .where("resource", "==", "horseFeeding")
          .orderBy("timestamp", "desc")
          .limit(Number(limit));

        // Apply filters
        if (horseId && horseId !== "all") {
          query = query.where("details.horseId", "==", horseId) as any;
        }

        if (action && action !== "all") {
          query = query.where("action", "==", action) as any;
        }

        // Execute query
        const snapshot = await query.get();

        // Filter by date range if provided (client-side since Firestore doesn't support multiple range queries)
        let logs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (startDate) {
          const start = new Date(startDate).getTime();
          logs = logs.filter((log: any) => {
            const logTime = log.timestamp?.toDate
              ? log.timestamp.toDate().getTime()
              : 0;
            return logTime >= start;
          });
        }

        if (endDate) {
          const end = new Date(endDate).getTime();
          logs = logs.filter((log: any) => {
            const logTime = log.timestamp?.toDate
              ? log.timestamp.toDate().getTime()
              : 0;
            return logTime <= end;
          });
        }

        // Serialize timestamps for frontend
        const serializedLogs = logs.map((log) => serializeTimestamps(log));

        return {
          auditLogs: serializedLogs,
          count: serializedLogs.length,
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch feeding history");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch feeding history",
        });
      }
    },
  );

  /**
   * GET /api/v1/feeding-history/horse/:horseId
   * Get feeding change history for a specific horse
   *
   * Query params:
   *   - startDate: ISO date string
   *   - endDate: ISO date string
   *   - action: 'create' | 'update' | 'delete' | 'all'
   *   - limit: number (default: 100)
   */
  fastify.get(
    "/horse/:horseId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { horseId } = request.params as { horseId: string };
        const {
          startDate,
          endDate,
          action,
          limit = "100",
        } = request.query as Record<string, string>;

        // Get horse to check stable access
        const horseDoc = await db.collection("horses").doc(horseId).get();
        if (!horseDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Horse not found",
          });
        }

        const horse = horseDoc.data()!;

        // Authorization check
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessStable(user.uid, horse.stableId);
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to access this horse's history",
            });
          }
        }

        // Build query
        let query = db
          .collection("auditLogs")
          .where("resource", "==", "horseFeeding")
          .where("details.horseId", "==", horseId)
          .orderBy("timestamp", "desc")
          .limit(Number(limit));

        if (action && action !== "all") {
          query = query.where("action", "==", action) as any;
        }

        // Execute query
        const snapshot = await query.get();

        // Filter by date range if provided
        let logs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (startDate) {
          const start = new Date(startDate).getTime();
          logs = logs.filter((log: any) => {
            const logTime = log.timestamp?.toDate
              ? log.timestamp.toDate().getTime()
              : 0;
            return logTime >= start;
          });
        }

        if (endDate) {
          const end = new Date(endDate).getTime();
          logs = logs.filter((log: any) => {
            const logTime = log.timestamp?.toDate
              ? log.timestamp.toDate().getTime()
              : 0;
            return logTime <= end;
          });
        }

        // Serialize timestamps for frontend
        const serializedLogs = logs.map((log) => serializeTimestamps(log));

        return {
          auditLogs: serializedLogs,
          count: serializedLogs.length,
          horseName: horse.name,
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch horse feeding history");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch horse feeding history",
        });
      }
    },
  );
}
