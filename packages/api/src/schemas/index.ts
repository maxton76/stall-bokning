/**
 * API Validation Schemas
 *
 * Centralized Zod schemas for API request validation.
 * Use with validateBody, validateParams, validateQuery middleware.
 *
 * @example
 * import { createRecurringActivitySchema } from '../schemas';
 * import { validateBody } from '../middleware/validation';
 *
 * fastify.post('/recurring-activities', {
 *   preHandler: [authenticate, validateBody(createRecurringActivitySchema)]
 * }, async (request, reply) => {
 *   const data = (request as any).validatedBody;
 *   // data is typed and validated
 * });
 */

// Recurring Activities Schemas
export {
  recurringAssignmentModeSchema,
  recurringActivityStatusSchema,
  recurringActivityCategorySchema,
  activityInstanceStatusSchema,
  createRecurringActivitySchema,
  updateRecurringActivitySchema,
  updateProgressSchema,
  createExceptionSchema,
  batchAssignSchema,
  listInstancesQuerySchema,
  type CreateRecurringActivityInput,
  type UpdateRecurringActivityInput,
  type UpdateProgressInput,
  type CreateExceptionInput,
  type BatchAssignInput,
  type ListInstancesQuery,
} from "./recurring-activities.js";

// Notifications Schemas
export {
  notificationChannelSchema,
  notificationTypeSchema,
  notificationPrioritySchema,
  notificationStatusSchema,
  createNotificationSchema,
  fcmTokenSchema,
  updateNotificationPreferencesSchema,
  markAsReadSchema,
  deleteNotificationsSchema,
  listNotificationsQuerySchema,
  type CreateNotificationInput,
  type UpdateNotificationPreferencesInput,
  type MarkAsReadInput,
  type DeleteNotificationsInput,
  type ListNotificationsQuery,
} from "./notifications.js";

// Communications Schemas
export {
  communicationTypeSchema,
  communicationDirectionSchema,
  communicationStatusSchema,
  createCommunicationSchema,
  updateCommunicationSchema,
  createTemplateSchema,
  updateTemplateSchema,
  useTemplateSchema,
  listCommunicationsQuerySchema,
  contactCommunicationsQuerySchema,
  listTemplatesQuerySchema,
  organizationIdParamSchema,
  communicationIdParamSchema,
  contactCommunicationParamSchema,
  templateIdParamSchema,
  type CommunicationType,
  type CommunicationDirection,
  type CommunicationStatus,
  type CreateCommunicationSchemaInput,
  type UpdateCommunicationSchemaInput,
  type CreateTemplateSchemaInput,
  type UpdateTemplateSchemaInput,
  type UseTemplateSchemaInput,
  type ListCommunicationsQuery,
  type ContactCommunicationsQuery,
  type ListTemplatesQuery,
} from "./communications.js";
