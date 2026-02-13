import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { serializeTimestamps } from "../utils/serialization.js";
import { PERMISSIONS } from "../utils/openapiPermissions.js";

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
      schema: {
        description: "Get all health records for a specific horse",
        tags: ["Health Records"],
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
            recordType: {
              type: "string",
              enum: [
                "veterinary",
                "farrier",
                "dental",
                "medication",
                "injury",
                "deworming",
                "other",
              ],
              description: "Filter by record type",
            },
            limit: {
              type: "string",
              description: "Maximum number of records to return (default: 50)",
            },
            offset: {
              type: "string",
              description: "Number of records to skip (default: 0)",
            },
          },
        },
        response: {
          200: {
            description: "List of health records",
            type: "object",
            properties: {
              records: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    horseId: { type: "string" },
                    horseName: { type: "string" },
                    recordType: { type: "string" },
                    title: { type: "string" },
                    date: {
                      type: "string",
                      format: "date-time",
                      description: "ISO 8601 timestamp",
                    },
                    scheduledTime: { type: ["string", "null"] },
                    duration: { type: ["integer", "null"] },
                    provider: { type: "string" },
                    clinic: { type: "string" },
                    requiresFollowUp: { type: "boolean" },
                    followUpDate: {
                      type: ["string", "null"],
                      format: "date-time",
                      description: "ISO 8601 timestamp",
                    },
                    createdAt: {
                      type: "string",
                      format: "date-time",
                      description: "ISO 8601 timestamp",
                    },
                    updatedAt: {
                      type: "string",
                      format: "date-time",
                      description: "ISO 8601 timestamp",
                    },
                  },
                },
              },
              total: { type: "integer", description: "Total count of records" },
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
              "Insufficient permissions to access this horse's records",
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
      schema: {
        description: "Create a new health record for a horse",
        tags: ["Health Records"],
        body: {
          type: "object",
          required: ["horseId", "recordType", "title", "date"],
          properties: {
            horseId: {
              type: "string",
              description: "ID of the horse this record belongs to",
            },
            recordType: {
              type: "string",
              enum: [
                "veterinary",
                "farrier",
                "dental",
                "medication",
                "injury",
                "deworming",
                "other",
              ],
              description: "Type of health record",
            },
            title: {
              type: "string",
              minLength: 1,
              description:
                "Short summary (e.g., 'Annual checkup', 'Colic treatment')",
            },
            date: {
              type: "string",
              format: "date-time",
              description: "Event date (ISO 8601)",
            },
            scheduledTime: {
              type: "string",
              pattern: "^([01]\\d|2[0-3]):([0-5]\\d)$",
              description:
                "Optional time of day in HH:MM format (e.g., '14:30')",
            },
            duration: {
              type: "integer",
              minimum: 1,
              maximum: 480,
              description: "Optional duration in minutes (1-480)",
            },
            provider: {
              type: "string",
              description: "Provider name (vet, farrier, etc.)",
            },
            providerContactId: {
              type: "string",
              description: "Reference to contact document",
            },
            clinic: {
              type: "string",
              description: "Clinic or facility name",
            },
            diagnosis: { type: "string", description: "Diagnosis details" },
            treatment: { type: "string", description: "Treatment provided" },
            symptoms: { type: "string", description: "Observed symptoms" },
            findings: { type: "string", description: "Examination findings" },
            cost: { type: "number", description: "Cost in SEK" },
            currency: {
              type: "string",
              description: "Currency code (default: SEK)",
            },
            requiresFollowUp: {
              type: "boolean",
              description: "Whether follow-up is needed",
            },
            followUpDate: {
              type: "string",
              format: "date-time",
              description: "Follow-up date (ISO 8601)",
            },
            followUpNotes: {
              type: "string",
              description: "Notes for follow-up appointment",
            },
            notes: { type: "string", description: "Additional notes" },
          },
        },
        response: {
          201: {
            description: "Health record created successfully",
            type: "object",
            properties: {
              id: { type: "string" },
              horseId: { type: "string" },
              horseName: { type: "string" },
              recordType: { type: "string" },
              title: { type: "string" },
              date: {
                type: "string",
                format: "date-time",
                description: "ISO 8601 timestamp",
              },
              scheduledTime: { type: ["string", "null"] },
              duration: { type: ["integer", "null"] },
              provider: { type: "string" },
              clinic: { type: "string" },
              diagnosis: { type: "string" },
              treatment: { type: "string" },
              cost: { type: "number" },
              currency: { type: "string" },
              requiresFollowUp: { type: "boolean" },
              followUpDate: {
                type: ["string", "null"],
                format: "date-time",
                description: "ISO 8601 timestamp",
              },
              followUpNotes: { type: "string" },
              notes: { type: "string" },
              createdAt: {
                type: "string",
                format: "date-time",
                description: "ISO 8601 timestamp",
              },
              createdBy: { type: "string" },
              updatedAt: {
                type: "string",
                format: "date-time",
                description: "ISO 8601 timestamp",
              },
              lastModifiedBy: { type: "string" },
            },
          },
          400: {
            description: "Invalid request parameters or body",
            type: "object",
            properties: {
              error: { type: "string" },
              message: { type: "string" },
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
              "Insufficient permissions to create health record for this horse",
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
        const data = request.body as any;

        if (!data.horseId || !data.recordType || !data.title || !data.date) {
          return reply.status(400).send({
            error: "Bad Request",
            message:
              "Missing required fields: horseId, recordType, title, date",
          });
        }

        // Validate optional scheduledTime format (HH:MM)
        if (
          data.scheduledTime &&
          !/^([01]\d|2[0-3]):([0-5]\d)$/.test(data.scheduledTime)
        ) {
          return reply.status(400).send({
            error: "Bad Request",
            message: 'Invalid scheduledTime format. Use HH:MM (e.g., "14:30")',
          });
        }

        // Validate optional duration (1-480 minutes)
        if (data.duration && (data.duration < 1 || data.duration > 480)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Duration must be between 1 and 480 minutes",
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
          scheduledTime: data.scheduledTime || null,
          duration: data.duration || null,
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
      schema: {
        description: "Update an existing health record",
        tags: ["Health Records"],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "string",
              description: "Health record ID",
            },
          },
        },
        body: {
          type: "object",
          required: ["horseId"],
          properties: {
            horseId: {
              type: "string",
              description: "ID of the horse (required for access check)",
            },
            recordType: {
              type: "string",
              enum: [
                "veterinary",
                "farrier",
                "dental",
                "medication",
                "injury",
                "deworming",
                "other",
              ],
            },
            title: { type: "string", minLength: 1 },
            date: { type: "string", format: "date-time" },
            scheduledTime: {
              type: "string",
              pattern: "^([01]\\d|2[0-3]):([0-5]\\d)$",
              description: "Time of day in HH:MM format",
            },
            duration: {
              type: "integer",
              minimum: 1,
              maximum: 480,
              description: "Duration in minutes",
            },
            provider: { type: "string" },
            providerContactId: { type: "string" },
            clinic: { type: "string" },
            diagnosis: { type: "string" },
            treatment: { type: "string" },
            symptoms: { type: "string" },
            findings: { type: "string" },
            cost: { type: "number" },
            currency: { type: "string" },
            requiresFollowUp: { type: "boolean" },
            followUpDate: { type: "string", format: "date-time" },
            followUpNotes: { type: "string" },
            notes: { type: "string" },
          },
        },
        response: {
          200: {
            description: "Health record updated successfully",
            type: "object",
            properties: {
              id: { type: "string" },
              horseId: { type: "string" },
              horseName: { type: "string" },
              recordType: { type: "string" },
              title: { type: "string" },
              date: {
                type: "string",
                format: "date-time",
                description: "ISO 8601 timestamp",
              },
              scheduledTime: { type: ["string", "null"] },
              duration: { type: ["integer", "null"] },
              provider: { type: "string" },
              clinic: { type: "string" },
              diagnosis: { type: "string" },
              treatment: { type: "string" },
              cost: { type: "number" },
              requiresFollowUp: { type: "boolean" },
              followUpDate: {
                type: ["string", "null"],
                format: "date-time",
                description: "ISO 8601 timestamp",
              },
              updatedAt: {
                type: "string",
                format: "date-time",
                description: "ISO 8601 timestamp",
              },
              lastModifiedBy: { type: "string" },
            },
          },
          400: {
            description: "Invalid request parameters or body",
            type: "object",
            properties: {
              error: { type: "string" },
              message: { type: "string" },
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
              "Insufficient permissions to update this health record",
            type: "object",
            properties: {
              error: { type: "string" },
              message: { type: "string" },
            },
          },
          404: {
            description: "Health record not found",
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
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        if (!data.horseId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "horseId is required in request body",
          });
        }

        // Validate optional scheduledTime format (HH:MM)
        if (
          data.scheduledTime &&
          !/^([01]\d|2[0-3]):([0-5]\d)$/.test(data.scheduledTime)
        ) {
          return reply.status(400).send({
            error: "Bad Request",
            message: 'Invalid scheduledTime format. Use HH:MM (e.g., "14:30")',
          });
        }

        // Validate optional duration (1-480 minutes)
        if (data.duration && (data.duration < 1 || data.duration > 480)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Duration must be between 1 and 480 minutes",
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
