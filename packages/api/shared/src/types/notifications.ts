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
  | "shift_reminder" // Upcoming shift/activity reminder
  | "shift_assigned" // New shift assigned to user
  | "shift_unassigned" // Shift removed from user
  | "shift_completed" // Activity marked as completed
  | "shift_missed" // Overdue activity not completed
  | "health_reminder" // Health care due (farrier, vet, vaccine)
  | "health_overdue" // Health care past due
  | "activity_created" // New activity created
  | "activity_updated" // Activity modified
  | "activity_cancelled" // Activity cancelled
  | "daily_summary" // Daily task summary
  | "weekly_summary" // Weekly summary
  | "system_alert"; // System-level alerts

/**
 * Notification priority levels
 */
export type NotificationPriority = "low" | "normal" | "high" | "urgent";

/**
 * Notification status
 */
export type NotificationStatus =
  | "pending" // Queued for delivery
  | "sent" // Successfully delivered
  | "failed" // Delivery failed
  | "read" // User has read it (for inApp)
  | "dismissed"; // User dismissed it

/**
 * Notification document
 * Stored in: notifications/{id}
 */
export interface Notification {
  id: string;
  userId: string; // Target user
  userEmail?: string; // Cached for email delivery
  organizationId?: string;
  stableId?: string;

  // Content
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  titleKey?: string; // i18n key for localized title
  body: string;
  bodyKey?: string; // i18n key for localized body
  bodyParams?: Record<string, string>; // Parameters for i18n interpolation

  // Reference to source entity
  entityType?:
    | "activity"
    | "recurringActivity"
    | "instance"
    | "horse"
    | "stable";
  entityId?: string;

  // Delivery tracking
  channels: NotificationChannel[];
  deliveryStatus: Record<NotificationChannel, NotificationStatus>;
  deliveryAttempts: number;
  lastDeliveryAttempt?: Timestamp;
  deliveredAt?: Timestamp;

  // For in-app notifications
  read: boolean;
  readAt?: Timestamp;

  // Action URL (deep link in app)
  actionUrl?: string;
  actionLabel?: string;
  actionLabelKey?: string;

  // Metadata
  scheduledFor?: Timestamp; // For scheduled delivery
  expiresAt?: Timestamp; // Auto-dismiss after this time
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
  notificationId: string; // Reference to notification document
  userId: string;
  channel: NotificationChannel;
  priority: NotificationPriority;

  // Delivery payload
  payload: {
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
  };

  // For email
  emailTemplate?: string;
  emailData?: Record<string, unknown>;

  // For push
  fcmToken?: string;

  // For telegram
  telegramChatId?: string;

  // Processing
  status: "pending" | "processing" | "sent" | "failed";
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  processedAt?: Timestamp;

  // Scheduling
  scheduledFor: Timestamp;
  createdAt: Timestamp;
}

/**
 * User notification preferences
 * Stored in: users/{userId}/preferences/notifications
 * Or embedded in user document
 */
export interface NotificationPreferences {
  // Global settings
  enabled: boolean;
  language: string; // Preferred language for notifications

  // Channel preferences
  email: {
    enabled: boolean;
    address?: string; // Override email address
  };

  push: {
    enabled: boolean;
    fcmTokens: FCMToken[]; // Multiple devices
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

  // Category-specific settings
  shiftReminders: {
    enabled: boolean;
    reminderTimes: number[]; // Minutes before (e.g., [1440, 120] = 24h and 2h)
    channels: NotificationChannel[];
  };

  healthReminders: {
    enabled: boolean;
    reminderDays: number[]; // Days before due (e.g., [7, 1] = 1 week and 1 day)
    channels: NotificationChannel[];
  };

  activityUpdates: {
    enabled: boolean;
    channels: NotificationChannel[];
    // Which updates to receive
    onCreate: boolean;
    onUpdate: boolean;
    onCancel: boolean;
    onComplete: boolean;
  };

  summaries: {
    dailySummary: boolean;
    dailySummaryTime: string; // "HH:MM" format
    weeklySummary: boolean;
    weeklySummaryDay: number; // 0-6 (Sunday-Saturday)
    channels: NotificationChannel[];
  };

  // Quiet hours (no notifications during this time)
  quietHours: {
    enabled: boolean;
    start: string; // "HH:MM" format
    end: string; // "HH:MM" format
    timezone: string; // Default: "Europe/Stockholm"
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
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  language: "sv",

  email: {
    enabled: true,
  },

  push: {
    enabled: true,
    fcmTokens: [],
  },

  inApp: {
    enabled: true,
    showBadge: true,
    playSound: true,
  },

  telegram: {
    enabled: false,
    verified: false,
  },

  shiftReminders: {
    enabled: true,
    reminderTimes: [1440, 120], // 24h and 2h before
    channels: ["inApp", "push", "email"],
  },

  healthReminders: {
    enabled: true,
    reminderDays: [7, 1], // 1 week and 1 day before
    channels: ["inApp", "email"],
  },

  activityUpdates: {
    enabled: true,
    channels: ["inApp"],
    onCreate: false,
    onUpdate: true,
    onCancel: true,
    onComplete: false,
  },

  summaries: {
    dailySummary: false,
    dailySummaryTime: "07:00",
    weeklySummary: false,
    weeklySummaryDay: 0, // Sunday
    channels: ["email"],
  },

  quietHours: {
    enabled: true,
    start: "22:00",
    end: "07:00",
    timezone: "Europe/Stockholm",
  },
};

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
export const NOTIFICATION_TEMPLATES = {
  shift_reminder: {
    titleKey: "notifications.shiftReminder.title",
    bodyKey: "notifications.shiftReminder.body",
    priority: "normal" as NotificationPriority,
    defaultChannels: ["inApp", "push"] as NotificationChannel[],
  },
  health_reminder: {
    titleKey: "notifications.healthReminder.title",
    bodyKey: "notifications.healthReminder.body",
    priority: "high" as NotificationPriority,
    defaultChannels: ["inApp", "email"] as NotificationChannel[],
  },
  health_overdue: {
    titleKey: "notifications.healthOverdue.title",
    bodyKey: "notifications.healthOverdue.body",
    priority: "urgent" as NotificationPriority,
    defaultChannels: ["inApp", "email", "push"] as NotificationChannel[],
  },
  shift_assigned: {
    titleKey: "notifications.shiftAssigned.title",
    bodyKey: "notifications.shiftAssigned.body",
    priority: "normal" as NotificationPriority,
    defaultChannels: ["inApp"] as NotificationChannel[],
  },
  shift_missed: {
    titleKey: "notifications.shiftMissed.title",
    bodyKey: "notifications.shiftMissed.body",
    priority: "high" as NotificationPriority,
    defaultChannels: ["inApp", "email"] as NotificationChannel[],
  },
  daily_summary: {
    titleKey: "notifications.dailySummary.title",
    bodyKey: "notifications.dailySummary.body",
    priority: "low" as NotificationPriority,
    defaultChannels: ["email"] as NotificationChannel[],
  },
} as const;
