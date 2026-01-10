import type { FastifyInstance } from "fastify";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { Timestamp } from "firebase-admin/firestore";

/**
 * Convert Firestore Timestamps to ISO date strings for JSON serialization
 */
function serializeTimestamps(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

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
 * Check if user has access to a horse
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

  // Check ownership
  if (horse.ownerId === userId) return true;

  // Check stable membership
  if (horse.currentStableId) {
    const stableDoc = await db
      .collection("stables")
      .doc(horse.currentStableId)
      .get();
    if (stableDoc.exists && stableDoc.data()?.ownerId === userId) return true;

    const memberId = `${userId}_${horse.currentStableId}`;
    const memberDoc = await db.collection("stableMembers").doc(memberId).get();
    if (memberDoc.exists && memberDoc.data()?.status === "active") return true;
  }

  return false;
}

export async function vaccinationRecordsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/vaccination-records/horse/:horseId
   * Get all vaccination records for a horse
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

        // Check access
        const hasAccess = await hasHorseAccess(horseId, user.uid, user.role);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this horse",
          });
        }

        // Get vaccination records
        const snapshot = await db
          .collection("vaccinationRecords")
          .where("horseId", "==", horseId)
          .orderBy("administeredDate", "desc")
          .get();

        const records = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { records };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch vaccination records");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch vaccination records",
        });
      }
    },
  );

  /**
   * GET /api/v1/vaccination-records/organization/:organizationId
   * Get all vaccination records for an organization
   */
  fastify.get(
    "/organization/:organizationId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { organizationId } = request.params as { organizationId: string };
        const user = (request as AuthenticatedRequest).user!;

        // Check organization membership
        const memberDoc = await db
          .collection("organizationMembers")
          .doc(`${user.uid}_${organizationId}`)
          .get();

        if (!memberDoc.exists && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this organization",
          });
        }

        // Get vaccination records
        const snapshot = await db
          .collection("vaccinationRecords")
          .where("organizationId", "==", organizationId)
          .orderBy("administeredDate", "desc")
          .get();

        const records = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { records };
      } catch (error) {
        request.log.error(
          { error },
          "Failed to fetch organization vaccination records",
        );
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch vaccination records",
        });
      }
    },
  );

  /**
   * POST /api/v1/vaccination-records
   * Create a new vaccination record
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

        // Validate required fields
        if (!data.horseId || !data.vaccineName || !data.administeredDate) {
          return reply.status(400).send({
            error: "Bad Request",
            message:
              "Missing required fields: horseId, vaccineName, administeredDate",
          });
        }

        // Check access
        const hasAccess = await hasHorseAccess(
          data.horseId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to add records for this horse",
          });
        }

        // Create record
        const recordData = {
          horseId: data.horseId,
          horseName: data.horseName,
          vaccineName: data.vaccineName,
          administeredDate: Timestamp.fromDate(new Date(data.administeredDate)),
          expiryDate: data.expiryDate
            ? Timestamp.fromDate(new Date(data.expiryDate))
            : null,
          batchNumber: data.batchNumber || null,
          veterinarian: data.veterinarian || null,
          notes: data.notes || null,
          organizationId: data.organizationId || null,
          createdAt: Timestamp.now(),
          createdBy: user.uid,
          lastModifiedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        };

        const docRef = await db
          .collection("vaccinationRecords")
          .add(recordData);

        // Update horse's nextVaccinationDue if applicable
        if (data.expiryDate) {
          const horseRef = db.collection("horses").doc(data.horseId);
          const horseDoc = await horseRef.get();

          if (horseDoc.exists) {
            const currentNext = horseDoc.data()?.nextVaccinationDue;
            const newExpiry = Timestamp.fromDate(new Date(data.expiryDate));

            if (!currentNext || newExpiry.toDate() < currentNext.toDate()) {
              await horseRef.update({
                nextVaccinationDue: newExpiry,
                lastModifiedAt: Timestamp.now(),
                lastModifiedBy: user.uid,
              });
            }
          }
        }

        return { id: docRef.id, ...serializeTimestamps(recordData) };
      } catch (error) {
        request.log.error({ error }, "Failed to create vaccination record");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create vaccination record",
        });
      }
    },
  );

  /**
   * PUT /api/v1/vaccination-records/:id
   * Update a vaccination record
   */
  fastify.put(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        // Get existing record
        const docRef = db.collection("vaccinationRecords").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Vaccination record not found",
          });
        }

        const record = doc.data()!;

        // Check access
        const hasAccess = await hasHorseAccess(
          record.horseId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to update this record",
          });
        }

        // Update record
        const updates: any = {
          lastModifiedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        };

        if (data.vaccineName) updates.vaccineName = data.vaccineName;
        if (data.administeredDate)
          updates.administeredDate = Timestamp.fromDate(
            new Date(data.administeredDate),
          );
        if (data.expiryDate !== undefined) {
          updates.expiryDate = data.expiryDate
            ? Timestamp.fromDate(new Date(data.expiryDate))
            : null;
        }
        if (data.batchNumber !== undefined)
          updates.batchNumber = data.batchNumber;
        if (data.veterinarian !== undefined)
          updates.veterinarian = data.veterinarian;
        if (data.notes !== undefined) updates.notes = data.notes;

        await docRef.update(updates);

        return { id, ...serializeTimestamps({ ...record, ...updates }) };
      } catch (error) {
        request.log.error({ error }, "Failed to update vaccination record");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update vaccination record",
        });
      }
    },
  );

  /**
   * DELETE /api/v1/vaccination-records/:id
   * Delete a vaccination record
   */
  fastify.delete(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        // Get existing record
        const docRef = db.collection("vaccinationRecords").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Vaccination record not found",
          });
        }

        const record = doc.data()!;

        // Check access
        const hasAccess = await hasHorseAccess(
          record.horseId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to delete this record",
          });
        }

        await docRef.delete();

        return { success: true, id };
      } catch (error) {
        request.log.error({ error }, "Failed to delete vaccination record");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete vaccination record",
        });
      }
    },
  );

  /**
   * POST /api/v1/vaccination-records/horse/:horseId/update-cache
   * Update horse's cached vaccination fields
   */
  fastify.post(
    "/horse/:horseId/update-cache",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { horseId } = request.params as { horseId: string };
        const user = (request as AuthenticatedRequest).user!;

        // Check access
        const hasAccess = await hasHorseAccess(horseId, user.uid, user.role);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to update this horse",
          });
        }

        // Get horse document
        const horseRef = db.collection("horses").doc(horseId);
        const horseDoc = await horseRef.get();

        if (!horseDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Horse not found",
          });
        }

        // Get most recent vaccination record
        const recordsSnapshot = await db
          .collection("vaccinationRecords")
          .where("horseId", "==", horseId)
          .orderBy("administeredDate", "desc")
          .limit(1)
          .get();

        if (recordsSnapshot.empty) {
          // No records - clear cached fields
          await horseRef.update({
            lastVaccinationDate: null,
            nextVaccinationDue: null,
            vaccinationStatus: "no_records",
            updatedAt: Timestamp.now(),
            lastModifiedBy: user.uid,
          });

          return { success: true, status: "no_records" };
        }

        // Get latest record
        const latestRecord = recordsSnapshot.docs[0].data();

        // Calculate status
        const horse = horseDoc.data()!;
        let vaccinationStatus = "no_records";

        if (latestRecord.expiryDate) {
          const nextDue = latestRecord.expiryDate.toDate();
          const today = new Date();
          const daysUntilDue = Math.ceil(
            (nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
          );

          if (daysUntilDue < 0) {
            vaccinationStatus = "expired";
          } else if (daysUntilDue <= 30) {
            vaccinationStatus = "expiring_soon";
          } else {
            vaccinationStatus = "current";
          }
        }

        // Update horse document with cached fields
        await horseRef.update({
          lastVaccinationDate: latestRecord.administeredDate,
          nextVaccinationDue: latestRecord.expiryDate || null,
          vaccinationStatus,
          updatedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        });

        return { success: true, status: vaccinationStatus };
      } catch (error) {
        request.log.error({ error }, "Failed to update vaccination cache");
        // Don't throw 500 - cache update failures shouldn't block operations
        return reply.status(200).send({
          success: false,
          error: "Cache update failed but operation continued",
        });
      }
    },
  );
}
