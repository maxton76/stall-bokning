"use strict";
/**
 * Notification delivery functions
 *
 * Provides multi-channel notification delivery:
 * - Email via SendGrid
 * - Push notifications via Firebase Cloud Messaging
 * - Telegram via Bot API
 * - In-app notifications via Firestore
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTelegramChatInfo =
  exports.verifyTelegramWebhook =
  exports.sendTelegramMessage =
  exports.sendMulticastPush =
  exports.sendPushNotification =
  exports.sendEmail =
  exports.cleanupOldNotifications =
  exports.retryFailedNotifications =
  exports.processNotificationQueue =
    void 0;
// Queue processor - triggers on new notification queue items
var processQueue_js_1 = require("./processQueue.js");
Object.defineProperty(exports, "processNotificationQueue", {
  enumerable: true,
  get: function () {
    return processQueue_js_1.processNotificationQueue;
  },
});
// Scheduled functions
var retryFailed_js_1 = require("./retryFailed.js");
Object.defineProperty(exports, "retryFailedNotifications", {
  enumerable: true,
  get: function () {
    return retryFailed_js_1.retryFailedNotifications;
  },
});
Object.defineProperty(exports, "cleanupOldNotifications", {
  enumerable: true,
  get: function () {
    return retryFailed_js_1.cleanupOldNotifications;
  },
});
// Individual senders (for direct use if needed)
var sendEmail_js_1 = require("./sendEmail.js");
Object.defineProperty(exports, "sendEmail", {
  enumerable: true,
  get: function () {
    return sendEmail_js_1.sendEmail;
  },
});
var sendPush_js_1 = require("./sendPush.js");
Object.defineProperty(exports, "sendPushNotification", {
  enumerable: true,
  get: function () {
    return sendPush_js_1.sendPushNotification;
  },
});
Object.defineProperty(exports, "sendMulticastPush", {
  enumerable: true,
  get: function () {
    return sendPush_js_1.sendMulticastPush;
  },
});
var sendTelegram_js_1 = require("./sendTelegram.js");
Object.defineProperty(exports, "sendTelegramMessage", {
  enumerable: true,
  get: function () {
    return sendTelegram_js_1.sendTelegramMessage;
  },
});
Object.defineProperty(exports, "verifyTelegramWebhook", {
  enumerable: true,
  get: function () {
    return sendTelegram_js_1.verifyTelegramWebhook;
  },
});
Object.defineProperty(exports, "getTelegramChatInfo", {
  enumerable: true,
  get: function () {
    return sendTelegram_js_1.getTelegramChatInfo;
  },
});
//# sourceMappingURL=index.js.map
