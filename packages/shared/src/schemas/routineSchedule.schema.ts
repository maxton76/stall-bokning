import { z } from "zod";

/**
 * Zod schemas for Routine Schedule API validation
 * Shared between frontend forms and backend API
 */

// ============================================================
// Enum Schemas
// ============================================================

export const routineScheduleRepeatPatternSchema = z.enum([
  "daily",
  "weekdays",
  "custom",
]);

export const scheduleAssignmentModeSchema = z.enum([
  "auto",
  "manual",
  "selfBooked",
  "unassigned",
]);

// ============================================================
// Common Validation Helpers
// ============================================================

// Time validation (HH:MM format)
export const scheduleTimeSchema = z
  .string()
  .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:MM format");

// Date string validation (YYYY-MM-DD)
export const scheduleDateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

// Day of week validation (0-6, Sunday-Saturday)
export const dayOfWeekSchema = z.number().int().min(0).max(6);

// ============================================================
// Routine Schedule Schemas
// ============================================================

export const createRoutineScheduleSchema = z
  .object({
    organizationId: z.string().min(1, "Organization ID is required"),
    stableId: z.string().min(1, "Stable ID is required"),
    templateId: z.string().min(1, "Template ID is required"),

    // Optional custom name
    name: z.string().max(100, "Name too long").optional(),

    // Schedule configuration
    startDate: scheduleDateStringSchema,
    endDate: scheduleDateStringSchema, // Required - instances are generated up to this date
    repeatPattern: routineScheduleRepeatPatternSchema,
    repeatDays: z
      .array(dayOfWeekSchema)
      .min(1, "At least one day required for custom pattern")
      .max(7)
      .optional(),
    includeHolidays: z.boolean().optional(),
    scheduledStartTime: scheduleTimeSchema,

    // Assignment configuration
    assignmentMode: scheduleAssignmentModeSchema,
    defaultAssignedTo: z.string().optional(),

    // Custom assignments for auto mode (key: YYYY-MM-DD, value: userId or null)
    customAssignments: z.record(z.string(), z.string().nullable()).optional(),
  })
  .refine(
    (data) => {
      // If pattern is 'custom', at least one day or includeHolidays is required
      if (data.repeatPattern === "custom") {
        const hasDays = data.repeatDays && data.repeatDays.length > 0;
        const hasHolidays = data.includeHolidays === true;
        return hasDays || hasHolidays;
      }
      return true;
    },
    {
      message:
        "Custom pattern requires at least one day or holidays to be selected",
      path: ["repeatDays"],
    },
  )
  .refine(
    (data) => {
      // If assignmentMode is 'manual', defaultAssignedTo should be provided
      if (data.assignmentMode === "manual") {
        return !!data.defaultAssignedTo;
      }
      return true;
    },
    {
      message: "Manual assignment mode requires a default assignee",
      path: ["defaultAssignedTo"],
    },
  )
  .refine(
    (data) => {
      // End date must be on or after start date
      return new Date(data.endDate) >= new Date(data.startDate);
    },
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    },
  )
  .refine(
    (data) => {
      // End date must be at most 12 months from start date
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      const maxEnd = new Date(start);
      maxEnd.setMonth(maxEnd.getMonth() + 12);
      return end <= maxEnd;
    },
    {
      message: "Schedule cannot exceed 12 months",
      path: ["endDate"],
    },
  );

export const updateRoutineScheduleSchema = z
  .object({
    name: z.string().max(100, "Name too long").optional(),
    startDate: scheduleDateStringSchema.optional(),
    endDate: scheduleDateStringSchema.nullable().optional(),
    repeatPattern: routineScheduleRepeatPatternSchema.optional(),
    repeatDays: z.array(dayOfWeekSchema).min(1).max(7).optional(),
    includeHolidays: z.boolean().optional(),
    scheduledStartTime: scheduleTimeSchema.optional(),
    assignmentMode: scheduleAssignmentModeSchema.optional(),
    defaultAssignedTo: z.string().nullable().optional(),
    isEnabled: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // If pattern is 'custom', at least one day or includeHolidays is required
      if (data.repeatPattern === "custom") {
        const hasDays = data.repeatDays && data.repeatDays.length > 0;
        const hasHolidays = data.includeHolidays === true;
        return hasDays || hasHolidays;
      }
      // If explicitly disabling holidays without sending repeatPattern,
      // require days to be present
      if (data.includeHolidays === false && data.repeatDays !== undefined) {
        return data.repeatDays.length > 0;
      }
      return true;
    },
    {
      message:
        "Custom pattern requires at least one day or holidays to be selected",
      path: ["repeatDays"],
    },
  );

export const listRoutineSchedulesQuerySchema = z.object({
  stableId: z.string().optional(),
  templateId: z.string().optional(),
  isEnabled: z
    .string()
    .transform((val) => val === "true")
    .optional(),
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

// Toggle schema for enable/disable endpoint
export const toggleRoutineScheduleSchema = z.object({
  isEnabled: z.boolean(),
});

// ============================================================
// Type exports for inferred types
// ============================================================

export type CreateRoutineScheduleSchemaType = z.infer<
  typeof createRoutineScheduleSchema
>;
export type UpdateRoutineScheduleSchemaType = z.infer<
  typeof updateRoutineScheduleSchema
>;
export type ListRoutineSchedulesQuerySchemaType = z.infer<
  typeof listRoutineSchedulesQuerySchema
>;
