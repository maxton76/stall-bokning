/**
 * Facility Availability Schedule Types
 *
 * Supports per-day overrides, multiple time blocks per day,
 * and date-specific exceptions (holidays, maintenance).
 */

/** A single time block within a day (HH:mm format) */
export interface TimeBlock {
  from: string; // "HH:mm"
  to: string; // "HH:mm"
}

/** Schedule for a specific day of the week */
export interface FacilityDaySchedule {
  /** Whether this day is available at all */
  available: boolean;
  /** Override time blocks for this day. Empty array = use default blocks */
  timeBlocks: TimeBlock[];
}

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

/** Weekly recurring schedule with default blocks and per-day overrides */
export interface WeeklySchedule {
  /** Default time blocks applied to all available days without overrides */
  defaultTimeBlocks: TimeBlock[];
  /** Per-day configuration */
  days: Record<DayOfWeek, FacilityDaySchedule>;
}

/** A date-specific schedule exception */
export interface ScheduleException {
  /** Date in "YYYY-MM-DD" format */
  date: string;
  /** 'closed' = facility closed, 'modified' = custom hours */
  type: "closed" | "modified";
  /** Time blocks for 'modified' exceptions; empty for 'closed' */
  timeBlocks: TimeBlock[];
  /** Optional reason (e.g., "Holiday", "Maintenance") */
  reason?: string;
  /** User who created the exception */
  createdBy: string;
  /** ISO timestamp of creation */
  createdAt: string;
}

/** Complete facility availability schedule */
export interface FacilityAvailabilitySchedule {
  weeklySchedule: WeeklySchedule;
  exceptions: ScheduleException[];
}

/** Days of the week constant array */
export const DAYS_OF_WEEK: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

/** Create default schedule: Mon-Sun 08:00-20:00 */
export function createDefaultSchedule(): FacilityAvailabilitySchedule {
  const defaultDay: FacilityDaySchedule = { available: true, timeBlocks: [] };
  return {
    weeklySchedule: {
      defaultTimeBlocks: [{ from: "08:00", to: "20:00" }],
      days: {
        monday: { ...defaultDay },
        tuesday: { ...defaultDay },
        wednesday: { ...defaultDay },
        thursday: { ...defaultDay },
        friday: { ...defaultDay },
        saturday: { ...defaultDay },
        sunday: { ...defaultDay },
      },
    },
    exceptions: [],
  };
}
