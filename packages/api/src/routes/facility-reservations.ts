import type { FastifyInstance } from "fastify";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import { validateReservationUpdate } from "../middleware/validateReservation.js";
import { checkReservationOwnership } from "../middleware/checkReservationOwnership.js";
import type { AuthenticatedRequest } from "../types/index.js";
import {
  QueryDocumentSnapshot,
  Timestamp,
  FieldValue,
} from "firebase-admin/firestore";
import { serializeTimestamps } from "../utils/serialization.js";
import {
  getEffectiveTimeBlocks,
  isTimeRangeAvailable,
  createDefaultSchedule,
  type FacilityAvailabilitySchedule,
} from "../utils/facilityAvailability.js";
import { hasStablePermission } from "../utils/permissionEngine.js";
import { sanitizeUserInput } from "../middleware/validateReservation.js";
import { validateFacilityCapacity } from "../utils/capacityValidation.js";

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
 * Check if user has access to a stable
 */
async function hasStableAccess(
  stableId: string,
  userId: string,
  userRole: string,
): Promise<boolean> {
  if (userRole === "system_admin") return true;

  const stableDoc = await db.collection("stables").doc(stableId).get();
  if (!stableDoc.exists) return false;

  const stable = stableDoc.data()!;

  // Check ownership
  if (stable.ownerId === userId) return true;

  // Check organization membership with stable access
  if (await hasOrgStableAccess(stableId, userId)) return true;

  return false;
}

/**
 * Log audit event for reservation status change
 */
async function logReservationStatusChange(
  reservationId: string,
  facilityId: string,
  facilityName: string,
  previousStatus: string,
  newStatus: string,
  userId: string,
  userName: string,
  userEmail: string,
  notes: string | undefined,
  stableId: string,
): Promise<void> {
  try {
    await db.collection("auditLogs").add({
      entity: "facility_reservation",
      entityId: reservationId,
      action: "status_change",
      previousValue: previousStatus,
      newValue: newStatus,
      userId,
      userName,
      userEmail,
      metadata: {
        facilityId,
        facilityName,
        notes: notes || null,
        stableId,
      },
      timestamp: Timestamp.now(),
    });
  } catch (error) {
    console.error("Failed to log reservation status change:", error);
    // Don't throw - audit logging should not block the operation
  }
}

export async function facilityReservationsRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v1/facility-reservations
   * Create a new reservation
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
        if (!data.facilityId || !data.startTime || !data.endTime) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Missing required fields: facilityId, startTime, endTime",
          });
        }

        // Get facility to verify stable access
        const facilityDoc = await db
          .collection("facilities")
          .doc(data.facilityId)
          .get();
        if (!facilityDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Facility not found",
          });
        }

        const facility = facilityDoc.data()!;

        // Check access to stable
        const hasAccess = await hasStableAccess(
          facility.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You do not have permission to create reservations for this facility",
          });
        }

        // Enforce availability schedule
        const schedule: FacilityAvailabilitySchedule =
          facility.availabilitySchedule || createDefaultSchedule();

        const requestedStart = new Date(data.startTime);
        const requestedEnd = new Date(data.endTime);

        const startHH = String(requestedStart.getHours()).padStart(2, "0");
        const startMM = String(requestedStart.getMinutes()).padStart(2, "0");
        const endHH = String(requestedEnd.getHours()).padStart(2, "0");
        const endMM = String(requestedEnd.getMinutes()).padStart(2, "0");

        const startTimeStr = `${startHH}:${startMM}`;
        const endTimeStr = `${endHH}:${endMM}`;

        const effectiveBlocks = getEffectiveTimeBlocks(
          schedule,
          requestedStart,
        );

        // Check if facility is closed on this date (no blocks at all)
        const isClosed = effectiveBlocks.length === 0;
        const withinAvailability =
          !isClosed &&
          isTimeRangeAvailable(effectiveBlocks, startTimeStr, endTimeStr);

        if (isClosed || !withinAvailability) {
          // Allow admin override
          if (data.adminOverride === true) {
            // Check if user has stable management access (owner, org admin, or system admin)
            const canOverride = await hasStableAccess(
              facility.stableId,
              user.uid,
              user.role,
            );

            if (!canOverride) {
              return reply.status(403).send({
                error: "Forbidden",
                message:
                  "Only stable owners or admins can override availability",
              });
            }
            // Admin override accepted - proceed with reservation
          } else {
            const message = isClosed
              ? "Facility is closed on this date"
              : "Requested time is outside facility availability. Use adminOverride to bypass.";
            return reply.status(409).send({
              error: "Conflict",
              message,
              effectiveBlocks,
            });
          }
        }

        // Normalize horse data (support both legacy horseId and new horseIds)
        let horseIds: string[] = [];
        let horseNames: string[] = [];

        if (
          data.horseIds &&
          Array.isArray(data.horseIds) &&
          data.horseIds.length > 0
        ) {
          horseIds = data.horseIds;
          horseNames = data.horseNames || [];
        } else if (data.horseId) {
          horseIds = [data.horseId];
          horseNames = data.horseName ? [data.horseName] : [];
        }

        // Validate horse count against facility limit
        if (horseIds.length === 0) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "At least one horse must be selected for the reservation",
          });
        }

        if (horseIds.length > facility.maxHorsesPerReservation) {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Too many horses selected. Maximum ${facility.maxHorsesPerReservation} horses allowed per reservation.`,
          });
        }

        // Validate capacity (concurrent horses across all reservations)
        const capacityResult = await validateFacilityCapacity(
          data.facilityId,
          {
            startTime: data.startTime,
            endTime: data.endTime,
            horseCount: horseIds.length,
          },
          facility.maxHorsesPerReservation,
        );

        if (!capacityResult.valid) {
          return reply.status(409).send({
            error: "Capacity Exceeded",
            message: capacityResult.message,
            maxConcurrent: capacityResult.maxConcurrent,
            maxConcurrentTime: capacityResult.maxConcurrentTime,
          });
        }

        // Create reservation with denormalized data
        const reservationData: any = {
          facilityId: data.facilityId,
          facilityName: data.facilityName || facility.name,
          facilityType: data.facilityType || facility.type,
          stableId: data.stableId || facility.stableId,
          stableName: data.stableName || null,
          userId: data.userId || user.uid,
          userEmail: data.userEmail || user.email,
          userFullName: data.userFullName || user.displayName || null,
          startTime: Timestamp.fromDate(new Date(data.startTime)),
          endTime: Timestamp.fromDate(new Date(data.endTime)),
          purpose: data.purpose || null,
          notes: data.notes || null,
          status: "pending",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: user.uid,
          lastModifiedBy: user.uid,
        };

        // Add horse data (prefer array format, include legacy for backward compatibility)
        if (horseIds.length === 1) {
          // Single horse - include both formats
          reservationData.horseId = horseIds[0];
          reservationData.horseName = horseNames[0] || null;
          reservationData.horseIds = horseIds;
          reservationData.horseNames = horseNames;
        } else {
          // Multiple horses - only use array format
          reservationData.horseIds = horseIds;
          reservationData.horseNames = horseNames;
        }

        const docRef = await db
          .collection("facilityReservations")
          .add(reservationData);

        return { id: docRef.id, ...serializeTimestamps(reservationData) };
      } catch (error) {
        request.log.error({ error }, "Failed to create reservation");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create reservation",
        });
      }
    },
  );

  /**
   * GET /api/v1/facility-reservations/:id
   * Get a reservation by ID
   */
  fastify.get(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        const doc = await db.collection("facilityReservations").doc(id).get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Reservation not found",
          });
        }

        const reservation = doc.data()!;

        // Check access (own reservation or stable access)
        if (reservation.userId !== user.uid) {
          const hasAccess = await hasStableAccess(
            reservation.stableId,
            user.uid,
            user.role,
          );
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to access this reservation",
            });
          }
        }

        return serializeTimestamps({ id: doc.id, ...reservation });
      } catch (error) {
        request.log.error({ error }, "Failed to get reservation");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to get reservation",
        });
      }
    },
  );

  /**
   * GET /api/v1/facility-reservations
   * Get reservations by query params
   * Supports: facilityId, userId, stableId, startDate, endDate
   */
  fastify.get(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { facilityId, userId, stableId, startDate, endDate } =
          request.query as {
            facilityId?: string;
            userId?: string;
            stableId?: string;
            startDate?: string;
            endDate?: string;
          };
        const user = (request as AuthenticatedRequest).user!;

        // Build query based on params
        let query: any = db.collection("facilityReservations");

        if (facilityId) {
          query = query.where("facilityId", "==", facilityId);
        } else if (userId) {
          // Users can only query their own reservations unless they have stable access
          if (userId !== user.uid && user.role !== "system_admin") {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You can only query your own reservations",
            });
          }
          query = query.where("userId", "==", userId);
        } else if (stableId) {
          // Check access to stable
          const hasAccess = await hasStableAccess(
            stableId,
            user.uid,
            user.role,
          );
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to access reservations for this stable",
            });
          }
          query = query.where("stableId", "==", stableId);
        } else {
          return reply.status(400).send({
            error: "Bad Request",
            message:
              "Missing required query parameter: facilityId, userId, or stableId",
          });
        }

        // Add date range filters if provided
        if (startDate && facilityId) {
          query = query.where(
            "startTime",
            ">=",
            Timestamp.fromDate(new Date(startDate)),
          );
        }
        if (endDate && facilityId) {
          // When endDate is a date-only string (e.g. "2026-02-13"), new Date() gives
          // midnight UTC. We need end-of-day to include all reservations on that date.
          const endOfDay = new Date(endDate);
          endOfDay.setUTCHours(23, 59, 59, 999);
          query = query.where("startTime", "<=", Timestamp.fromDate(endOfDay));
        }

        const snapshot = await query.get();

        const reservations = snapshot.docs.map((doc: QueryDocumentSnapshot) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { reservations };
      } catch (error) {
        request.log.error({ error }, "Failed to get reservations");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to get reservations",
        });
      }
    },
  );

  /**
   * POST /api/v1/facility-reservations/check-conflicts
   * Check for conflicting reservations
   */
  fastify.post(
    "/check-conflicts",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        if (!data.facilityId || !data.startTime || !data.endTime) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Missing required fields: facilityId, startTime, endTime",
          });
        }

        // Get facility to verify stable access
        const facilityDoc = await db
          .collection("facilities")
          .doc(data.facilityId)
          .get();
        if (!facilityDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Facility not found",
          });
        }

        const facility = facilityDoc.data()!;

        // Check access to stable
        const hasAccess = await hasStableAccess(
          facility.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You do not have permission to check conflicts for this facility",
          });
        }

        // Query for overlapping reservations
        const snapshot = await db
          .collection("facilityReservations")
          .where("facilityId", "==", data.facilityId)
          .where("status", "in", ["pending", "confirmed"])
          .get();

        const startMillis = new Date(data.startTime).getTime();
        const endMillis = new Date(data.endTime).getTime();

        // Filter for time overlaps
        const conflicts = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((r: any) => {
            if (data.excludeReservationId && r.id === data.excludeReservationId)
              return false;

            const rStart = r.startTime.toMillis();
            const rEnd = r.endTime.toMillis();

            return startMillis < rEnd && endMillis > rStart;
          })
          .map((r) => serializeTimestamps(r));

        return { conflicts, hasConflicts: conflicts.length > 0 };
      } catch (error) {
        request.log.error({ error }, "Failed to check conflicts");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to check conflicts",
        });
      }
    },
  );

  /**
   * PATCH /api/v1/facility-reservations/:id
   * Update a reservation with transaction-based conflict prevention
   */
  fastify.patch(
    "/:id",
    {
      preHandler: [
        authenticate,
        checkReservationOwnership,
        validateReservationUpdate,
      ],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        // Use Firestore transaction for atomic conflict checking + update
        const result = await db.runTransaction(async (transaction) => {
          // 1. Read reservation (locks it)
          const reservationRef = db.collection("facilityReservations").doc(id);
          const reservationDoc = await transaction.get(reservationRef);

          if (!reservationDoc.exists) {
            throw new Error("RESERVATION_NOT_FOUND");
          }

          const reservation = reservationDoc.data()!;

          // Get facility for capacity validation
          const facilityId = data.facilityId || reservation.facilityId;
          const facilityDoc = await transaction.get(
            db.collection("facilities").doc(facilityId),
          );

          if (!facilityDoc.exists) {
            throw new Error("FACILITY_NOT_FOUND");
          }

          const facility = facilityDoc.data()!;

          // Normalize horse data if provided
          let horseIds: string[] | undefined;
          let horseNames: string[] | undefined;

          if (data.horseIds && Array.isArray(data.horseIds)) {
            horseIds = data.horseIds;
            horseNames = data.horseNames || [];
          } else if (data.horseId) {
            horseIds = [data.horseId];
            horseNames = data.horseName ? [data.horseName] : [];
          } else if (data.horseIds === null || data.horseId === null) {
            // Explicitly clearing horses - not allowed
            throw new Error("HORSES_REQUIRED");
          } else {
            // Keep existing horses
            if (reservation.horseIds && reservation.horseIds.length > 0) {
              horseIds = reservation.horseIds;
              horseNames = reservation.horseNames || [];
            } else if (reservation.horseId) {
              horseIds = [reservation.horseId];
              horseNames = reservation.horseName ? [reservation.horseName] : [];
            }
          }

          // Validate horse count
          if (horseIds && horseIds.length === 0) {
            throw new Error("HORSES_REQUIRED");
          }

          if (horseIds && horseIds.length > facility.maxHorsesPerReservation) {
            throw new Error("TOO_MANY_HORSES");
          }

          // 2. If time/facility/horses are changing, validate capacity
          const startTime = data.startTime
            ? Timestamp.fromDate(new Date(data.startTime))
            : reservation.startTime;
          const endTime = data.endTime
            ? Timestamp.fromDate(new Date(data.endTime))
            : reservation.endTime;
          const horseCount = horseIds
            ? horseIds.length
            : reservation.horseIds
              ? reservation.horseIds.length
              : reservation.horseId
                ? 1
                : 0;

          // Validate capacity outside transaction (uses its own queries)
          // Note: We pass the reservation ID to exclude it from capacity check
          const capacityPromise = validateFacilityCapacity(
            facilityId,
            {
              startTime,
              endTime,
              horseCount,
            },
            facility.maxHorsesPerReservation,
            id, // Exclude current reservation from check
          );

          // Wait for capacity validation
          const capacityResult = await capacityPromise;
          if (!capacityResult.valid) {
            throw new Error("CAPACITY_EXCEEDED");
          }

          // 3. Build updates
          const updates: any = {
            updatedAt: FieldValue.serverTimestamp(),
            lastModifiedBy: user.uid,
          };

          if (data.facilityId !== undefined)
            updates.facilityId = data.facilityId;
          if (data.startTime !== undefined)
            updates.startTime = Timestamp.fromDate(new Date(data.startTime));
          if (data.endTime !== undefined)
            updates.endTime = Timestamp.fromDate(new Date(data.endTime));
          if (data.purpose !== undefined)
            updates.purpose = sanitizeUserInput(data.purpose, 200);
          if (data.notes !== undefined)
            updates.notes = sanitizeUserInput(data.notes, 500);
          if (data.status !== undefined) updates.status = data.status;

          // Add horse data if changed
          if (
            horseIds &&
            (data.horseIds !== undefined || data.horseId !== undefined)
          ) {
            if (horseIds.length === 1) {
              // Single horse - include both formats
              updates.horseId = horseIds[0] || null;
              updates.horseName =
                horseNames && horseNames.length > 0 ? horseNames[0] : null;
              updates.horseIds = horseIds;
              updates.horseNames = horseNames;
            } else if (horseIds.length > 1) {
              // Multiple horses - only use array format
              updates.horseIds = horseIds;
              updates.horseNames = horseNames;
              // Clear legacy fields
              updates.horseId = FieldValue.delete();
              updates.horseName = FieldValue.delete();
            }
          }

          // 4. Update within transaction (atomic)
          transaction.update(reservationRef, updates);

          return { id, ...reservation, ...updates };
        });

        return serializeTimestamps(result);
      } catch (error: any) {
        if (error.message === "CONFLICT_DETECTED") {
          return reply.status(409).send({
            error: "CONFLICT",
            message: "Time slot no longer available",
          });
        }
        if (error.message === "RESERVATION_NOT_FOUND") {
          return reply.status(404).send({
            error: "Not Found",
            message: "Reservation not found",
          });
        }
        if (error.message === "FACILITY_NOT_FOUND") {
          return reply.status(404).send({
            error: "Not Found",
            message: "Facility not found",
          });
        }
        if (error.message === "HORSES_REQUIRED") {
          return reply.status(400).send({
            error: "Bad Request",
            message: "At least one horse must be selected for the reservation",
          });
        }
        if (error.message === "TOO_MANY_HORSES") {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Too many horses selected for this facility",
          });
        }
        if (error.message === "CAPACITY_EXCEEDED") {
          return reply.status(409).send({
            error: "Capacity Exceeded",
            message: "Facility capacity would be exceeded with this change",
          });
        }
        request.log.error({ error }, "Failed to update reservation");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update reservation",
        });
      }
    },
  );

  /**
   * POST /api/v1/facility-reservations/:id/cancel
   * Cancel a reservation
   */
  fastify.post(
    "/:id/cancel",
    {
      preHandler: [authenticate, checkReservationOwnership],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        // Get existing reservation
        const docRef = db.collection("facilityReservations").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Reservation not found",
          });
        }

        const reservation = doc.data()!;

        // Check access (own reservation or stable management)
        if (reservation.userId !== user.uid) {
          const hasAccess = await hasStableAccess(
            reservation.stableId,
            user.uid,
            user.role,
          );
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to cancel this reservation",
            });
          }
        }

        // Update status to cancelled
        await docRef.update({
          status: "cancelled",
          updatedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        });

        return { success: true, id };
      } catch (error) {
        request.log.error({ error }, "Failed to cancel reservation");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to cancel reservation",
        });
      }
    },
  );

  /**
   * POST /api/v1/facility-reservations/:id/approve
   * Approve a pending reservation
   */
  fastify.post(
    "/:id/approve",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        // Get existing reservation
        const docRef = db.collection("facilityReservations").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Reservation not found",
          });
        }

        const reservation = doc.data()!;

        // Check stable management access
        const hasAccess = await hasStableAccess(
          reservation.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You do not have permission to approve reservations for this stable",
          });
        }

        const previousStatus = reservation.status;

        // Update status to confirmed
        await docRef.update({
          status: "confirmed",
          updatedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        });

        // Log status change (non-blocking)
        logReservationStatusChange(
          id,
          reservation.facilityId,
          reservation.facilityName,
          previousStatus === "confirmed" ? "approved" : "pending",
          "approved",
          user.uid,
          user.displayName || "Unknown",
          user.email || "",
          data.reviewNotes,
          reservation.stableId,
        ).catch((err) => {
          request.log.error({ err }, "Audit log failed");
        });

        return { success: true, id };
      } catch (error) {
        request.log.error({ error }, "Failed to approve reservation");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to approve reservation",
        });
      }
    },
  );

  /**
   * POST /api/v1/facility-reservations/:id/reject
   * Reject a pending reservation
   */
  fastify.post(
    "/:id/reject",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        // Get existing reservation
        const docRef = db.collection("facilityReservations").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Reservation not found",
          });
        }

        const reservation = doc.data()!;

        // Check stable management access
        const hasAccess = await hasStableAccess(
          reservation.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You do not have permission to reject reservations for this stable",
          });
        }

        const previousStatus = reservation.status;

        // Update status to rejected
        await docRef.update({
          status: "rejected",
          updatedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        });

        // Log status change (non-blocking)
        logReservationStatusChange(
          id,
          reservation.facilityId,
          reservation.facilityName,
          previousStatus === "rejected" ? "rejected" : "pending",
          "rejected",
          user.uid,
          user.displayName || "Unknown",
          user.email || "",
          data.reviewNotes,
          reservation.stableId,
        ).catch((err) => {
          request.log.error({ err }, "Audit log failed");
        });

        return { success: true, id };
      } catch (error) {
        request.log.error({ error }, "Failed to reject reservation");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to reject reservation",
        });
      }
    },
  );

  /**
   * GET /api/v1/facility-reservations/analytics
   * Get aggregated analytics for facility reservations
   * Requires stable owner role
   */
  fastify.get(
    "/analytics",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const query = request.query as any;

        const stableId = query.stableId as string | undefined;
        const MAX_DATE_RANGE_DAYS = 365; // 1 year maximum

        if (!stableId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "stableId query parameter is required",
          });
        }

        // Parse and validate dates
        const startDate = query.startDate
          ? new Date(query.startDate as string)
          : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
        const endDate = query.endDate
          ? new Date(query.endDate as string)
          : new Date(); // Default: now

        // Validate date formats
        if (isNaN(startDate.getTime())) {
          return reply.status(400).send({
            error: "Bad Request",
            message:
              "Invalid startDate format. Use ISO 8601 format (YYYY-MM-DD)",
          });
        }

        if (isNaN(endDate.getTime())) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid endDate format. Use ISO 8601 format (YYYY-MM-DD)",
          });
        }

        // Validate date range logic
        if (startDate > endDate) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "startDate must be before endDate",
          });
        }

        // Validate date range size
        const daysDiff =
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff > MAX_DATE_RANGE_DAYS) {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days`,
          });
        }

        // Check stable permission using Permission V2
        const hasAccess = await hasStablePermission(
          user.uid,
          stableId,
          "view_financial_reports", // Analytics viewing requires financial reports permission
          { systemRole: user.role },
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You do not have permission to view analytics for this stable",
          });
        }

        // Query reservations within date range
        const reservationsSnapshot = await db
          .collection("facilityReservations")
          .where("stableId", "==", stableId)
          .where("startTime", ">=", Timestamp.fromDate(startDate))
          .where("startTime", "<=", Timestamp.fromDate(endDate))
          .get();

        const reservations = reservationsSnapshot.docs.map((doc) => doc.data());

        // Calculate metrics
        const totalBookings = reservations.length;
        const confirmedBookings = reservations.filter(
          (r) => r.status === "confirmed",
        ).length;
        const completedBookings = reservations.filter(
          (r) => r.status === "completed",
        ).length;
        const cancelledBookings = reservations.filter(
          (r) => r.status === "cancelled",
        ).length;
        const noShows = reservations.filter(
          (r) => r.status === "no_show",
        ).length;

        // Calculate utilization by facility
        const facilityUtilization = new Map<
          string,
          {
            facilityId: string;
            facilityName: string;
            bookings: number;
            bookedHours: number;
          }
        >();

        reservations.forEach((r) => {
          const existing = facilityUtilization.get(r.facilityId) || {
            facilityId: r.facilityId,
            facilityName: r.facilityName,
            bookings: 0,
            bookedHours: 0,
          };

          existing.bookings++;

          // Calculate duration in hours
          if (r.startTime && r.endTime) {
            const startMs = r.startTime.toMillis();
            const endMs = r.endTime.toMillis();
            const hours = (endMs - startMs) / (1000 * 60 * 60);
            existing.bookedHours += hours;
          }

          facilityUtilization.set(r.facilityId, existing);
        });

        // Calculate peak hours (hour of day with most bookings)
        const hourCounts = new Map<number, number>();
        reservations.forEach((r) => {
          if (r.startTime) {
            const hour = r.startTime.toDate().getHours();
            hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
          }
        });

        const peakHourEntry = Array.from(hourCounts.entries()).sort(
          (a, b) => b[1] - a[1],
        )[0];
        const peakHour = peakHourEntry ? peakHourEntry[0] : null;

        // Calculate top users
        const userBookings = new Map<
          string,
          {
            userId: string;
            userEmail: string;
            userName?: string;
            bookingCount: number;
          }
        >();

        reservations.forEach((r) => {
          const existing = userBookings.get(r.userId) || {
            userId: r.userId,
            userEmail: r.userEmail,
            userName: r.userFullName,
            bookingCount: 0,
          };

          existing.bookingCount++;
          userBookings.set(r.userId, existing);
        });

        const topUsers = Array.from(userBookings.values())
          .sort((a, b) => b.bookingCount - a.bookingCount)
          .slice(0, 10);

        // Calculate average duration
        let totalMinutes = 0;
        let validDurations = 0;
        reservations.forEach((r) => {
          if (r.startTime && r.endTime) {
            const startMs = r.startTime.toMillis();
            const endMs = r.endTime.toMillis();
            const minutes = (endMs - startMs) / (1000 * 60);
            totalMinutes += minutes;
            validDurations++;
          }
        });

        const averageDuration =
          validDurations > 0 ? Math.round(totalMinutes / validDurations) : 0;

        // Calculate no-show rate
        const completableBookings = completedBookings + noShows;
        const noShowRate =
          completableBookings > 0 ? (noShows / completableBookings) * 100 : 0;

        return reply.send({
          metrics: {
            totalBookings,
            confirmedBookings,
            completedBookings,
            cancelledBookings,
            noShows,
            averageDuration,
            noShowRate: Math.round(noShowRate * 10) / 10,
            peakHour,
          },
          facilityUtilization: Array.from(facilityUtilization.values()),
          topUsers,
          dateRange: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        });
      } catch (error) {
        request.log.error({ error }, "Failed to get analytics");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to get analytics",
        });
      }
    },
  );

  /**
   * DELETE /api/v1/facility-reservations/:id
   * Delete a reservation
   */
  fastify.delete(
    "/:id",
    {
      preHandler: [authenticate, checkReservationOwnership],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        // Get existing reservation
        const docRef = db.collection("facilityReservations").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Reservation not found",
          });
        }

        const reservation = doc.data()!;

        // Check access (own reservation or stable management)
        if (reservation.userId !== user.uid) {
          const hasAccess = await hasStableAccess(
            reservation.stableId,
            user.uid,
            user.role,
          );
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to delete this reservation",
            });
          }
        }

        await docRef.delete();

        return { success: true, id };
      } catch (error) {
        request.log.error({ error }, "Failed to delete reservation");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete reservation",
        });
      }
    },
  );
}
