/**
 * Server-Side Reservation Validation Middleware
 * Prevents client-side validation bypass attacks
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../utils/firebase.js";
import {
  getEffectiveTimeBlocks,
  isTimeRangeAvailable,
  createDefaultSchedule,
  type FacilityAvailabilitySchedule,
} from "@equiduty/shared";
import { Timestamp } from "firebase-admin/firestore";
import { format, differenceInMinutes } from "date-fns";

/**
 * Sanitize user input to prevent XSS and length overflow
 */
export function sanitizeUserInput(
  input: string | null | undefined,
  maxLength: number = 100,
): string {
  if (!input) return "";
  return input.trim().substring(0, maxLength).replace(/[<>]/g, "");
}

/**
 * Find conflicting reservations in a transaction-safe manner
 */
export async function findConflicts(
  facilityId: string,
  startTime: Timestamp,
  endTime: Timestamp,
  excludeReservationId?: string,
): Promise<any[]> {
  const snapshot = await db
    .collection("facilityReservations")
    .where("facilityId", "==", facilityId)
    .where("status", "in", ["pending", "confirmed"])
    .where("startTime", "<", endTime)
    .where("endTime", ">", startTime)
    .get();

  return snapshot.docs
    .filter((doc) => !excludeReservationId || doc.id !== excludeReservationId)
    .map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Middleware: Validate reservation update
 * Must be used BEFORE any reservation mutation operations
 */
export async function validateReservationUpdate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params as { id: string };
    const data = request.body as any;

    // Get existing reservation
    const reservationDoc = await db
      .collection("facilityReservations")
      .doc(id)
      .get();

    if (!reservationDoc.exists) {
      return reply.status(404).send({
        error: "Not Found",
        message: "Reservation not found",
      });
    }

    const reservation = reservationDoc.data()!;

    // Only validate if time/facility is changing
    if (!data.startTime && !data.endTime && !data.facilityId) {
      // Non-time update (status, notes, etc.) - skip validation
      return;
    }

    // Use existing values if not provided
    const facilityId = data.facilityId || reservation.facilityId;
    const startTime = data.startTime
      ? Timestamp.fromDate(new Date(data.startTime))
      : reservation.startTime;
    const endTime = data.endTime
      ? Timestamp.fromDate(new Date(data.endTime))
      : reservation.endTime;

    // Get facility
    const facilityDoc = await db.collection("facilities").doc(facilityId).get();
    if (!facilityDoc.exists) {
      return reply.status(404).send({
        error: "Not Found",
        message: "Facility not found",
      });
    }

    const facility = facilityDoc.data()!;

    // 1. Validate business hours (server-side)
    const schedule: FacilityAvailabilitySchedule =
      facility.availabilitySchedule || createDefaultSchedule();
    const effectiveBlocks = getEffectiveTimeBlocks(
      schedule,
      startTime.toDate(),
    );

    const startTimeStr = format(startTime.toDate(), "HH:mm");
    const endTimeStr = format(endTime.toDate(), "HH:mm");

    // Check if facility is closed on this date
    const isClosed = effectiveBlocks.length === 0;
    const withinAvailability =
      !isClosed &&
      isTimeRangeAvailable(effectiveBlocks, startTimeStr, endTimeStr);

    if (isClosed || !withinAvailability) {
      // Allow admin override
      if (data.adminOverride !== true) {
        const message = isClosed
          ? "Facility is closed on this date"
          : "Selected time is outside facility business hours";

        return reply.status(400).send({
          error: "OUTSIDE_BUSINESS_HOURS",
          message,
        });
      }
    }

    // 2. Check for conflicts (server-side)
    const conflicts = await findConflicts(facilityId, startTime, endTime, id);
    if (conflicts.length > 0) {
      return reply.status(409).send({
        error: "CONFLICT_DETECTED",
        message: `Time slot conflicts with ${conflicts.length} existing booking${conflicts.length > 1 ? "s" : ""}`,
        conflictCount: conflicts.length, // Don't expose specific times
      });
    }

    // 3. Validate duration constraints
    const duration = differenceInMinutes(endTime.toDate(), startTime.toDate());

    if (
      facility.minTimeSlotDuration &&
      duration < facility.minTimeSlotDuration
    ) {
      return reply.status(400).send({
        error: "DURATION_TOO_SHORT",
        message: `Minimum booking duration is ${facility.minTimeSlotDuration} minutes`,
      });
    }

    if (facility.maxHoursPerReservation) {
      const hours = duration / 60;
      if (hours > facility.maxHoursPerReservation) {
        return reply.status(400).send({
          error: "DURATION_TOO_LONG",
          message: `Maximum booking duration is ${facility.maxHoursPerReservation} hours`,
        });
      }
    }

    // 4. Sanitize user-facing fields
    if (data.userFullName) {
      data.userFullName = sanitizeUserInput(data.userFullName, 100);
    }
    if (data.notes) {
      data.notes = sanitizeUserInput(data.notes, 500);
    }
    if (data.purpose) {
      data.purpose = sanitizeUserInput(data.purpose, 200);
    }

    // Validation passed - attach validated data to request
    (request as any).validatedReservation = {
      facility: facility,
      facilityId: facilityId,
      startTime: startTime,
      endTime: endTime,
    };
  } catch (error) {
    request.log.error({ error }, "Validation error");
    return reply.status(500).send({
      error: "Internal Server Error",
      message: "Failed to validate reservation",
    });
  }
}
