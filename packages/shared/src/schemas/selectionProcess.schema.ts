import { z } from "zod";

/**
 * Zod schemas for Selection Process API validation
 * Shared between frontend forms and backend API
 */

// ============================================================
// Enum Schemas
// ============================================================

export const selectionProcessStatusSchema = z.enum([
  "draft",
  "active",
  "completed",
  "cancelled",
]);

export const selectionTurnStatusSchema = z.enum([
  "pending",
  "active",
  "completed",
]);

export const selectionAlgorithmSchema = z.enum([
  "manual",
  "quota_based",
  "points_balance",
  "fair_rotation",
]);

// ============================================================
// Common Validation Helpers
// ============================================================

// Date string validation (YYYY-MM-DD)
const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

// ISO date string validation
const isoDateStringSchema = z.string().refine(
  (val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  },
  { message: "Must be a valid ISO date string" },
);

// ============================================================
// Member Schema
// ============================================================

export const createSelectionProcessMemberSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  userName: z
    .string()
    .min(1, "User name is required")
    .max(200, "Name too long"),
  userEmail: z.string().email("Invalid email address"),
});

// ============================================================
// Selection Process Schemas
// ============================================================

export const createSelectionProcessSchema = z
  .object({
    organizationId: z.string().min(1, "Organization ID is required"),
    stableId: z.string().min(1, "Stable ID is required"),
    name: z
      .string()
      .min(1, "Name is required")
      .max(100, "Name must be 100 characters or less"),
    description: z.string().max(500, "Description too long").optional(),
    selectionStartDate: isoDateStringSchema,
    selectionEndDate: isoDateStringSchema,
    algorithm: selectionAlgorithmSchema.optional(),
    memberOrder: z
      .array(createSelectionProcessMemberSchema)
      .min(1, "At least one member is required")
      .max(100, "Maximum 100 members allowed")
      .optional(),
  })
  .refine(
    (data) => {
      const startDate = new Date(data.selectionStartDate);
      const endDate = new Date(data.selectionEndDate);
      return startDate < endDate;
    },
    {
      message: "Selection end date must be after start date",
      path: ["selectionEndDate"],
    },
  )
  .refine(
    (data) => {
      // memberOrder is required for manual algorithm (or when no algorithm specified)
      const algo = data.algorithm ?? "manual";
      if (algo === "manual") {
        return data.memberOrder && data.memberOrder.length >= 1;
      }
      return true;
    },
    {
      message: "Member order is required when using manual algorithm",
      path: ["memberOrder"],
    },
  );

export const updateSelectionProcessSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    selectionStartDate: isoDateStringSchema.optional(),
    selectionEndDate: isoDateStringSchema.optional(),
    memberOrder: z
      .array(createSelectionProcessMemberSchema)
      .min(1)
      .max(100)
      .optional(),
  })
  .refine(
    (data) => {
      // Only validate if both dates are provided
      if (data.selectionStartDate && data.selectionEndDate) {
        const startDate = new Date(data.selectionStartDate);
        const endDate = new Date(data.selectionEndDate);
        return startDate < endDate;
      }
      return true;
    },
    {
      message: "Selection end date must be after start date",
      path: ["selectionEndDate"],
    },
  );

// ============================================================
// Query Schemas
// ============================================================

export const listSelectionProcessesQuerySchema = z.object({
  stableId: z.string().optional(),
  status: selectionProcessStatusSchema.optional(),
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

export const getSelectionProcessQuerySchema = z.object({
  includeSelections: z
    .string()
    .transform((val) => val === "true")
    .optional(),
});

// ============================================================
// Action Schemas
// ============================================================

/**
 * Schema for starting a selection process
 * No additional input needed, just the process ID from params
 */
export const startSelectionProcessSchema = z.object({});

/**
 * Schema for completing the current turn
 * No additional input needed, just the process ID from params
 */
export const completeTurnSchema = z.object({});

/**
 * Schema for cancelling a selection process
 */
export const cancelSelectionProcessSchema = z.object({
  reason: z.string().max(500).optional(),
});

// ============================================================
// Compute Turn Order Schema
// ============================================================

export const computeTurnOrderSchema = z.object({
  algorithm: selectionAlgorithmSchema,
  memberIds: z
    .array(z.string().min(1))
    .min(1, "At least one member is required")
    .max(100, "Maximum 100 members allowed"),
  selectionStartDate: isoDateStringSchema,
  selectionEndDate: isoDateStringSchema,
});

// ============================================================
// Param Schemas
// ============================================================

export const selectionProcessParamsSchema = z.object({
  processId: z.string().min(1, "Process ID is required"),
});

// ============================================================
// Note: Types are defined in @equiduty/shared/types/selectionProcess
// This file only exports Zod schemas for validation purposes.
// Use types from the types module for type annotations.
// ============================================================
