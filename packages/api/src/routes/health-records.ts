import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { serializeTimestamps } from "../utils/serialization.js";

/**
 * Check if user has access to a horse (owner or has stable access)
 */
async function hasHorseAccess(
  horseId: string,
  userId: string,
  userRole: string,
): Promise<boolean> {
  if (userRole === "system_admin") return true;

  const horseDoc = await db.collection("horses").doc(horseId).get();
  if (!horseDoc.exists) return false;

  const horse = horseDoc.data()!;

  // Owner has access
  if (horse.ownerId === userId) return true;

  // Check stable access if horse is assigned to a stable
  if (horse.currentStableId) {
    const stableDoc = await db
      .collection("stables")
      .doc(horse.currentStableId)
      .get();

    if (stableDoc.exists) {
      const stable = stableDoc.data()!;
      if (stable.ownerId === userId) return true;

      // Check organization membership
      if (stable.organizationId) {
        const memberId = `${userId}_${stable.organizationId}`;
        const memberDoc = await db
          .collection("organizationMembers")
          .doc(memberId)
          .get();

        if (memberDoc.exists) {
          const member = memberDoc.data()!;
          if (
            member.status === "active" &&
            (member.stableAccess === "all" ||
              (member.stableAccess === "specific" &&
                member.assignedStableIds?.includes(horse.currentStableId)))
          ) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

export async function healthRecordsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/health-records/horse/:horseId
   * Get all health records for a horse
   */
  fastify.get(
    "/horse/:horseId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { horseId } = request.params as { horseId: string };
        const user = (request as AuthenticatedRequest).user!;
        const {
          recordType,
          limit = "50",
          offset = "0",
        } = request.query as {
          recordType?: string;
          limit?: string;
          offset?: string;
        };

        // Check access
        if (!(await hasHorseAccess(horseId, user.uid, user.role || ""))) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this horse",
          });
        }

        let query = db
          .collection("horses")
          .doc(horseId)
          .collection("healthRecords")
          .orderBy("date", "desc");

        if (recordType) {
          query = query.where("recordType", "==", recordType) as any;
        }

        const snapshot = await query
          .limit(parseInt(limit, 10))
          .offset(parseInt(offset, 10))
          .get();

        const records = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { records };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch health records");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch health records",
        });
      }
    },
  );

  /**
   * GET /api/v1/health-records/:id
   * Get a single health record
   */
  fastify.get(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { horseId } = request.query as { horseId: string };
        const user = (request as AuthenticatedRequest).user!;

        if (!horseId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "horseId query parameter is required",
          });
        }

        // Check access
        if (!(await hasHorseAccess(horseId, user.uid, user.role || ""))) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this horse",
          });
        }

        const doc = await db
          .collection("horses")
          .doc(horseId)
          .collection("healthRecords")
          .doc(id)
          .get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Health record not found",
          });
        }

        return serializeTimestamps({
          id: doc.id,
          ...doc.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch health record");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch health record",
        });
      }
    },
  );

  /**
   * POST /api/v1/health-records
   * Create a new health record
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

        if (!data.horseId || !data.recordType || !data.title || !data.date) {
          return reply.status(400).send({
            error: "Bad Request",
            message:
              "Missing required fields: horseId, recordType, title, date",
          });
        }

        // Check access
        if (!(await hasHorseAccess(data.horseId, user.uid, user.role || ""))) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this horse",
          });
        }

        // Get horse name for caching
        const horseDoc = await db.collection("horses").doc(data.horseId).get();
        const horseName = horseDoc.data()?.name || "";

        const recordData = {
          ...data,
          horseName,
          date:
            data.date instanceof Date
              ? Timestamp.fromDate(data.date)
              : typeof data.date === "string"
                ? Timestamp.fromDate(new Date(data.date))
                : data.date,
          followUpDate: data.followUpDate
            ? data.followUpDate instanceof Date
              ? Timestamp.fromDate(data.followUpDate)
              : typeof data.followUpDate === "string"
                ? Timestamp.fromDate(new Date(data.followUpDate))
                : data.followUpDate
            : null,
          createdAt: Timestamp.now(),
          createdBy: user.uid,
          updatedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        };

        const docRef = await db
          .collection("horses")
          .doc(data.horseId)
          .collection("healthRecords")
          .add(recordData);

        return reply.status(201).send(
          serializeTimestamps({
            id: docRef.id,
            ...recordData,
          }),
        );
      } catch (error) {
        request.log.error({ error }, "Failed to create health record");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create health record",
        });
      }
    },
  );

  /**
   * PATCH /api/v1/health-records/:id
   * Update a health record
   */
  fastify.patch(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        if (!data.horseId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "horseId is required in request body",
          });
        }

        // Check access
        if (!(await hasHorseAccess(data.horseId, user.uid, user.role || ""))) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this horse",
          });
        }

        const recordRef = db
          .collection("horses")
          .doc(data.horseId)
          .collection("healthRecords")
          .doc(id);

        const recordDoc = await recordRef.get();

        if (!recordDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Health record not found",
          });
        }

        const updateData = {
          ...data,
          date: data.date
            ? data.date instanceof Date
              ? Timestamp.fromDate(data.date)
              : typeof data.date === "string"
                ? Timestamp.fromDate(new Date(data.date))
                : data.date
            : undefined,
          followUpDate: data.followUpDate
            ? data.followUpDate instanceof Date
              ? Timestamp.fromDate(data.followUpDate)
              : typeof data.followUpDate === "string"
                ? Timestamp.fromDate(new Date(data.followUpDate))
                : data.followUpDate
            : undefined,
          updatedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        };

        // Remove undefined values and protected fields
        delete updateData.horseId;
        delete updateData.createdAt;
        delete updateData.createdBy;
        Object.keys(updateData).forEach((key) => {
          if (updateData[key] === undefined) {
            delete updateData[key];
          }
        });

        await recordRef.update(updateData);

        const updatedDoc = await recordRef.get();
        return serializeTimestamps({
          id: updatedDoc.id,
          ...updatedDoc.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to update health record");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update health record",
        });
      }
    },
  );

  /**
   * DELETE /api/v1/health-records/:id
   * Delete a health record
   */
  fastify.delete(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { horseId } = request.query as { horseId: string };
        const user = (request as AuthenticatedRequest).user!;

        if (!horseId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "horseId query parameter is required",
          });
        }

        // Check access
        if (!(await hasHorseAccess(horseId, user.uid, user.role || ""))) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this horse",
          });
        }

        const recordRef = db
          .collection("horses")
          .doc(horseId)
          .collection("healthRecords")
          .doc(id);

        const recordDoc = await recordRef.get();

        if (!recordDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Health record not found",
          });
        }

        await recordRef.delete();

        return reply.status(204).send();
      } catch (error) {
        request.log.error({ error }, "Failed to delete health record");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete health record",
        });
      }
    },
  );

  /**
   * GET /api/v1/health-records/horse/:horseId/stats
   * Get health statistics for a horse
   */
  fastify.get(
    "/horse/:horseId/stats",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { horseId } = request.params as { horseId: string };
        const user = (request as AuthenticatedRequest).user!;

        // Check access
        if (!(await hasHorseAccess(horseId, user.uid, user.role || ""))) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this horse",
          });
        }

        const recordsSnapshot = await db
          .collection("horses")
          .doc(horseId)
          .collection("healthRecords")
          .get();

        const records = recordsSnapshot.docs.map((doc) => doc.data());

        // Calculate stats
        const now = new Date();
        const yearStart = new Date(now.getFullYear(), 0, 1);

        const stats = {
          totalRecords: records.length,
          lastVeterinaryVisit: null as string | null,
          lastFarrierVisit: null as string | null,
          lastDentalVisit: null as string | null,
          lastDewormingDate: null as string | null,
          upcomingFollowUps: 0,
          totalCostThisYear: 0,
        };

        for (const record of records) {
          const recordDate = record.date?.toDate?.();

          // Find most recent visits by type
          if (record.recordType === "veterinary" && recordDate) {
            if (
              !stats.lastVeterinaryVisit ||
              recordDate > new Date(stats.lastVeterinaryVisit)
            ) {
              stats.lastVeterinaryVisit = recordDate.toISOString();
            }
          }
          if (record.recordType === "farrier" && recordDate) {
            if (
              !stats.lastFarrierVisit ||
              recordDate > new Date(stats.lastFarrierVisit)
            ) {
              stats.lastFarrierVisit = recordDate.toISOString();
            }
          }
          if (record.recordType === "dental" && recordDate) {
            if (
              !stats.lastDentalVisit ||
              recordDate > new Date(stats.lastDentalVisit)
            ) {
              stats.lastDentalVisit = recordDate.toISOString();
            }
          }
          if (record.recordType === "deworming" && recordDate) {
            if (
              !stats.lastDewormingDate ||
              recordDate > new Date(stats.lastDewormingDate)
            ) {
              stats.lastDewormingDate = recordDate.toISOString();
            }
          }

          // Count upcoming follow-ups
          if (record.requiresFollowUp && record.followUpDate) {
            const followUpDate = record.followUpDate.toDate?.();
            if (followUpDate && followUpDate >= now) {
              stats.upcomingFollowUps++;
            }
          }

          // Sum costs this year
          if (record.cost && recordDate && recordDate >= yearStart) {
            stats.totalCostThisYear += record.cost;
          }
        }

        return stats;
      } catch (error) {
        request.log.error({ error }, "Failed to fetch health stats");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch health stats",
        });
      }
    },
  );

  /**
   * GET /api/v1/health-records/horse/:horseId/upcoming-followups
   * Get upcoming follow-up appointments
   */
  fastify.get(
    "/horse/:horseId/upcoming-followups",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { horseId } = request.params as { horseId: string };
        const user = (request as AuthenticatedRequest).user!;
        const { days = "30" } = request.query as { days?: string };

        // Check access
        if (!(await hasHorseAccess(horseId, user.uid, user.role || ""))) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this horse",
          });
        }

        const now = Timestamp.now();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() + parseInt(days, 10));

        const recordsSnapshot = await db
          .collection("horses")
          .doc(horseId)
          .collection("healthRecords")
          .where("requiresFollowUp", "==", true)
          .where("followUpDate", ">=", now)
          .where("followUpDate", "<=", Timestamp.fromDate(cutoffDate))
          .orderBy("followUpDate", "asc")
          .get();

        const records = recordsSnapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { records };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch upcoming follow-ups");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch upcoming follow-ups",
        });
      }
    },
  );
}
