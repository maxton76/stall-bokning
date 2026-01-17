/**
 * Notification delivery functions
 *
 * Provides multi-channel notification delivery:
 * - Email via SendGrid
 * - Push notifications via Firebase Cloud Messaging
 * - Telegram via Bot API
 * - In-app notifications via Firestore
 */

// Queue processor - triggers on new notification queue items
export { processNotificationQueue } from "./processQueue.js";

// Scheduled functions
export {
  retryFailedNotifications,
  cleanupOldNotifications,
} from "./retryFailed.js";

// Individual senders (for direct use if needed)
export { sendEmail } from "./sendEmail.js";
export { sendPushNotification, sendMulticastPush } from "./sendPush.js";
export {
  sendTelegramMessage,
  verifyTelegramWebhook,
  getTelegramChatInfo,
} from "./sendTelegram.js";
