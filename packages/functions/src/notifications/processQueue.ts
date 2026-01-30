import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import * as crypto from "crypto";

import { db, Timestamp, FieldValue } from "../lib/firebase.js";
import { formatErrorMessage } from "@equiduty/shared";
import { sendEmail } from "./sendEmail.js";
import { sendPushNotification } from "./sendPush.js";
import { sendTelegramMessage } from "./sendTelegram.js";

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * Simple token bucket rate limiter for notification channels
 * Prevents hitting external API rate limits
 *
 * Rate limits per channel (per function instance):
 * - email: 100/minute (SendGrid limit is typically 100/sec for paid plans)
 * - push: 500/minute (FCM has much higher limits)
 * - telegram: 30/minute (Telegram bot API limit is ~30 msg/sec to same chat)
 */
interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

const rateLimits: Record<string, { maxTokens: number; refillRate: number }> = {
  email: { maxTokens: 100, refillRate: 100 / 60000 }, // 100 per minute
  push: { maxTokens: 500, refillRate: 500 / 60000 }, // 500 per minute
  telegram: { maxTokens: 30, refillRate: 30 / 60000 }, // 30 per minute
  inApp: { maxTokens: 1000, refillRate: 1000 / 60000 }, // No real limit for in-app
};

const buckets: Record<string, RateLimitBucket> = {};

/**
 * Check if we can send to a channel (and consume a token if yes)
 */
function checkRateLimit(channel: string): boolean {
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
function getRateLimitDelay(channel: string): number {
  const limit = rateLimits[channel];
  if (!limit) return 0;

  const bucket = buckets[channel];
  if (!bucket || bucket.tokens >= 1) return 0;

  // Calculate time until next token is available
  const tokensNeeded = 1 - bucket.tokens;
  return Math.ceil(tokensNeeded / limit.refillRate);
}

/**
 * Queue item data structure
 */
interface QueueItem {
  id: string;
  notificationId: string;
  userId: string;
  channel: string;
  priority: string;
  payload: {
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
  };
  fcmToken?: string;
  telegramChatId?: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  scheduledFor: Timestamp;
  createdAt: Timestamp;
}

/**
 * Get user's email address
 */
async function getUserEmail(userId: string): Promise<string | undefined> {
  const userDoc = await db.collection("users").doc(userId).get();
  return userDoc.exists ? userDoc.data()?.email : undefined;
}

/**
 * Get user's FCM tokens
 */
async function getUserFCMTokens(userId: string): Promise<string[]> {
  const prefsDoc = await db
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

  return fcmTokens.map((t: { token: string }) => t.token).filter(Boolean);
}

/**
 * Get user's Telegram chat ID
 */
async function getUserTelegramChatId(
  userId: string,
): Promise<string | undefined> {
  const prefsDoc = await db
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
async function updateDeliveryStatus(
  notificationId: string,
  channel: string,
  status: "sent" | "failed",
  error?: string,
): Promise<void> {
  const notificationRef = db.collection("notifications").doc(notificationId);

  await notificationRef.update({
    [`deliveryStatus.${channel}`]: status,
    deliveryAttempts: FieldValue.increment(1),
    lastDeliveryAttempt: Timestamp.now(),
    ...(status === "sent" && { deliveredAt: Timestamp.now() }),
    updatedAt: Timestamp.now(),
  });
}

/**
 * Remove invalid FCM token from user preferences
 */
async function removeInvalidFCMToken(
  userId: string,
  invalidToken: string,
): Promise<void> {
  const prefsRef = db
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

  const updatedTokens = fcmTokens.filter(
    (t: { token: string }) => t.token !== invalidToken,
  );

  await prefsRef.update({
    "push.fcmTokens": updatedTokens,
    updatedAt: Timestamp.now(),
  });

  logger.info(
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
async function removeInvalidTelegramChat(userId: string): Promise<void> {
  const prefsRef = db
    .collection("users")
    .doc(userId)
    .collection("preferences")
    .doc("notifications");

  await prefsRef.update({
    "telegram.chatId": FieldValue.delete(),
    "telegram.verified": false,
    updatedAt: Timestamp.now(),
  });

  logger.info({ userId }, "Removed invalid Telegram chat ID");
}

/**
 * Process a single queue item
 */
async function processQueueItem(
  queueItemRef: FirebaseFirestore.DocumentReference,
  queueItem: QueueItem,
  executionId: string,
): Promise<void> {
  const { channel, userId, payload, notificationId } = queueItem;

  logger.info(
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
    logger.warn(
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
      scheduledFor: Timestamp.fromMillis(Date.now() + delayMs + 1000),
      lastError: `Rate limited, retrying after ${Math.ceil(delayMs / 1000)}s`,
    });

    return;
  }

  // Mark as processing
  await queueItemRef.update({
    status: "processing",
    attempts: FieldValue.increment(1),
  });

  let success = false;
  let error: string | undefined;

  try {
    switch (channel) {
      case "email": {
        const email = await getUserEmail(userId);

        if (!email) {
          error = "User email not found";
          break;
        }

        const result = await sendEmail(
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

        const result = await sendPushNotification(fcmToken, {
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

        const result = await sendTelegramMessage(chatId, {
          title: payload.title,
          body: payload.body,
          actionUrl: payload.data?.actionUrl,
        });

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
    error = formatErrorMessage(err);
    logger.error(
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
    processedAt: Timestamp.now(),
  });

  // Update notification delivery status
  await updateDeliveryStatus(notificationId, channel, finalStatus, error);

  logger.info(
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
export const processNotificationQueue = onDocumentCreated(
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
      logger.warn({ executionId }, "No data in queue item");
      return;
    }

    const queueItem = {
      id: snapshot.id,
      ...snapshot.data(),
    } as QueueItem;

    // Check if already processed (idempotency)
    if (queueItem.status !== "pending") {
      logger.info(
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
      logger.warn(
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
        processedAt: Timestamp.now(),
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
      logger.info(
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
export { retryFailedNotifications } from "./retryFailed.js";
