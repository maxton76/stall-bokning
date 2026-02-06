import { z } from "zod";

/**
 * Zod schemas for notifications API validation
 * Based on shared types from @equiduty/shared
 */

// Enums as Zod schemas
export const notificationChannelSchema = z.enum([
  "email",
  "push",
  "inApp",
  "telegram",
]);

export const notificationTypeSchema = z.enum([
  "shift_reminder",
  "shift_assigned",
  "shift_unassigned",
  "shift_completed",
  "shift_missed",
  "health_reminder",
  "health_overdue",
  "activity_created",
  "activity_updated",
  "activity_cancelled",
  "daily_summary",
  "weekly_summary",
  "system_alert",
  "selection_turn_started",
  "selection_process_completed",
  "membership_invite",
  "membership_invite_response",
  "feature_request_status_change",
  "feature_request_admin_response",
  "trial_expiring",
  "subscription_expiring",
  "payment_failed",
  "payment_method_required",
]);

export const notificationPrioritySchema = z.enum([
  "low",
  "normal",
  "high",
  "urgent",
]);

export const notificationStatusSchema = z.enum([
  "pending",
  "sent",
  "failed",
  "read",
  "dismissed",
]);

// Time validation (HH:MM format)
const timeOfDaySchema = z
  .string()
  .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:MM format");

// Platform for FCM tokens
const platformSchema = z.enum(["ios", "android", "web"]);

/**
 * Create Notification Input Schema
 */
export const createNotificationSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  type: notificationTypeSchema,
  priority: notificationPrioritySchema.optional().default("normal"),
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  titleKey: z.string().max(200).optional(),
  body: z.string().min(1, "Body is required").max(2000, "Body too long"),
  bodyKey: z.string().max(200).optional(),
  bodyParams: z.record(z.string()).optional(),
  entityType: z
    .enum([
      "activity",
      "recurringActivity",
      "instance",
      "horse",
      "stable",
      "organizationMember",
      "organization",
      "featureRequest",
      "support_ticket",
    ])
    .optional(),
  entityId: z.string().optional(),
  channels: z.array(notificationChannelSchema).optional(),
  scheduledFor: z.union([z.string().datetime(), z.date()]).optional(),
  expiresAt: z.union([z.string().datetime(), z.date()]).optional(),
  actionUrl: z.string().max(500).optional(),
  actionLabel: z.string().max(100).optional(),
});

/**
 * FCM Token Schema
 */
export const fcmTokenSchema = z.object({
  token: z.string().min(1, "Token is required"),
  deviceId: z.string().min(1, "Device ID is required"),
  deviceName: z.string().max(100).optional(),
  platform: platformSchema,
});

/**
 * Email Preferences Schema
 */
const emailPreferencesSchema = z.object({
  enabled: z.boolean().optional(),
  address: z.string().email().optional(),
});

/**
 * Push Preferences Schema
 */
const pushPreferencesSchema = z.object({
  enabled: z.boolean().optional(),
  fcmTokens: z.array(fcmTokenSchema).optional(),
});

/**
 * In-App Preferences Schema
 */
const inAppPreferencesSchema = z.object({
  enabled: z.boolean().optional(),
  showBadge: z.boolean().optional(),
  playSound: z.boolean().optional(),
});

/**
 * Telegram Preferences Schema
 */
const telegramPreferencesSchema = z.object({
  enabled: z.boolean().optional(),
  chatId: z.string().optional(),
  username: z.string().optional(),
});

/**
 * Shift Reminders Preferences Schema
 */
const shiftRemindersSchema = z.object({
  enabled: z.boolean().optional(),
  reminderTimes: z.array(z.number().int().min(1).max(10080)).optional(), // Up to 1 week in minutes
  channels: z.array(notificationChannelSchema).optional(),
});

/**
 * Health Reminders Preferences Schema
 */
const healthRemindersSchema = z.object({
  enabled: z.boolean().optional(),
  reminderDays: z.array(z.number().int().min(1).max(365)).optional(),
  channels: z.array(notificationChannelSchema).optional(),
});

/**
 * Activity Updates Preferences Schema
 */
const activityUpdatesSchema = z.object({
  enabled: z.boolean().optional(),
  channels: z.array(notificationChannelSchema).optional(),
  onCreate: z.boolean().optional(),
  onUpdate: z.boolean().optional(),
  onCancel: z.boolean().optional(),
  onComplete: z.boolean().optional(),
});

/**
 * Summaries Preferences Schema
 */
const summariesSchema = z.object({
  dailySummary: z.boolean().optional(),
  dailySummaryTime: timeOfDaySchema.optional(),
  weeklySummary: z.boolean().optional(),
  weeklySummaryDay: z.number().int().min(0).max(6).optional(), // 0-6 (Sunday-Saturday)
  channels: z.array(notificationChannelSchema).optional(),
});

/**
 * Quiet Hours Schema
 */
const quietHoursSchema = z.object({
  enabled: z.boolean().optional(),
  start: timeOfDaySchema.optional(),
  end: timeOfDaySchema.optional(),
  timezone: z.string().max(50).optional(),
});

/**
 * Update Notification Preferences Input Schema
 */
export const updateNotificationPreferencesSchema = z.object({
  enabled: z.boolean().optional(),
  language: z.string().length(2).optional(), // ISO 639-1 language code
  email: emailPreferencesSchema.optional(),
  push: pushPreferencesSchema.optional(),
  inApp: inAppPreferencesSchema.optional(),
  telegram: telegramPreferencesSchema.optional(),
  shiftReminders: shiftRemindersSchema.optional(),
  healthReminders: healthRemindersSchema.optional(),
  activityUpdates: activityUpdatesSchema.optional(),
  summaries: summariesSchema.optional(),
  quietHours: quietHoursSchema.optional(),
});

/**
 * Mark Notification as Read Input Schema
 */
export const markAsReadSchema = z.object({
  notificationIds: z
    .array(z.string().min(1))
    .min(1, "At least one notification ID required"),
});

/**
 * Delete Notification Input Schema
 */
export const deleteNotificationsSchema = z.object({
  notificationIds: z
    .array(z.string().min(1))
    .min(1, "At least one notification ID required"),
});

/**
 * Query Parameters Schema for listing notifications
 */
export const listNotificationsQuerySchema = z.object({
  read: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  type: notificationTypeSchema.optional(),
  priority: notificationPrioritySchema.optional(),
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

// Export types inferred from schemas
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;
export type MarkAsReadInput = z.infer<typeof markAsReadSchema>;
export type DeleteNotificationsInput = z.infer<
  typeof deleteNotificationsSchema
>;
export type ListNotificationsQuery = z.infer<
  typeof listNotificationsQuerySchema
>;
