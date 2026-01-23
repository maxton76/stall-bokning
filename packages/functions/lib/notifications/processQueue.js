"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o)
            if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryFailedNotifications = exports.processNotificationQueue = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firebase_functions_1 = require("firebase-functions");
const crypto = __importStar(require("crypto"));
const firebase_js_1 = require("../lib/firebase.js");
const shared_1 = require("@stall-bokning/shared");
const sendEmail_js_1 = require("./sendEmail.js");
const sendPush_js_1 = require("./sendPush.js");
const sendTelegram_js_1 = require("./sendTelegram.js");
const rateLimits = {
  email: { maxTokens: 100, refillRate: 100 / 60000 }, // 100 per minute
  push: { maxTokens: 500, refillRate: 500 / 60000 }, // 500 per minute
  telegram: { maxTokens: 30, refillRate: 30 / 60000 }, // 30 per minute
  inApp: { maxTokens: 1000, refillRate: 1000 / 60000 }, // No real limit for in-app
};
const buckets = {};
/**
 * Check if we can send to a channel (and consume a token if yes)
 */
function checkRateLimit(channel) {
  const limit = rateLimits[channel];
  if (!limit) return true; // Unknown channel, allow
  const now = Date.now();
  let bucket = buckets[channel];
  if (!bucket) {
    bucket = { tokens: limit.maxTokens, lastRefill: now };
    buckets[channel] = bucket;
  }
  // Refill tokens based on time passed
  const elapsed = now - bucket.lastRefill;
  const refillAmount = elapsed * limit.refillRate;
  bucket.tokens = Math.min(limit.maxTokens, bucket.tokens + refillAmount);
  bucket.lastRefill = now;
  // Check if we have tokens
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return true;
  }
  return false;
}
/**
 * Calculate delay needed before sending (for retry scenarios)
 */
function getRateLimitDelay(channel) {
  const limit = rateLimits[channel];
  if (!limit) return 0;
  const bucket = buckets[channel];
  if (!bucket || bucket.tokens >= 1) return 0;
  // Calculate time until next token is available
  const tokensNeeded = 1 - bucket.tokens;
  return Math.ceil(tokensNeeded / limit.refillRate);
}
/**
 * Get user's email address
 */
async function getUserEmail(userId) {
  const userDoc = await firebase_js_1.db.collection("users").doc(userId).get();
  return userDoc.exists ? userDoc.data()?.email : undefined;
}
/**
 * Get user's FCM tokens
 */
async function getUserFCMTokens(userId) {
  const prefsDoc = await firebase_js_1.db
    .collection("users")
    .doc(userId)
    .collection("preferences")
    .doc("notifications")
    .get();
  if (!prefsDoc.exists) {
    return [];
  }
  const prefs = prefsDoc.data();
  const fcmTokens = prefs?.push?.fcmTokens || [];
  return fcmTokens.map((t) => t.token).filter(Boolean);
}
/**
 * Get user's Telegram chat ID
 */
async function getUserTelegramChatId(userId) {
  const prefsDoc = await firebase_js_1.db
    .collection("users")
    .doc(userId)
    .collection("preferences")
    .doc("notifications")
    .get();
  if (!prefsDoc.exists) {
    return undefined;
  }
  const prefs = prefsDoc.data();
  if (!prefs?.telegram?.enabled || !prefs?.telegram?.verified) {
    return undefined;
  }
  return prefs.telegram.chatId;
}
/**
 * Update notification delivery status
 */
async function updateDeliveryStatus(notificationId, channel, status, error) {
  const notificationRef = firebase_js_1.db
    .collection("notifications")
    .doc(notificationId);
  await notificationRef.update({
    [`deliveryStatus.${channel}`]: status,
    deliveryAttempts: firebase_js_1.FieldValue.increment(1),
    lastDeliveryAttempt: firebase_js_1.Timestamp.now(),
    ...(status === "sent" && { deliveredAt: firebase_js_1.Timestamp.now() }),
    updatedAt: firebase_js_1.Timestamp.now(),
  });
}
/**
 * Remove invalid FCM token from user preferences
 */
async function removeInvalidFCMToken(userId, invalidToken) {
  const prefsRef = firebase_js_1.db
    .collection("users")
    .doc(userId)
    .collection("preferences")
    .doc("notifications");
  const prefsDoc = await prefsRef.get();
  if (!prefsDoc.exists) {
    return;
  }
  const prefs = prefsDoc.data();
  const fcmTokens = prefs?.push?.fcmTokens || [];
  const updatedTokens = fcmTokens.filter((t) => t.token !== invalidToken);
  await prefsRef.update({
    "push.fcmTokens": updatedTokens,
    updatedAt: firebase_js_1.Timestamp.now(),
  });
  firebase_functions_1.logger.info(
    {
      userId,
      removedToken: invalidToken.substring(0, 20) + "...",
    },
    "Removed invalid FCM token",
  );
}
/**
 * Remove invalid Telegram chat ID from user preferences
 */
async function removeInvalidTelegramChat(userId) {
  const prefsRef = firebase_js_1.db
    .collection("users")
    .doc(userId)
    .collection("preferences")
    .doc("notifications");
  await prefsRef.update({
    "telegram.chatId": firebase_js_1.FieldValue.delete(),
    "telegram.verified": false,
    updatedAt: firebase_js_1.Timestamp.now(),
  });
  firebase_functions_1.logger.info(
    { userId },
    "Removed invalid Telegram chat ID",
  );
}
/**
 * Process a single queue item
 */
async function processQueueItem(queueItemRef, queueItem, executionId) {
  const { channel, userId, payload, notificationId } = queueItem;
  firebase_functions_1.logger.info(
    {
      executionId,
      queueItemId: queueItem.id,
      channel,
      userId,
    },
    "Processing notification queue item",
  );
  // Check rate limit before processing
  if (!checkRateLimit(channel)) {
    const delayMs = getRateLimitDelay(channel);
    firebase_functions_1.logger.warn(
      {
        executionId,
        queueItemId: queueItem.id,
        channel,
        delayMs,
      },
      "Rate limit exceeded, will retry later",
    );
    // Reschedule for later
    await queueItemRef.update({
      status: "pending",
      scheduledFor: firebase_js_1.Timestamp.fromMillis(
        Date.now() + delayMs + 1000,
      ),
      lastError: `Rate limited, retrying after ${Math.ceil(delayMs / 1000)}s`,
    });
    return;
  }
  // Mark as processing
  await queueItemRef.update({
    status: "processing",
    attempts: firebase_js_1.FieldValue.increment(1),
  });
  let success = false;
  let error;
  try {
    switch (channel) {
      case "email": {
        const email = await getUserEmail(userId);
        if (!email) {
          error = "User email not found";
          break;
        }
        const result = await (0, sendEmail_js_1.sendEmail)(
          {
            to: email,
            subject: payload.title,
            body: payload.body,
          },
          payload.data?.actionUrl,
        );
        success = result.success;
        error = result.error;
        break;
      }
      case "push": {
        // Get FCM token from queue item or fetch from user preferences
        let fcmToken = queueItem.fcmToken;
        if (!fcmToken) {
          const tokens = await getUserFCMTokens(userId);
          fcmToken = tokens[0]; // Use first token, or consider multicast
        }
        if (!fcmToken) {
          error = "No FCM token available";
          break;
        }
        const result = await (0, sendPush_js_1.sendPushNotification)(fcmToken, {
          title: payload.title,
          body: payload.body,
          data: payload.data,
          imageUrl: payload.imageUrl,
          actionUrl: payload.data?.actionUrl,
        });
        success = result.success;
        error = result.error;
        // Remove invalid token if detected
        if (result.invalidToken) {
          await removeInvalidFCMToken(userId, fcmToken);
        }
        break;
      }
      case "telegram": {
        // Get Telegram chat ID from queue item or fetch from user preferences
        let chatId = queueItem.telegramChatId;
        if (!chatId) {
          chatId = await getUserTelegramChatId(userId);
        }
        if (!chatId) {
          error = "Telegram chat ID not available or not verified";
          break;
        }
        const result = await (0, sendTelegram_js_1.sendTelegramMessage)(
          chatId,
          {
            title: payload.title,
            body: payload.body,
            actionUrl: payload.data?.actionUrl,
          },
        );
        success = result.success;
        error = result.error;
        // Remove invalid chat if detected
        if (result.invalidChat) {
          await removeInvalidTelegramChat(userId);
        }
        break;
      }
      case "inApp": {
        // In-app notifications are already stored in the notifications collection
        // Just mark as sent since the notification document already exists
        success = true;
        break;
      }
      default:
        error = `Unknown channel: ${channel}`;
    }
  } catch (err) {
    error = (0, shared_1.formatErrorMessage)(err);
    firebase_functions_1.logger.error(
      {
        executionId,
        queueItemId: queueItem.id,
        error,
      },
      "Error processing queue item",
    );
  }
  // Update queue item status
  const finalStatus = success ? "sent" : "failed";
  await queueItemRef.update({
    status: finalStatus,
    ...(error && { lastError: error }),
    processedAt: firebase_js_1.Timestamp.now(),
  });
  // Update notification delivery status
  await updateDeliveryStatus(notificationId, channel, finalStatus, error);
  firebase_functions_1.logger.info(
    {
      executionId,
      queueItemId: queueItem.id,
      channel,
      success,
      error,
    },
    "Queue item processed",
  );
}
/**
 * Notification Queue Processor
 * Triggers when a new document is created in notificationQueue collection
 */
exports.processNotificationQueue = (0, firestore_1.onDocumentCreated)(
  {
    document: "notificationQueue/{queueItemId}",
    region: "europe-west1",
    // Set reasonable memory and timeout
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async (event) => {
    const executionId = crypto.randomUUID();
    const snapshot = event.data;
    if (!snapshot) {
      firebase_functions_1.logger.warn(
        { executionId },
        "No data in queue item",
      );
      return;
    }
    const queueItem = {
      id: snapshot.id,
      ...snapshot.data(),
    };
    // Check if already processed (idempotency)
    if (queueItem.status !== "pending") {
      firebase_functions_1.logger.info(
        {
          executionId,
          queueItemId: queueItem.id,
          status: queueItem.status,
        },
        "Queue item already processed",
      );
      return;
    }
    // Check if max attempts reached
    if (queueItem.attempts >= queueItem.maxAttempts) {
      firebase_functions_1.logger.warn(
        {
          executionId,
          queueItemId: queueItem.id,
          attempts: queueItem.attempts,
        },
        "Max delivery attempts reached",
      );
      await snapshot.ref.update({
        status: "failed",
        lastError: "Max delivery attempts reached",
        processedAt: firebase_js_1.Timestamp.now(),
      });
      await updateDeliveryStatus(
        queueItem.notificationId,
        queueItem.channel,
        "failed",
        "Max delivery attempts reached",
      );
      return;
    }
    // Check scheduled time (don't process if scheduled for future)
    const scheduledFor = queueItem.scheduledFor?.toDate();
    if (scheduledFor && scheduledFor > new Date()) {
      firebase_functions_1.logger.info(
        {
          executionId,
          queueItemId: queueItem.id,
          scheduledFor: scheduledFor.toISOString(),
        },
        "Queue item scheduled for future - skipping",
      );
      return;
    }
    // Process the queue item
    await processQueueItem(snapshot.ref, queueItem, executionId);
  },
);
/**
 * Retry failed notifications
 * Runs every hour to retry failed notifications that haven't exceeded max attempts
 */
var retryFailed_js_1 = require("./retryFailed.js");
Object.defineProperty(exports, "retryFailedNotifications", {
  enumerable: true,
  get: function () {
    return retryFailed_js_1.retryFailedNotifications;
  },
});
//# sourceMappingURL=processQueue.js.map
