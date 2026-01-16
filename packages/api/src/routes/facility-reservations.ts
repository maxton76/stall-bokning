import type { FastifyInstance } from "fastify";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { QueryDocumentSnapshot } from "firebase-admin/firestore";
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

        // Create reservation with denormalized data
        const reservationData = {
          facilityId: data.facilityId,
          facilityName: data.facilityName || facility.name,
          facilityType: data.facilityType || facility.type,
          stableId: data.stableId || facility.stableId,
          stableName: data.stableName || null,
          userId: data.userId || user.uid,
          userEmail: data.userEmail || user.email,
          userFullName: data.userFullName || user.displayName || null,
          horseId: data.horseId || null,
          horseName: data.horseName || null,
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
          query = query.where(
            "startTime",
            "<=",
            Timestamp.fromDate(new Date(endDate)),
          );
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
   * Update a reservation
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
              message: "You do not have permission to update this reservation",
            });
          }
        }

        // Update reservation
        const updates: any = {
          updatedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        };

        if (data.startTime !== undefined)
          updates.startTime = Timestamp.fromDate(new Date(data.startTime));
        if (data.endTime !== undefined)
          updates.endTime = Timestamp.fromDate(new Date(data.endTime));
        if (data.purpose !== undefined) updates.purpose = data.purpose;
        if (data.notes !== undefined) updates.notes = data.notes;
        if (data.status !== undefined) updates.status = data.status;

        await docRef.update(updates);

        return { id, ...serializeTimestamps({ ...reservation, ...updates }) };
      } catch (error) {
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
      preHandler: [authenticate],
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
   * DELETE /api/v1/facility-reservations/:id
   * Delete a reservation
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
