import type { Timestamp } from "firebase/firestore";
/**
 * Notification Types for Activity Module
 * Supports shift reminders, health care alerts, and activity notifications
 */
/**
 * Notification delivery channels
 */
export type NotificationChannel = "email" | "push" | "inApp" | "telegram";
/**
 * Notification type categories
 */
export type NotificationType =
  | "shift_reminder"
  | "shift_assigned"
  | "shift_unassigned"
  | "shift_completed"
  | "shift_missed"
  | "health_reminder"
  | "health_overdue"
  | "activity_created"
  | "activity_updated"
  | "activity_cancelled"
  | "daily_summary"
  | "weekly_summary"
  | "system_alert";
/**
 * Notification priority levels
 */
export type NotificationPriority = "low" | "normal" | "high" | "urgent";
/**
 * Notification status
 */
export type NotificationStatus =
  | "pending"
  | "sent"
  | "failed"
  | "read"
  | "dismissed";
/**
 * Notification document
 * Stored in: notifications/{id}
 */
export interface Notification {
  id: string;
  userId: string;
  userEmail?: string;
  organizationId?: string;
  stableId?: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  titleKey?: string;
  body: string;
  bodyKey?: string;
  bodyParams?: Record<string, string>;
  entityType?:
    | "activity"
    | "recurringActivity"
    | "instance"
    | "horse"
    | "stable";
  entityId?: string;
  channels: NotificationChannel[];
  deliveryStatus: Record<NotificationChannel, NotificationStatus>;
  deliveryAttempts: number;
  lastDeliveryAttempt?: Timestamp;
  deliveredAt?: Timestamp;
  read: boolean;
  readAt?: Timestamp;
  actionUrl?: string;
  actionLabel?: string;
  actionLabelKey?: string;
  scheduledFor?: Timestamp;
  expiresAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
/**
 * Notification Queue Item
 * Stored in: notificationQueue/{id}
 * Processed by Cloud Function trigger
 */
export interface NotificationQueueItem {
  id: string;
  notificationId: string;
  userId: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  payload: {
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
  };
  emailTemplate?: string;
  emailData?: Record<string, unknown>;
  fcmToken?: string;
  telegramChatId?: string;
  status: "pending" | "processing" | "sent" | "failed";
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  processedAt?: Timestamp;
  scheduledFor: Timestamp;
  createdAt: Timestamp;
}
/**
 * User notification preferences
 * Stored in: users/{userId}/preferences/notifications
 * Or embedded in user document
 */
export interface NotificationPreferences {
  enabled: boolean;
  language: string;
  email: {
    enabled: boolean;
    address?: string;
  };
  push: {
    enabled: boolean;
    fcmTokens: FCMToken[];
  };
  inApp: {
    enabled: boolean;
    showBadge: boolean;
    playSound: boolean;
  };
  telegram: {
    enabled: boolean;
    chatId?: string;
    username?: string;
    verified: boolean;
  };
  shiftReminders: {
    enabled: boolean;
    reminderTimes: number[];
    channels: NotificationChannel[];
  };
  healthReminders: {
    enabled: boolean;
    reminderDays: number[];
    channels: NotificationChannel[];
  };
  activityUpdates: {
    enabled: boolean;
    channels: NotificationChannel[];
    onCreate: boolean;
    onUpdate: boolean;
    onCancel: boolean;
    onComplete: boolean;
  };
  summaries: {
    dailySummary: boolean;
    dailySummaryTime: string;
    weeklySummary: boolean;
    weeklySummaryDay: number;
    channels: NotificationChannel[];
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
}
/**
 * FCM Token for push notifications
 */
export interface FCMToken {
  token: string;
  deviceId: string;
  deviceName?: string;
  platform: "ios" | "android" | "web";
  createdAt: Timestamp;
  lastUsedAt: Timestamp;
}
/**
 * Default notification preferences
 */
export declare const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences;
/**
 * Create notification input (for API)
 */
export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  titleKey?: string;
  body: string;
  bodyKey?: string;
  bodyParams?: Record<string, string>;
  entityType?:
    | "activity"
    | "recurringActivity"
    | "instance"
    | "horse"
    | "stable";
  entityId?: string;
  channels?: NotificationChannel[];
  scheduledFor?: Date | string;
  expiresAt?: Date | string;
  actionUrl?: string;
  actionLabel?: string;
}
/**
 * Update notification preferences input
 */
export interface UpdateNotificationPreferencesInput {
  enabled?: boolean;
  language?: string;
  email?: Partial<NotificationPreferences["email"]>;
  push?: Partial<NotificationPreferences["push"]>;
  inApp?: Partial<NotificationPreferences["inApp"]>;
  telegram?: Partial<NotificationPreferences["telegram"]>;
  shiftReminders?: Partial<NotificationPreferences["shiftReminders"]>;
  healthReminders?: Partial<NotificationPreferences["healthReminders"]>;
  activityUpdates?: Partial<NotificationPreferences["activityUpdates"]>;
  summaries?: Partial<NotificationPreferences["summaries"]>;
  quietHours?: Partial<NotificationPreferences["quietHours"]>;
}
/**
 * Notification template definitions
 */
export declare const NOTIFICATION_TEMPLATES: {
  readonly shift_reminder: {
    readonly titleKey: "notifications.shiftReminder.title";
    readonly bodyKey: "notifications.shiftReminder.body";
    readonly priority: NotificationPriority;
    readonly defaultChannels: NotificationChannel[];
  };
  readonly health_reminder: {
    readonly titleKey: "notifications.healthReminder.title";
    readonly bodyKey: "notifications.healthReminder.body";
    readonly priority: NotificationPriority;
    readonly defaultChannels: NotificationChannel[];
  };
  readonly health_overdue: {
    readonly titleKey: "notifications.healthOverdue.title";
    readonly bodyKey: "notifications.healthOverdue.body";
    readonly priority: NotificationPriority;
    readonly defaultChannels: NotificationChannel[];
  };
  readonly shift_assigned: {
    readonly titleKey: "notifications.shiftAssigned.title";
    readonly bodyKey: "notifications.shiftAssigned.body";
    readonly priority: NotificationPriority;
    readonly defaultChannels: NotificationChannel[];
  };
  readonly shift_missed: {
    readonly titleKey: "notifications.shiftMissed.title";
    readonly bodyKey: "notifications.shiftMissed.body";
    readonly priority: NotificationPriority;
    readonly defaultChannels: NotificationChannel[];
  };
  readonly daily_summary: {
    readonly titleKey: "notifications.dailySummary.title";
    readonly bodyKey: "notifications.dailySummary.body";
    readonly priority: NotificationPriority;
    readonly defaultChannels: NotificationChannel[];
  };
};
//# sourceMappingURL=notifications.d.ts.map
