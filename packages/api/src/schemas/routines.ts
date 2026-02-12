/**
 * Routine Schemas - Re-export from shared package
 *
 * This file re-exports schemas from @equiduty/shared for backward compatibility.
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

  // Owner horse note schemas
  createOwnerHorseNoteSchema,
  updateOwnerHorseNoteSchema,
  listOwnerNotesQuerySchema,

  // Query schemas
  listRoutineTemplatesQuerySchema,
  listRoutineInstancesQuerySchema,
} from "@equiduty/shared/schemas";

// Types from @equiduty/shared/types
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
  // Owner note types
  CreateOwnerHorseNoteInput,
  UpdateOwnerHorseNoteInput,
  // Query types
  ListRoutineTemplatesQuery,
  ListRoutineInstancesQuery,
} from "@equiduty/shared";
