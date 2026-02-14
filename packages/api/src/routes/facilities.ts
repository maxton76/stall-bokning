import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import { checkSubscriptionLimit } from "../middleware/checkSubscriptionLimit.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { serializeTimestamps } from "../utils/serialization.js";
import { hasStablePermission } from "../utils/permissionEngine.js";
import { canAccessStable } from "../utils/authorization.js";
import {
  createDefaultSchedule,
  validateSchedule,
  validateTimeBlocks,
  getEffectiveTimeBlocks,
  type FacilityAvailabilitySchedule,
  type ScheduleException,
} from "../utils/facilityAvailability.js";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VALID_EXCEPTION_TYPES = ["closed", "modified"] as const;

function isValidDate(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const d = new Date(dateStr + "T00:00:00");
  return !isNaN(d.getTime());
}

export async function facilitiesRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v1/facilities
   * Create a new facility
   */
  fastify.post(
    "/",
    {
      preHandler: [
        authenticate,
        checkSubscriptionLimit("facilities", "facilities"),
      ],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        // Validate required fields
        if (!data.stableId || !data.name || !data.type) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Missing required fields: stableId, name, type",
          });
        }

        // Check permission to manage facilities
        const hasPermission = await hasStablePermission(
          user.uid,
          data.stableId,
          "manage_facilities",
          { systemRole: user.role },
        );
        if (!hasPermission) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You do not have permission to create facilities for this stable",
          });
        }

        // Build availability schedule (use provided or create default)
        const availabilitySchedule: FacilityAvailabilitySchedule =
          data.availabilitySchedule || createDefaultSchedule();

        // Validate schedule
        const scheduleErrors = validateSchedule(availabilitySchedule);
        if (scheduleErrors.length > 0) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid availability schedule",
            details: scheduleErrors,
          });
        }

        // Create facility
        const facilityData = {
          stableId: data.stableId,
          name: data.name,
          type: data.type,
          description: data.description || null,
          capacity: data.capacity || null,
          bookingRules: data.bookingRules || null,
          status: data.status || "active",
          // Booking rule fields (extracted for top-level access)
          planningWindowOpens: data.planningWindowOpens || 7,
          planningWindowCloses: data.planningWindowCloses || 1,
          maxHorsesPerReservation: data.maxHorsesPerReservation || 1,
          minTimeSlotDuration: data.minTimeSlotDuration || 30,
          maxHoursPerReservation: data.maxHoursPerReservation || null,
          // New schedule fields
          availabilitySchedule,
          // Legacy fields preserved for backward compatibility
          availableFrom:
            data.availableFrom ||
            availabilitySchedule.weeklySchedule.defaultTimeBlocks[0]?.from ||
            "08:00",
          availableTo:
            data.availableTo ||
            availabilitySchedule.weeklySchedule.defaultTimeBlocks[0]?.to ||
            "20:00",
          daysAvailable: data.daysAvailable || undefined,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: user.uid,
          lastModifiedBy: user.uid,
        };

        const docRef = await db.collection("facilities").add(facilityData);

        return { id: docRef.id, ...serializeTimestamps(facilityData) };
      } catch (error) {
        request.log.error({ error }, "Failed to create facility");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create facility",
        });
      }
    },
  );

  /**
   * GET /api/v1/facilities/:id
   * Get a facility by ID
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

        const doc = await db.collection("facilities").doc(id).get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Facility not found",
          });
        }

        const facility = doc.data()!;

        // Check stable access (read permission - any stable member can view facilities)
        const hasAccess = await canAccessStable(user.uid, facility.stableId);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this stable",
          });
        }

        return serializeTimestamps({ id: doc.id, ...facility });
      } catch (error) {
        request.log.error({ error }, "Failed to get facility");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to get facility",
        });
      }
    },
  );

  /**
   * GET /api/v1/facilities
   * Get facilities by stable (query param: stableId)
   * Optional: filter by status (query param: status)
   */
  fastify.get(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { stableId, status, reservableOnly } = request.query as {
          stableId?: string;
          status?: string;
          reservableOnly?: string; // "true" | "false" (query params are strings)
        };
        const user = (request as AuthenticatedRequest).user!;

        if (!stableId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Missing required query parameter: stableId",
          });
        }

        // Check stable access (read permission - any stable member can view facilities)
        const hasAccess = await canAccessStable(user.uid, stableId);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this stable",
          });
        }

        // Query facilities
        let query = db
          .collection("facilities")
          .where("stableId", "==", stableId);

        if (status) {
          query = query.where("status", "==", status);
        }

        // Filter for reservable (active) facilities only
        if (reservableOnly === "true") {
          query = query.where("status", "==", "active");
        }

        const snapshot = await query.get();

        const facilities = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { facilities };
      } catch (error) {
        request.log.error({ error }, "Failed to get facilities");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to get facilities",
        });
      }
    },
  );

  /**
   * PATCH /api/v1/facilities/:id
   * Update a facility
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

        // Get existing facility
        const docRef = db.collection("facilities").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Facility not found",
          });
        }

        const facility = doc.data()!;

        // Check permission to manage facilities
        const hasPermission = await hasStablePermission(
          user.uid,
          facility.stableId,
          "manage_facilities",
          { systemRole: user.role },
        );
        if (!hasPermission) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to update this facility",
          });
        }

        // Update facility
        const updates: any = {
          updatedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        };

        if (data.name !== undefined) updates.name = data.name;
        if (data.type !== undefined) updates.type = data.type;
        if (data.description !== undefined)
          updates.description = data.description;
        if (data.capacity !== undefined) updates.capacity = data.capacity;
        if (data.bookingRules !== undefined)
          updates.bookingRules = data.bookingRules;
        if (data.status !== undefined) updates.status = data.status;

        // Update booking rule fields if provided
        if (data.planningWindowOpens !== undefined)
          updates.planningWindowOpens = data.planningWindowOpens;
        if (data.planningWindowCloses !== undefined)
          updates.planningWindowCloses = data.planningWindowCloses;
        if (data.maxHorsesPerReservation !== undefined)
          updates.maxHorsesPerReservation = data.maxHorsesPerReservation;
        if (data.minTimeSlotDuration !== undefined)
          updates.minTimeSlotDuration = data.minTimeSlotDuration;
        if (data.maxHoursPerReservation !== undefined)
          updates.maxHoursPerReservation = data.maxHoursPerReservation;

        // Handle availability schedule update
        if (data.availabilitySchedule !== undefined) {
          const scheduleErrors = validateSchedule(data.availabilitySchedule);
          if (scheduleErrors.length > 0) {
            return reply.status(400).send({
              error: "Bad Request",
              message: "Invalid availability schedule",
              details: scheduleErrors,
            });
          }
          updates.availabilitySchedule = data.availabilitySchedule;
        }

        await docRef.update(updates);

        return { id, ...serializeTimestamps({ ...facility, ...updates }) };
      } catch (error) {
        request.log.error({ error }, "Failed to update facility");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update facility",
        });
      }
    },
  );

  /**
   * DELETE /api/v1/facilities/:id
   * Delete a facility (hard delete)
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

        // Get existing facility
        const docRef = db.collection("facilities").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Facility not found",
          });
        }

        const facility = doc.data()!;

        // Check permission to manage facilities
        const hasPermission = await hasStablePermission(
          user.uid,
          facility.stableId,
          "manage_facilities",
          { systemRole: user.role },
        );
        if (!hasPermission) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to delete this facility",
          });
        }

        await docRef.delete();

        return { success: true, id };
      } catch (error) {
        request.log.error({ error }, "Failed to delete facility");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete facility",
        });
      }
    },
  );

  /**
   * POST /api/v1/facilities/:id/exceptions
   * Add a schedule exception to a facility
   */
  fastify.post(
    "/:id/exceptions",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        // Validate required fields
        if (!data.date || !data.type) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Missing required fields: date, type",
          });
        }

        // Validate date format
        if (!isValidDate(data.date)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid date format. Expected YYYY-MM-DD.",
          });
        }

        // Validate exception type
        if (!VALID_EXCEPTION_TYPES.includes(data.type)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid exception type. Must be 'closed' or 'modified'.",
          });
        }

        // Validate timeBlocks for modified exceptions
        if (data.type === "modified") {
          if (!data.timeBlocks || data.timeBlocks.length === 0) {
            return reply.status(400).send({
              error: "Bad Request",
              message: "Modified exceptions require at least one time block",
            });
          }
          const blockErrors = validateTimeBlocks(data.timeBlocks);
          if (blockErrors.length > 0) {
            return reply.status(400).send({
              error: "Bad Request",
              message: "Invalid time blocks",
              details: blockErrors,
            });
          }
        }

        // Validate reason length
        if (
          data.reason &&
          typeof data.reason === "string" &&
          data.reason.length > 500
        ) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Reason must be 500 characters or fewer",
          });
        }

        // Auth check outside transaction (read-only)
        const preDoc = await db.collection("facilities").doc(id).get();
        if (!preDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Facility not found",
          });
        }

        const hasPermission = await hasStablePermission(
          user.uid,
          preDoc.data()!.stableId,
          "manage_facilities",
          { systemRole: user.role },
        );
        if (!hasPermission) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to manage schedule exceptions",
          });
        }

        // Use transaction for atomic read-modify-write
        const exception: ScheduleException = {
          date: data.date,
          type: data.type,
          timeBlocks: data.type === "closed" ? [] : data.timeBlocks || [],
          reason: data.reason || undefined,
          createdBy: user.uid,
          createdAt: new Date().toISOString(),
        };

        const result = await db.runTransaction(async (tx) => {
          const docRef = db.collection("facilities").doc(id);
          const doc = await tx.get(docRef);

          if (!doc.exists) {
            return { error: 404, message: "Facility not found" };
          }

          const facility = doc.data()!;
          const schedule: FacilityAvailabilitySchedule =
            facility.availabilitySchedule || createDefaultSchedule();

          if (
            schedule.exceptions.some(
              (e: ScheduleException) => e.date === data.date,
            )
          ) {
            return {
              error: 409,
              message: "An exception already exists for this date",
            };
          }

          if (schedule.exceptions.length >= 365) {
            return { error: 400, message: "Maximum of 365 exceptions allowed" };
          }

          schedule.exceptions.push(exception);

          tx.update(docRef, {
            availabilitySchedule: schedule,
            updatedAt: Timestamp.now(),
            lastModifiedBy: user.uid,
          });

          return { success: true };
        });

        if ("error" in result && result.error) {
          return reply.status(result.error).send({
            error:
              result.error === 409
                ? "Conflict"
                : result.error === 404
                  ? "Not Found"
                  : "Bad Request",
            message: result.message,
          });
        }

        return { success: true, exception };
      } catch (error) {
        request.log.error({ error }, "Failed to add schedule exception");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to add schedule exception",
        });
      }
    },
  );

  /**
   * DELETE /api/v1/facilities/:id/exceptions/:date
   * Remove a schedule exception
   */
  fastify.delete(
    "/:id/exceptions/:date",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id, date } = request.params as { id: string; date: string };
        const user = (request as AuthenticatedRequest).user!;

        // Auth check outside transaction (read-only)
        const preDoc = await db.collection("facilities").doc(id).get();
        if (!preDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Facility not found",
          });
        }

        const hasPermission = await hasStablePermission(
          user.uid,
          preDoc.data()!.stableId,
          "manage_facilities",
          { systemRole: user.role },
        );
        if (!hasPermission) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to manage schedule exceptions",
          });
        }

        // Use transaction for atomic read-modify-write
        const result = await db.runTransaction(async (tx) => {
          const docRef = db.collection("facilities").doc(id);
          const doc = await tx.get(docRef);

          if (!doc.exists) {
            return { error: 404, message: "Facility not found" };
          }

          const facility = doc.data()!;
          const schedule: FacilityAvailabilitySchedule =
            facility.availabilitySchedule || createDefaultSchedule();

          const idx = schedule.exceptions.findIndex(
            (e: ScheduleException) => e.date === date,
          );
          if (idx === -1) {
            return { error: 404, message: "No exception found for this date" };
          }

          schedule.exceptions.splice(idx, 1);

          tx.update(docRef, {
            availabilitySchedule: schedule,
            updatedAt: Timestamp.now(),
            lastModifiedBy: user.uid,
          });

          return { success: true };
        });

        if ("error" in result && result.error) {
          return reply.status(result.error).send({
            error: "Not Found",
            message: result.message,
          });
        }

        return { success: true };
      } catch (error) {
        request.log.error({ error }, "Failed to remove schedule exception");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to remove schedule exception",
        });
      }
    },
  );

  /**
   * GET /api/v1/facilities/:id/available-slots
   * Get effective time blocks for a specific date
   */
  fastify.get(
    "/:id/available-slots",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { date } = request.query as { date?: string };
        const user = (request as AuthenticatedRequest).user!;

        if (!date) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Missing required query parameter: date (YYYY-MM-DD)",
          });
        }

        if (!isValidDate(date)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid date format. Expected YYYY-MM-DD.",
          });
        }

        const doc = await db.collection("facilities").doc(id).get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Facility not found",
          });
        }

        const facility = doc.data()!;

        // Check stable access (read permission - any stable member can view available slots)
        const hasAccess = await canAccessStable(user.uid, facility.stableId);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this stable",
          });
        }

        const schedule: FacilityAvailabilitySchedule =
          facility.availabilitySchedule || createDefaultSchedule();

        const requestDate = new Date(date + "T00:00:00");
        const timeBlocks = getEffectiveTimeBlocks(schedule, requestDate);

        return { date, timeBlocks };
      } catch (error) {
        request.log.error({ error }, "Failed to get available slots");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to get available slots",
        });
      }
    },
  );
}
