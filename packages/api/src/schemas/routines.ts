import { z } from "zod";

/**
 * Zod schemas for Routine Flow API validation
 * Based on shared types from @stall-bokning/shared
 */

// ============================================================
// Enum Schemas
// ============================================================

export const routineCategorySchema = z.enum([
  "preparation",
  "feeding",
  "medication",
  "blanket",
  "turnout",
  "bring_in",
  "mucking",
  "water",
  "health_check",
  "safety",
  "cleaning",
  "other",
]);

export const routineTypeSchema = z.enum([
  "morning",
  "midday",
  "evening",
  "custom",
]);

export const routineStepHorseContextSchema = z.enum([
  "all",
  "specific",
  "groups",
  "none",
]);

export const routineInstanceStatusSchema = z.enum([
  "scheduled",
  "started",
  "in_progress",
  "completed",
  "missed",
  "cancelled",
]);

export const stepStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "skipped",
]);

export const notePrioritySchema = z.enum(["info", "warning", "critical"]);

export const dailyNoteCategorySchema = z.enum([
  "medication",
  "health",
  "feeding",
  "blanket",
  "behavior",
  "other",
]);

export const blanketActionSchema = z.enum(["on", "off", "unchanged"]);

// ============================================================
// Common Validation Helpers
// ============================================================

// Time validation (HH:MM format)
const timeSchema = z
  .string()
  .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:MM format");

// Hex color validation
const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color (e.g., #FF5733)")
  .optional();

// Date string validation (YYYY-MM-DD)
const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

// ============================================================
// Routine Step Schemas
// ============================================================

export const routineStepHorseFilterSchema = z.object({
  horseIds: z.array(z.string()).optional(),
  groupIds: z.array(z.string()).optional(),
  locationIds: z.array(z.string()).optional(),
  excludeHorseIds: z.array(z.string()).optional(),
});

export const createRoutineStepSchema = z.object({
  name: z
    .string()
    .min(1, "Step name is required")
    .max(100, "Step name too long"),
  description: z.string().max(500, "Description too long").optional(),
  category: routineCategorySchema,
  icon: z.string().max(50).optional(),
  horseContext: routineStepHorseContextSchema,
  horseFilter: routineStepHorseFilterSchema.optional(),
  showFeeding: z.boolean().optional(),
  showMedication: z.boolean().optional(),
  showSpecialInstructions: z.boolean().optional(),
  showBlanketStatus: z.boolean().optional(),
  requiresConfirmation: z.boolean().optional().default(true),
  allowPartialCompletion: z.boolean().optional().default(false),
  allowPhotoEvidence: z.boolean().optional().default(false),
  estimatedMinutes: z.number().int().min(1).max(480).optional(),
});

// ============================================================
// Routine Template Schemas
// ============================================================

export const createRoutineTemplateSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  stableId: z.string().optional(),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(500, "Description too long").optional(),
  type: routineTypeSchema,
  icon: z.string().max(50).optional(),
  color: hexColorSchema,
  defaultStartTime: timeSchema,
  estimatedDuration: z
    .number()
    .int()
    .min(1, "Duration must be at least 1 minute")
    .max(720, "Duration cannot exceed 12 hours"),
  steps: z
    .array(createRoutineStepSchema)
    .min(1, "At least one step is required")
    .max(20, "Maximum 20 steps allowed"),
  requiresNotesRead: z.boolean().optional().default(true),
  allowSkipSteps: z.boolean().optional().default(true),
  pointsValue: z.number().int().min(1).max(10).optional().default(1),
});

export const updateRoutineTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  type: routineTypeSchema.optional(),
  icon: z.string().max(50).optional(),
  color: hexColorSchema,
  defaultStartTime: timeSchema.optional(),
  estimatedDuration: z.number().int().min(1).max(720).optional(),
  steps: z.array(createRoutineStepSchema).min(1).max(20).optional(),
  requiresNotesRead: z.boolean().optional(),
  allowSkipSteps: z.boolean().optional(),
  pointsValue: z.number().int().min(1).max(10).optional(),
  isActive: z.boolean().optional(),
});

// ============================================================
// Routine Instance Schemas
// ============================================================

export const createRoutineInstanceSchema = z.object({
  templateId: z.string().min(1, "Template ID is required"),
  stableId: z.string().min(1, "Stable ID is required"),
  scheduledDate: z.union([z.string().datetime(), z.date()]),
  scheduledStartTime: timeSchema,
  assignedTo: z.string().optional(),
});

export const startRoutineSchema = z.object({
  instanceId: z.string().min(1, "Instance ID is required"),
  dailyNotesAcknowledged: z.boolean(),
});

// ============================================================
// Step Progress Schemas
// ============================================================

export const updateHorseProgressSchema = z.object({
  horseId: z.string().min(1, "Horse ID is required"),
  completed: z.boolean().optional(),
  skipped: z.boolean().optional(),
  skipReason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  photoUrls: z.array(z.string().url()).max(5).optional(),
  feedingConfirmed: z.boolean().optional(),
  medicationGiven: z.boolean().optional(),
  medicationSkipped: z.boolean().optional(),
  blanketAction: blanketActionSchema.optional(),
});

export const updateStepProgressSchema = z.object({
  instanceId: z.string().min(1, "Instance ID is required"),
  stepId: z.string().min(1, "Step ID is required"),
  status: stepStatusSchema.optional(),
  generalNotes: z.string().max(1000).optional(),
  photoUrls: z.array(z.string().url()).max(10).optional(),
  horseUpdates: z.array(updateHorseProgressSchema).optional(),
});

export const completeRoutineSchema = z.object({
  instanceId: z.string().min(1, "Instance ID is required"),
  notes: z.string().max(2000).optional(),
});

// ============================================================
// Daily Notes Schemas
// ============================================================

export const createHorseNoteSchema = z.object({
  horseId: z.string().min(1, "Horse ID is required"),
  note: z.string().min(1, "Note is required").max(1000, "Note too long"),
  priority: notePrioritySchema,
  category: dailyNoteCategorySchema.optional(),
});

export const createAlertSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  message: z
    .string()
    .min(1, "Message is required")
    .max(500, "Message too long"),
  priority: notePrioritySchema,
  affectedHorseIds: z.array(z.string()).optional(),
  expiresAt: z.union([z.string().datetime(), z.date()]).optional(),
});

export const updateDailyNotesSchema = z.object({
  stableId: z.string().min(1, "Stable ID is required"),
  date: dateStringSchema,
  generalNotes: z.string().max(2000).optional(),
  weatherNotes: z.string().max(500).optional(),
  horseNotes: z.array(createHorseNoteSchema).max(50).optional(),
  alerts: z.array(createAlertSchema).max(10).optional(),
});

export const getDailyNotesQuerySchema = z.object({
  date: dateStringSchema.optional(),
});

// ============================================================
// Query Schemas
// ============================================================

export const listRoutineTemplatesQuerySchema = z.object({
  type: routineTypeSchema.optional(),
  isActive: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  stableId: z.string().optional(),
});

export const listRoutineInstancesQuerySchema = z.object({
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  status: routineInstanceStatusSchema.optional(),
  assignedTo: z.string().optional(),
  templateId: z.string().optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100))
    .optional(),
  offset: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(0))
    .optional(),
});

// ============================================================
// Export Types
// ============================================================

export type CreateRoutineTemplateInput = z.infer<
  typeof createRoutineTemplateSchema
>;
export type UpdateRoutineTemplateInput = z.infer<
  typeof updateRoutineTemplateSchema
>;
export type CreateRoutineInstanceInput = z.infer<
  typeof createRoutineInstanceSchema
>;
export type StartRoutineInput = z.infer<typeof startRoutineSchema>;
export type UpdateStepProgressInput = z.infer<typeof updateStepProgressSchema>;
export type UpdateHorseProgressInput = z.infer<
  typeof updateHorseProgressSchema
>;
export type CompleteRoutineInput = z.infer<typeof completeRoutineSchema>;
export type UpdateDailyNotesInput = z.infer<typeof updateDailyNotesSchema>;
export type CreateHorseNoteInput = z.infer<typeof createHorseNoteSchema>;
export type CreateAlertInput = z.infer<typeof createAlertSchema>;
export type ListRoutineTemplatesQuery = z.infer<
  typeof listRoutineTemplatesQuerySchema
>;
export type ListRoutineInstancesQuery = z.infer<
  typeof listRoutineInstancesQuerySchema
>;
