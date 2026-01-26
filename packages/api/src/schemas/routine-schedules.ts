/**
 * Routine Schedule Schemas - Re-export from shared package
 *
 * This file re-exports schemas from @stall-bokning/shared for backward compatibility.
 * All schema definitions are now maintained in the shared package.
 */

// Zod validation schemas
export {
  // Enum schemas
  routineScheduleRepeatPatternSchema,
  scheduleAssignmentModeSchema,

  // Validation helpers
  scheduleTimeSchema,
  scheduleDateStringSchema,
  dayOfWeekSchema,

  // Schedule schemas
  createRoutineScheduleSchema,
  updateRoutineScheduleSchema,
  listRoutineSchedulesQuerySchema,
  toggleRoutineScheduleSchema,
} from "@stall-bokning/shared/schemas";

// Types from @stall-bokning/shared/types
export type {
  // Core types
  RoutineSchedule,
  RoutineScheduleRepeatPattern,
  RoutineScheduleSummary,

  // Input types
  CreateRoutineScheduleInput,
  UpdateRoutineScheduleInput,

  // Query types
  ListRoutineSchedulesQuery,
} from "@stall-bokning/shared";
