import { z } from "zod";

/**
 * Zod schemas for communications API validation
 * Based on shared types from @stall-bokning/shared
 */

// ============================================================================
// Enums as Zod schemas
// ============================================================================

export const communicationTypeSchema = z.enum([
  "email",
  "sms",
  "phone",
  "meeting",
  "note",
  "telegram",
  "in_app",
]);

export const communicationDirectionSchema = z.enum(["outbound", "inbound"]);

export const communicationStatusSchema = z.enum([
  "draft",
  "scheduled",
  "sent",
  "delivered",
  "read",
  "failed",
  "bounced",
]);

// ============================================================================
// Communication Records Schemas
// ============================================================================

/**
 * Attachment schema
 */
const attachmentInputSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url().max(2048),
  size: z.number().int().positive().optional(),
  mimeType: z.string().max(100).optional(),
});

/**
 * Create Communication Input Schema
 */
export const createCommunicationSchema = z.object({
  contactId: z.string().min(1, "Contact ID is required"),
  type: communicationTypeSchema,
  direction: communicationDirectionSchema,
  subject: z.string().max(200, "Subject too long").optional(),
  content: z
    .string()
    .min(1, "Content is required")
    .max(10000, "Content too long"),
  summary: z.string().max(500, "Summary too long").optional(),
  attachments: z.array(attachmentInputSchema).max(10).optional(),
  relatedInvoiceId: z.string().optional(),
  relatedHorseId: z.string().optional(),
  relatedActivityId: z.string().optional(),
  metadata: z.record(z.string()).optional(),
  occurredAt: z.union([z.string().datetime(), z.date()]).optional(),
  scheduledAt: z.union([z.string().datetime(), z.date()]).optional(),
});

/**
 * Update Communication Input Schema
 */
export const updateCommunicationSchema = z.object({
  subject: z.string().max(200).optional(),
  content: z.string().min(1).max(10000).optional(),
  summary: z.string().max(500).optional(),
  status: communicationStatusSchema.optional(),
  relatedInvoiceId: z.string().nullable().optional(),
  relatedHorseId: z.string().nullable().optional(),
  relatedActivityId: z.string().nullable().optional(),
  occurredAt: z.union([z.string().datetime(), z.date()]).optional(),
  scheduledAt: z.union([z.string().datetime(), z.date()]).optional(),
  metadata: z.record(z.string()).optional(),
});

// ============================================================================
// Communication Templates Schemas
// ============================================================================

/**
 * Create Template Input Schema
 */
export const createTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(500).optional(),
  type: communicationTypeSchema,
  subject: z.string().max(200).optional(),
  content: z
    .string()
    .min(1, "Content is required")
    .max(10000, "Content too long"),
  variables: z.array(z.string().max(50)).max(20).optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
});

/**
 * Update Template Input Schema
 */
export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  type: communicationTypeSchema.optional(),
  subject: z.string().max(200).optional(),
  content: z.string().min(1).max(10000).optional(),
  variables: z.array(z.string().max(50)).max(20).optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
});

/**
 * Use Template Input Schema
 */
export const useTemplateSchema = z.object({
  variables: z.record(z.string().max(1000)).optional(),
});

// ============================================================================
// Query Parameter Schemas
// ============================================================================

/**
 * List Communications Query Schema
 */
export const listCommunicationsQuerySchema = z.object({
  contactId: z.string().optional(),
  type: z.string().optional(), // Can be comma-separated
  direction: communicationDirectionSchema.optional(),
  status: z.string().optional(), // Can be comma-separated
  startDate: z
    .string()
    .refine(
      (val) => !val || !isNaN(Date.parse(val)),
      "Invalid date format for startDate",
    )
    .optional(),
  endDate: z
    .string()
    .refine(
      (val) => !val || !isNaN(Date.parse(val)),
      "Invalid date format for endDate",
    )
    .optional(),
  search: z.string().max(200).optional(),
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(1000))
    .optional()
    .default("1"),
  pageSize: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100))
    .optional()
    .default("20"),
  sortField: z
    .enum(["occurredAt", "createdAt", "contactName", "type"])
    .optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
});

/**
 * Contact Communications Query Schema
 */
export const contactCommunicationsQuerySchema = z.object({
  type: communicationTypeSchema.optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100))
    .optional()
    .default("50"),
});

/**
 * List Templates Query Schema
 */
export const listTemplatesQuerySchema = z.object({
  type: communicationTypeSchema.optional(),
  category: z.string().max(50).optional(),
});

// ============================================================================
// Path Parameter Schemas
// ============================================================================

/**
 * Organization ID Parameter Schema
 */
export const organizationIdParamSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
});

/**
 * Communication ID Parameter Schema
 */
export const communicationIdParamSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  communicationId: z.string().min(1, "Communication ID is required"),
});

/**
 * Contact Communication Parameter Schema
 */
export const contactCommunicationParamSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  contactId: z.string().min(1, "Contact ID is required"),
});

/**
 * Template ID Parameter Schema
 */
export const templateIdParamSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  templateId: z.string().min(1, "Template ID is required"),
});

// ============================================================================
// Export types inferred from schemas
// ============================================================================

export type CommunicationType = z.infer<typeof communicationTypeSchema>;
export type CommunicationDirection = z.infer<
  typeof communicationDirectionSchema
>;
export type CommunicationStatus = z.infer<typeof communicationStatusSchema>;
export type CreateCommunicationSchemaInput = z.infer<
  typeof createCommunicationSchema
>;
export type UpdateCommunicationSchemaInput = z.infer<
  typeof updateCommunicationSchema
>;
export type CreateTemplateSchemaInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateSchemaInput = z.infer<typeof updateTemplateSchema>;
export type UseTemplateSchemaInput = z.infer<typeof useTemplateSchema>;
export type ListCommunicationsQuery = z.infer<
  typeof listCommunicationsQuerySchema
>;
export type ContactCommunicationsQuery = z.infer<
  typeof contactCommunicationsQuerySchema
>;
export type ListTemplatesQuery = z.infer<typeof listTemplatesQuerySchema>;
