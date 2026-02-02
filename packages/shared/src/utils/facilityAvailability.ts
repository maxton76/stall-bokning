/**
 * Facility Availability Utilities
 *
 * Pure functions for resolving effective time blocks,
 * checking availability, and validating schedule data.
 * Shared between API and frontend.
 */

import type {
  TimeBlock,
  DayOfWeek,
  FacilityAvailabilitySchedule,
  ScheduleException,
} from "../types/facilitySchedule.js";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const DAY_INDEX_MAP: Record<number, DayOfWeek> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

/**
 * Convert "HH:mm" string to minutes since midnight.
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h! * 60 + m!;
}

/**
 * Format a date as "YYYY-MM-DD" using the date's local timezone components.
 *
 * **Timezone note:** This uses `getFullYear()`, `getMonth()`, and `getDate()`
 * which resolve in the runtime's local timezone. Callers must ensure the Date
 * object represents the facility's local date. The API constructs dates from
 * `YYYY-MM-DD` strings via `new Date(date + "T00:00:00")` which produces a
 * local-timezone Date — this is the correct pattern.
 */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Get the DayOfWeek for a given Date using the runtime's local timezone.
 *
 * **Timezone note:** Uses `getDay()` which resolves in the local timezone.
 * See `formatDateKey` for the expected Date construction pattern.
 */
export function getFacilityDayOfWeek(date: Date): DayOfWeek {
  return DAY_INDEX_MAP[date.getDay()]!;
}

/**
 * Resolve effective time blocks for a specific date.
 *
 * Resolution priority: Exception > Day Override > Default
 *
 * Returns empty array if the facility is closed on that date.
 */
export function getEffectiveTimeBlocks(
  schedule: FacilityAvailabilitySchedule,
  date: Date,
): TimeBlock[] {
  const dateKey = formatDateKey(date);

  // 1. Check for date-specific exception
  const exception = schedule.exceptions.find((e) => e.date === dateKey);
  if (exception) {
    if (exception.type === "closed") return [];
    return exception.timeBlocks;
  }

  // 2. Check day-of-week schedule
  const dayOfWeek = getFacilityDayOfWeek(date);
  const daySchedule = schedule.weeklySchedule.days[dayOfWeek];

  if (!daySchedule.available) return [];

  // 3. Day override has custom blocks → use them
  if (daySchedule.timeBlocks.length > 0) {
    return daySchedule.timeBlocks;
  }

  // 4. Fall back to default blocks
  return schedule.weeklySchedule.defaultTimeBlocks;
}

/**
 * Check if a given time range (HH:mm) fits entirely within any of the
 * provided time blocks.
 */
export function isTimeRangeAvailable(
  blocks: TimeBlock[],
  startTime: string,
  endTime: string,
): boolean {
  if (blocks.length === 0) return false;

  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);

  if (endMin <= startMin) return false;

  return blocks.some((block) => {
    const blockStart = timeToMinutes(block.from);
    const blockEnd = timeToMinutes(block.to);
    return startMin >= blockStart && endMin <= blockEnd;
  });
}

/**
 * Validate an array of time blocks:
 * - Valid HH:mm format
 * - from < to
 * - No overlapping blocks
 * - Max `maxBlocks` entries
 *
 * Returns an array of error message keys (empty = valid).
 */
export function validateTimeBlocks(
  blocks: TimeBlock[],
  maxBlocks: number = 5,
): string[] {
  const errors: string[] = [];

  if (blocks.length > maxBlocks) {
    errors.push("schedule.validation.tooManyBlocks");
    return errors;
  }

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!;

    if (!TIME_REGEX.test(block.from) || !TIME_REGEX.test(block.to)) {
      errors.push("schedule.validation.invalidTimeFormat");
      return errors;
    }

    if (timeToMinutes(block.from) >= timeToMinutes(block.to)) {
      errors.push("schedule.validation.fromBeforeTo");
      return errors;
    }
  }

  // Check for overlaps (sort by start, then check adjacent)
  const sorted = [...blocks].sort(
    (a, b) => timeToMinutes(a.from) - timeToMinutes(b.from),
  );

  for (let i = 1; i < sorted.length; i++) {
    if (timeToMinutes(sorted[i]!.from) < timeToMinutes(sorted[i - 1]!.to)) {
      errors.push("schedule.validation.overlappingBlocks");
      return errors;
    }
  }

  return errors;
}

/**
 * Validate a complete schedule.
 * Returns array of error message keys (empty = valid).
 */
export function validateSchedule(
  schedule: FacilityAvailabilitySchedule,
): string[] {
  const errors: string[] = [];

  // Must have at least one default block
  if (schedule.weeklySchedule.defaultTimeBlocks.length === 0) {
    errors.push("schedule.validation.defaultBlockRequired");
  }

  // Validate default blocks
  errors.push(...validateTimeBlocks(schedule.weeklySchedule.defaultTimeBlocks));

  // Must have at least one day available
  const days = Object.values(schedule.weeklySchedule.days);
  if (!days.some((d) => d.available)) {
    errors.push("schedule.validation.atLeastOneDay");
  }

  // Validate per-day override blocks
  for (const [day, daySchedule] of Object.entries(
    schedule.weeklySchedule.days,
  )) {
    if (daySchedule.timeBlocks.length > 0) {
      const dayErrors = validateTimeBlocks(daySchedule.timeBlocks);
      if (dayErrors.length > 0) {
        errors.push(...dayErrors.map((e) => `${day}: ${e}`));
      }
    }
  }

  // Validate exceptions
  if (schedule.exceptions.length > 365) {
    errors.push("schedule.validation.tooManyExceptions");
  }

  const exceptionDates = new Set<string>();
  for (const exception of schedule.exceptions) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(exception.date)) {
      errors.push("schedule.validation.invalidExceptionDate");
    }
    if (exceptionDates.has(exception.date)) {
      errors.push("schedule.validation.duplicateExceptionDate");
    }
    exceptionDates.add(exception.date);

    if (exception.type === "modified") {
      if (exception.timeBlocks.length === 0) {
        errors.push("schedule.validation.modifiedNeedsBlocks");
      }
      errors.push(...validateTimeBlocks(exception.timeBlocks));
    }

    if (exception.type === "closed" && exception.timeBlocks.length > 0) {
      errors.push("schedule.validation.closedNoBlocks");
    }
  }

  return errors;
}

/**
 * Migrate legacy facility availability fields to new schedule format.
 */
export function migrateLegacyAvailability(legacy: {
  availableFrom?: string;
  availableTo?: string;
  daysAvailable?: Record<string, boolean>;
}): FacilityAvailabilitySchedule {
  const defaultBlock: TimeBlock = {
    from: legacy.availableFrom || "08:00",
    to: legacy.availableTo || "20:00",
  };

  const allDays: DayOfWeek[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  const days = {} as Record<
    DayOfWeek,
    { available: boolean; timeBlocks: TimeBlock[] }
  >;
  for (const day of allDays) {
    const isAvailable = legacy.daysAvailable?.[day] ?? true;
    days[day] = { available: isAvailable, timeBlocks: [] };
  }

  return {
    weeklySchedule: {
      defaultTimeBlocks: [defaultBlock],
      days,
    },
    exceptions: [],
  };
}
