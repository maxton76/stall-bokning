/**
 * Booking Validation Utilities
 * Validates facility reservations for conflicts, business hours, and quotas
 */

import {
  format,
  differenceInMinutes,
  isWithinInterval,
  parseISO,
} from "date-fns";
import type { Facility } from "@/types/facility";
import type { FacilityReservation } from "@/types/facilityReservation";
import {
  getEffectiveTimeBlocks,
  createDefaultSchedule,
  isTimeRangeAvailable,
  type TimeBlock,
} from "@equiduty/shared";
import { roundToMinute } from "@equiduty/shared/utils/dateUtils";
import { parseTime } from "@equiduty/shared/utils/timeValidation";
import { toDate } from "./timestampUtils";
import { getHorseCount } from "./reservationHelpers";
import { CALENDAR_DEFAULTS } from "@/components/calendar/constants";

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

export interface ValidateBookingMoveParams {
  reservation: FacilityReservation;
  targetFacility: Facility;
  newStart: Date;
  newEnd: Date;
  existingReservations: FacilityReservation[];
  userId?: string;
}

/**
 * Validate moving a booking to a new facility/time
 */
export async function validateBookingMove({
  reservation,
  targetFacility,
  newStart,
  newEnd,
  existingReservations,
  userId,
}: ValidateBookingMoveParams): Promise<ValidationResult> {
  const warnings: string[] = [];

  // 1. Check business hours
  const businessHoursResult = validateBusinessHours(
    targetFacility,
    newStart,
    newEnd,
  );
  if (!businessHoursResult.valid) {
    return businessHoursResult;
  }

  // 2. Check for conflicts
  const conflictResult = validateNoConflicts(
    targetFacility.id,
    newStart,
    newEnd,
    existingReservations,
    reservation.id,
  );
  if (!conflictResult.valid) {
    return conflictResult;
  }

  // 3. Check minimum slot duration (consistent boundary operators)
  const duration = differenceInMinutes(newEnd, newStart);

  if (
    targetFacility.minTimeSlotDuration &&
    duration < targetFacility.minTimeSlotDuration
  ) {
    return {
      valid: false,
      error: `Minimum booking duration is ${targetFacility.minTimeSlotDuration} minutes`,
    };
  }

  // 4. Check maximum hours per reservation (consistent boundary operators)
  if (targetFacility.maxHoursPerReservation) {
    const hours = duration / 60;
    if (hours > targetFacility.maxHoursPerReservation) {
      return {
        valid: false,
        error: `Maximum booking duration is ${targetFacility.maxHoursPerReservation} hours`,
      };
    }
  }

  // 5. Check equipment compatibility (if needed in future)
  // Note: requiredEquipment field can be added to Facility type if needed
  // if (targetFacility.requiredEquipment?.length && reservation.horseId) {
  //   warnings.push(
  //     "Please verify horse has required equipment for this facility"
  //   );
  // }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate business hours for a facility
 */
export function validateBusinessHours(
  facility: Facility,
  start: Date,
  end: Date,
): ValidationResult {
  const schedule = facility.availabilitySchedule || createDefaultSchedule();
  const effectiveBlocks = getEffectiveTimeBlocks(schedule, start);

  const startTime = format(start, "HH:mm");
  const endTime = format(end, "HH:mm");

  if (!isTimeRangeAvailable(effectiveBlocks, startTime, endTime)) {
    return {
      valid: false,
      error: `Selected time (${startTime}-${endTime}) is outside facility business hours`,
    };
  }

  return { valid: true };
}

/**
 * Check if time range conflicts with existing bookings
 */
export function validateNoConflicts(
  facilityId: string,
  start: Date,
  end: Date,
  reservations: FacilityReservation[],
  excludeId?: string,
): ValidationResult {
  const conflicts = findConflicts(
    facilityId,
    start,
    end,
    reservations,
    excludeId,
  );

  if (conflicts.length > 0) {
    // Security fix: Don't expose exact conflict times (information disclosure)
    return {
      valid: false,
      error: `Time slot conflicts with ${conflicts.length} existing booking${conflicts.length > 1 ? "s" : ""}`,
    };
  }

  return { valid: true };
}

/**
 * Find conflicting reservations (with time precision handling)
 */
export function findConflicts(
  facilityId: string,
  start: Date,
  end: Date,
  reservations: FacilityReservation[],
  excludeId?: string,
): FacilityReservation[] {
  // Round to minute precision to prevent millisecond comparison issues
  const startRounded = roundToMinute(start);
  const endRounded = roundToMinute(end);

  return reservations.filter((reservation) => {
    // Skip if same reservation
    if (excludeId && reservation.id === excludeId) return false;

    // Skip if different facility
    if (reservation.facilityId !== facilityId) return false;

    // Skip cancelled reservations
    if (reservation.status === "cancelled") return false;

    const rStart = toDate(reservation.startTime);
    const rEnd = toDate(reservation.endTime);

    if (!rStart || !rEnd) return false;

    // Round reservation times to minute precision
    const rStartRounded = roundToMinute(rStart);
    const rEndRounded = roundToMinute(rEnd);

    // Check for overlap with boundary collision
    // Use >= and <= for proper boundary detection
    return startRounded < rEndRounded && endRounded > rStartRounded;
  });
}

/**
 * Calculate quota usage for a user
 * Returns quota information if available
 */
export async function checkUserQuota(
  userId: string,
  facilityId: string,
  startTime: Date,
  reservations: FacilityReservation[],
): Promise<{ hasQuota: boolean; remaining?: number; total?: number }> {
  // TODO: Implement quota system when business rules are defined
  // For now, return unlimited quota
  return {
    hasQuota: true,
  };
}

/**
 * Validate a new booking creation
 */
export function validateNewBooking(
  facility: Facility,
  start: Date,
  end: Date,
  existingReservations: FacilityReservation[],
): ValidationResult {
  // Check business hours
  const businessHoursResult = validateBusinessHours(facility, start, end);
  if (!businessHoursResult.valid) {
    return businessHoursResult;
  }

  // Check for conflicts
  const conflictResult = validateNoConflicts(
    facility.id,
    start,
    end,
    existingReservations,
  );
  if (!conflictResult.valid) {
    return conflictResult;
  }

  // Check minimum duration
  if (facility.minTimeSlotDuration) {
    const duration = differenceInMinutes(end, start);
    if (duration < facility.minTimeSlotDuration) {
      return {
        valid: false,
        error: `Minimum booking duration is ${facility.minTimeSlotDuration} minutes`,
      };
    }
  }

  // Check maximum duration
  if (facility.maxHoursPerReservation) {
    const hours = differenceInMinutes(end, start) / 60;
    if (hours > facility.maxHoursPerReservation) {
      return {
        valid: false,
        error: `Maximum booking duration is ${facility.maxHoursPerReservation} hours`,
      };
    }
  }

  return { valid: true };
}

/**
 * Get available time slots for a facility on a given date
 */
export function getAvailableTimeSlots(
  facility: Facility,
  date: Date,
  existingReservations: FacilityReservation[],
  slotDuration: number = CALENDAR_DEFAULTS.SLOT_DURATION_MINUTES,
): { start: Date; end: Date }[] {
  const schedule = facility.availabilitySchedule || createDefaultSchedule();
  const effectiveBlocks = getEffectiveTimeBlocks(schedule, date);

  const availableSlots: { start: Date; end: Date }[] = [];

  effectiveBlocks.forEach((block) => {
    // Use safe time parsing with validation
    const parsedStart = parseTime(block.from);
    const parsedEnd = parseTime(block.to);

    if (!parsedStart || !parsedEnd) {
      console.error(
        `Invalid time format in block: ${block.from} - ${block.to}`,
      );
      return; // Skip invalid blocks
    }

    const blockStart = new Date(date);
    blockStart.setHours(parsedStart.hour, parsedStart.minute, 0, 0);

    const blockEnd = new Date(date);
    blockEnd.setHours(parsedEnd.hour, parsedEnd.minute, 0, 0);

    // Generate slots within this time block
    let currentSlotStart = new Date(blockStart);

    while (currentSlotStart < blockEnd) {
      const currentSlotEnd = new Date(currentSlotStart);
      currentSlotEnd.setMinutes(currentSlotEnd.getMinutes() + slotDuration);

      // Check if this slot is available (no conflicts)
      const conflicts = findConflicts(
        facility.id,
        currentSlotStart,
        currentSlotEnd,
        existingReservations,
      );

      if (conflicts.length === 0 && currentSlotEnd <= blockEnd) {
        availableSlots.push({
          start: new Date(currentSlotStart),
          end: new Date(currentSlotEnd),
        });
      }

      // Move to next slot
      currentSlotStart = new Date(currentSlotEnd);
    }
  });

  return availableSlots;
}

export interface CapacityInfo {
  peakExistingHorses: number;
  remainingCapacity: number;
}

/**
 * Calculate peak concurrent horses during a time window using timeline sweep.
 * Uses the same algorithm as the backend to ensure consistent validation.
 */
export function calculatePeakConcurrentHorses(
  conflicts: FacilityReservation[],
  maxCapacity: number,
): CapacityInfo {
  if (conflicts.length === 0) {
    return { peakExistingHorses: 0, remainingCapacity: maxCapacity };
  }

  // Build START/END events from each conflict
  const events: Array<{ time: number; delta: number }> = [];

  for (const conflict of conflicts) {
    const start = toDate(conflict.startTime);
    const end = toDate(conflict.endTime);
    if (!start || !end) continue;

    const horseCount = getHorseCount(conflict);
    if (horseCount === 0) continue;

    events.push({ time: start.getTime(), delta: horseCount });
    events.push({ time: end.getTime(), delta: -horseCount });
  }

  // Sort: by time ascending, START (+delta) before END (-delta) at same time
  events.sort((a, b) => a.time - b.time || b.delta - a.delta);

  // Sweep to find peak
  let current = 0;
  let peak = 0;
  for (const event of events) {
    current += event.delta;
    if (current > peak) {
      peak = current;
    }
  }

  return {
    peakExistingHorses: peak,
    remainingCapacity: Math.max(0, maxCapacity - peak),
  };
}
