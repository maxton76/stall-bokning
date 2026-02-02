/**
 * API-side facility availability utilities.
 * Re-exports shared pure functions for use in API routes.
 */

export {
  getEffectiveTimeBlocks,
  isTimeRangeAvailable,
  validateTimeBlocks,
  validateSchedule,
  migrateLegacyAvailability,
  formatDateKey,
  timeToMinutes,
} from "@equiduty/shared/utils/facilityAvailability";

export type {
  TimeBlock,
  DayOfWeek,
  FacilityDaySchedule,
  WeeklySchedule,
  ScheduleException,
  FacilityAvailabilitySchedule,
} from "@equiduty/shared/types/facilitySchedule";

export { createDefaultSchedule } from "@equiduty/shared/types/facilitySchedule";
