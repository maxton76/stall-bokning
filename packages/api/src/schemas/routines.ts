/**
 * Routine Schemas - Re-export from shared package
 *
 * This file re-exports schemas from @stall-bokning/shared for backward compatibility.
 * All schema definitions are now maintained in the shared package.
 */

// Zod validation schemas
export {
  // Enum schemas
  routineCategorySchema,
  routineTypeSchema,
  routineStepHorseContextSchema,
  routineInstanceStatusSchema,
  stepStatusSchema,
  notePrioritySchema,
  dailyNoteCategorySchema,
  blanketActionSchema,

  // Validation helpers
  timeSchema,
  hexColorSchema,
  dateStringSchema,

  // Step schemas
  routineStepHorseFilterSchema,
  createRoutineStepSchema,

  // Template schemas
  createRoutineTemplateSchema,
  updateRoutineTemplateSchema,

  // Instance schemas
  createRoutineInstanceSchema,
  startRoutineSchema,

  // Progress schemas
  updateHorseProgressSchema,
  updateStepProgressSchema,
  completeRoutineSchema,

  // Daily notes schemas
  createHorseNoteSchema,
  createAlertSchema,
  updateDailyNotesSchema,
  getDailyNotesQuerySchema,

  // Query schemas
  listRoutineTemplatesQuerySchema,
  listRoutineInstancesQuerySchema,
} from "@stall-bokning/shared/schemas";

// Types from @stall-bokning/shared/types
export type {
  // Enum types
  RoutineCategory,
  RoutineType,
  RoutineStepHorseContext,
  RoutineInstanceStatus,
  StepStatus,
  NotePriority,
  DailyNoteCategory,
  BlanketAction,
  // Input types
  CreateRoutineTemplateInput,
  UpdateRoutineTemplateInput,
  StartRoutineInput,
  UpdateStepProgressInput,
  UpdateHorseProgressInput,
  CompleteRoutineInput,
  UpdateDailyNotesInput,
  CreateHorseNoteInput,
  CreateAlertInput,
  CreateRoutineInstanceInput,
  // Query types
  ListRoutineTemplatesQuery,
  ListRoutineInstancesQuery,
} from "@stall-bokning/shared";
