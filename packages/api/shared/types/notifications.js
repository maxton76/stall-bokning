/**
 * Default notification preferences
 */
export const DEFAULT_NOTIFICATION_PREFERENCES = {
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
 * Notification template definitions
 */
export const NOTIFICATION_TEMPLATES = {
  shift_reminder: {
    titleKey: "notifications.shiftReminder.title",
    bodyKey: "notifications.shiftReminder.body",
    priority: "normal",
    defaultChannels: ["inApp", "push"],
  },
  health_reminder: {
    titleKey: "notifications.healthReminder.title",
    bodyKey: "notifications.healthReminder.body",
    priority: "high",
    defaultChannels: ["inApp", "email"],
  },
  health_overdue: {
    titleKey: "notifications.healthOverdue.title",
    bodyKey: "notifications.healthOverdue.body",
    priority: "urgent",
    defaultChannels: ["inApp", "email", "push"],
  },
  shift_assigned: {
    titleKey: "notifications.shiftAssigned.title",
    bodyKey: "notifications.shiftAssigned.body",
    priority: "normal",
    defaultChannels: ["inApp"],
  },
  shift_missed: {
    titleKey: "notifications.shiftMissed.title",
    bodyKey: "notifications.shiftMissed.body",
    priority: "high",
    defaultChannels: ["inApp", "email"],
  },
  daily_summary: {
    titleKey: "notifications.dailySummary.title",
    bodyKey: "notifications.dailySummary.body",
    priority: "low",
    defaultChannels: ["email"],
  },
};
