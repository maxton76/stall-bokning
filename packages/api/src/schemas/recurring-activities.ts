import { z } from "zod";

/**
 * Zod schemas for recurring activities API validation
 * Based on shared types from @equiduty/shared
 */

// Enums as Zod schemas
export const recurringAssignmentModeSchema = z.enum([
  "fixed",
  "rotation",
  "fair-distribution",
]);

export const recurringActivityStatusSchema = z.enum([
  "active",
  "paused",
  "archived",
]);

export const recurringActivityCategorySchema = z.enum([
  "feeding",
  "mucking",
  "turnout",
  "bring-in",
  "health",
  "grooming",
  "cleaning",
  "water",
  "hay",
  "other",
]);

export const activityInstanceStatusSchema = z.enum([
  "scheduled",
  "in-progress",
  "completed",
  "missed",
  "cancelled",
  "skipped",
]);

// Time validation (HH:MM format)
const timeOfDaySchema = z
  .string()
  .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:MM format");

// RRULE validation (basic check for RRULE format)
const rruleSchema = z
  .string()
  .regex(/^RRULE:FREQ=/, "Must be a valid RRULE (starts with RRULE:FREQ=)");

// Hex color validation
const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color (e.g., #FF5733)")
  .optional();

/**
 * Create Recurring Activity Input Schema
 */
export const createRecurringActivitySchema = z.object({
  stableId: z.string().min(1, "Stable ID is required"),
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(2000, "Description too long").optional(),
  category: recurringActivityCategorySchema,
  color: hexColorSchema,
  icon: z.string().max(50).optional(),
  activityTypeId: z.string().optional(),
  recurrenceRule: rruleSchema,
  timeOfDay: timeOfDaySchema,
  duration: z
    .number()
    .int()
    .min(1, "Duration must be at least 1 minute")
    .max(1440, "Duration cannot exceed 24 hours"),
  startDate: z.union([z.string().datetime(), z.date()]),
  endDate: z.union([z.string().datetime(), z.date()]).optional(),
  assignmentMode: recurringAssignmentModeSchema,
  assignedTo: z.array(z.string()).optional(),
  rotationGroup: z.array(z.string()).optional(),
  horseId: z.string().optional(),
  appliesToAllHorses: z.boolean().optional().default(false),
  horseGroupId: z.string().optional(),
  weight: z.number().int().min(1).max(4).optional().default(1),
  isHolidayMultiplied: z.boolean().optional().default(false),
  generateDaysAhead: z.number().int().min(1).max(365).optional().default(60),
});

/**
 * Update Recurring Activity Input Schema
 */
export const updateRecurringActivitySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  category: recurringActivityCategorySchema.optional(),
  color: hexColorSchema,
  icon: z.string().max(50).optional(),
  recurrenceRule: rruleSchema.optional(),
  timeOfDay: timeOfDaySchema.optional(),
  duration: z.number().int().min(1).max(1440).optional(),
  endDate: z.union([z.string().datetime(), z.date(), z.null()]).optional(),
  assignmentMode: recurringAssignmentModeSchema.optional(),
  assignedTo: z.array(z.string()).optional(),
  rotationGroup: z.array(z.string()).optional(),
  horseId: z.union([z.string(), z.null()]).optional(),
  appliesToAllHorses: z.boolean().optional(),
  horseGroupId: z.union([z.string(), z.null()]).optional(),
  weight: z.number().int().min(1).max(4).optional(),
  isHolidayMultiplied: z.boolean().optional(),
  generateDaysAhead: z.number().int().min(1).max(365).optional(),
  status: recurringActivityStatusSchema.optional(),
});

/**
 * Update Progress Input Schema
 */
export const updateProgressSchema = z.object({
  instanceId: z.string().min(1, "Instance ID is required"),
  progress: z.number().int().min(0).max(100).optional(),
  checklistUpdates: z
    .array(
      z.object({
        itemId: z.string().min(1),
        completed: z.boolean(),
      }),
    )
    .optional(),
});

/**
 * Create Exception Input Schema
 */
export const createExceptionSchema = z.object({
  exceptionDate: z.union([z.string().datetime(), z.date()]),
  exceptionType: z.enum(["skip", "modify", "add"]),
  modifiedTitle: z.string().max(200).optional(),
  modifiedTime: timeOfDaySchema.optional(),
  modifiedAssignedTo: z.string().optional(),
  reason: z.string().max(500).optional(),
});

/**
 * Batch Assign Input Schema
 */
export const batchAssignSchema = z.object({
  instanceIds: z
    .array(z.string().min(1))
    .min(1, "At least one instance required"),
  assignedTo: z.string().min(1, "Assignee is required"),
});

/**
 * Query Parameters Schema for listing instances
 */
export const listInstancesQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: activityInstanceStatusSchema.optional(),
  assignedTo: z.string().optional(),
  horseId: z.string().optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(500))
    .optional(),
  offset: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(0))
    .optional(),
});

// Export types inferred from schemas
export type CreateRecurringActivityInput = z.infer<
  typeof createRecurringActivitySchema
>;
export type UpdateRecurringActivityInput = z.infer<
  typeof updateRecurringActivitySchema
>;
export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;
export type CreateExceptionInput = z.infer<typeof createExceptionSchema>;
export type BatchAssignInput = z.infer<typeof batchAssignSchema>;
export type ListInstancesQuery = z.infer<typeof listInstancesQuerySchema>;
