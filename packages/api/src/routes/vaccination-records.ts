import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { serializeTimestamps } from "../utils/serialization.js";

/**
 * Check if user has organization membership with stable access
 */
async function hasOrgStableAccess(
  stableId: string,
  userId: string,
): Promise<boolean> {
  const stableDoc = await db.collection("stables").doc(stableId).get();
  if (!stableDoc.exists) return false;

  const stable = stableDoc.data()!;
  const organizationId = stable.organizationId;

  if (!organizationId) return false;

  // Check organizationMembers collection
  const memberId = `${userId}_${organizationId}`;
  const memberDoc = await db
    .collection("organizationMembers")
    .doc(memberId)
    .get();

  if (!memberDoc.exists) return false;

  const member = memberDoc.data()!;
  if (member.status !== "active") return false;

  // Check stable access permissions
  if (member.stableAccess === "all") return true;
  if (member.stableAccess === "specific") {
    const assignedStables = member.assignedStableIds || [];
    if (assignedStables.includes(stableId)) return true;
  }

  return false;
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

  // Check stable membership via organization
  if (horse.currentStableId) {
    const stableDoc = await db
      .collection("stables")
      .doc(horse.currentStableId)
      .get();
    if (stableDoc.exists && stableDoc.data()?.ownerId === userId) return true;

    // Check organization membership with stable access
    if (await hasOrgStableAccess(horse.currentStableId, userId)) return true;
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

        // Get vaccination records - using frontend field name for ordering
        const snapshot = await db
          .collection("vaccinationRecords")
          .where("horseId", "==", horseId)
          .orderBy("vaccinationDate", "desc")
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

        // Get vaccination records - using frontend field name for ordering
        const snapshot = await db
          .collection("vaccinationRecords")
          .where("organizationId", "==", organizationId)
          .orderBy("vaccinationDate", "desc")
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
   * Accepts both API field names and frontend field names for compatibility:
   *   - vaccineName OR vaccinationRuleName
   *   - administeredDate OR vaccinationDate
   *   - expiryDate OR nextDueDate
   *   - veterinarian OR veterinarianName
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

        // Map frontend field names to API field names
        const vaccineName = data.vaccineName || data.vaccinationRuleName;
        const administeredDate = data.administeredDate || data.vaccinationDate;
        const expiryDate = data.expiryDate || data.nextDueDate;
        const veterinarian = data.veterinarian || data.veterinarianName;

        // Validate required fields
        if (!data.horseId || !vaccineName || !administeredDate) {
          return reply.status(400).send({
            error: "Bad Request",
            message:
              "Missing required fields: horseId, vaccineName (or vaccinationRuleName), administeredDate (or vaccinationDate)",
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

        // Parse administeredDate - handle both ISO strings and Firestore Timestamp objects
        let parsedAdministeredDate: Date;
        if (typeof administeredDate === "string") {
          parsedAdministeredDate = new Date(administeredDate);
        } else if (
          administeredDate &&
          typeof administeredDate === "object" &&
          administeredDate.seconds
        ) {
          // Firestore Timestamp format { seconds: number, nanoseconds: number }
          parsedAdministeredDate = new Date(administeredDate.seconds * 1000);
        } else {
          parsedAdministeredDate = new Date(administeredDate);
        }

        // Parse expiryDate if provided
        let parsedExpiryDate: Date | null = null;
        if (expiryDate) {
          if (typeof expiryDate === "string") {
            parsedExpiryDate = new Date(expiryDate);
          } else if (typeof expiryDate === "object" && expiryDate.seconds) {
            parsedExpiryDate = new Date(expiryDate.seconds * 1000);
          } else {
            parsedExpiryDate = new Date(expiryDate);
          }
        }

        // Create record - using frontend-compatible field names from shared VaccinationRecord type
        const recordData = {
          horseId: data.horseId,
          horseName: data.horseName || null,
          organizationId: data.organizationId || null,
          // Vaccination details - using frontend field names
          vaccinationRuleId: data.vaccinationRuleId || null,
          vaccinationRuleName: vaccineName, // Frontend expects vaccinationRuleName
          vaccinationDate: Timestamp.fromDate(parsedAdministeredDate), // Frontend expects vaccinationDate
          nextDueDate: parsedExpiryDate
            ? Timestamp.fromDate(parsedExpiryDate)
            : null, // Frontend expects nextDueDate
          // Veterinary details
          veterinarianName: veterinarian || null, // Frontend expects veterinarianName
          vaccineProduct: data.vaccineProduct || null,
          batchNumber: data.batchNumber || null,
          notes: data.notes || null,
          // Metadata
          createdAt: Timestamp.now(),
          createdBy: user.uid,
          updatedAt: Timestamp.now(),
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
   * Accepts both API field names and frontend field names for compatibility
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

        // Map frontend field names to API field names
        const vaccineName = data.vaccineName || data.vaccinationRuleName;
        const administeredDate = data.administeredDate || data.vaccinationDate;
        const expiryDate =
          data.expiryDate !== undefined ? data.expiryDate : data.nextDueDate;
        const veterinarian =
          data.veterinarian !== undefined
            ? data.veterinarian
            : data.veterinarianName;

        // Update record - using frontend-compatible field names
        const updates: any = {
          updatedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        };

        if (vaccineName) updates.vaccinationRuleName = vaccineName; // Frontend field name
        if (data.vaccinationRuleId)
          updates.vaccinationRuleId = data.vaccinationRuleId;
        if (data.vaccineProduct !== undefined)
          updates.vaccineProduct = data.vaccineProduct;

        // Parse vaccinationDate if provided
        if (administeredDate) {
          let parsedDate: Date;
          if (typeof administeredDate === "string") {
            parsedDate = new Date(administeredDate);
          } else if (
            typeof administeredDate === "object" &&
            administeredDate.seconds
          ) {
            parsedDate = new Date(administeredDate.seconds * 1000);
          } else {
            parsedDate = new Date(administeredDate);
          }
          updates.vaccinationDate = Timestamp.fromDate(parsedDate); // Frontend field name
        }

        // Parse nextDueDate if provided
        if (expiryDate !== undefined) {
          if (expiryDate) {
            let parsedDate: Date;
            if (typeof expiryDate === "string") {
              parsedDate = new Date(expiryDate);
            } else if (typeof expiryDate === "object" && expiryDate.seconds) {
              parsedDate = new Date(expiryDate.seconds * 1000);
            } else {
              parsedDate = new Date(expiryDate);
            }
            updates.nextDueDate = Timestamp.fromDate(parsedDate); // Frontend field name
          } else {
            updates.nextDueDate = null;
          }
        }

        if (data.batchNumber !== undefined)
          updates.batchNumber = data.batchNumber;
        if (veterinarian !== undefined) updates.veterinarianName = veterinarian; // Frontend field name
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

        // Get most recent vaccination record - using frontend field name
        const recordsSnapshot = await db
          .collection("vaccinationRecords")
          .where("horseId", "==", horseId)
          .orderBy("vaccinationDate", "desc")
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

        // Get latest record - using frontend field names
        const latestRecord = recordsSnapshot.docs[0].data();

        // Calculate status
        let vaccinationStatus = "no_records";

        if (latestRecord.nextDueDate) {
          const nextDue = latestRecord.nextDueDate.toDate();
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
          lastVaccinationDate: latestRecord.vaccinationDate,
          nextVaccinationDue: latestRecord.nextDueDate || null,
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
