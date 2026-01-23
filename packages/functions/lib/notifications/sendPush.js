"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushNotification = sendPushNotification;
exports.sendMulticastPush = sendMulticastPush;
const messaging_1 = require("firebase-admin/messaging");
const firebase_functions_1 = require("firebase-functions");
const shared_1 = require("@stall-bokning/shared");
/**
 * Send push notification via Firebase Cloud Messaging
 */
async function sendPushNotification(fcmToken, payload) {
  if (!fcmToken) {
    return {
      success: false,
      error: "FCM token is required",
    };
  }
  try {
    const messaging = (0, messaging_1.getMessaging)();
    // Build the message
    const message = {
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
      },
      data: {
        ...payload.data,
        ...(payload.actionUrl && { actionUrl: payload.actionUrl }),
        // Add timestamp for client-side handling
        timestamp: new Date().toISOString(),
      },
      // Android-specific options
      android: {
        priority: "high",
        notification: {
          icon: "notification_icon",
          color: "#4F46E5",
          sound: "default",
          channelId: "stallbokning_notifications",
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
      // APNs (iOS) specific options
      apns: {
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.body,
            },
            sound: "default",
            badge: 1,
            contentAvailable: true,
          },
        },
        headers: {
          "apns-priority": "10",
        },
      },
      // Web push specific options
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: "/icons/notification-icon.png",
          badge: "/icons/badge-icon.png",
          tag: payload.data?.type || "notification",
          requireInteraction: false,
        },
        fcmOptions: {
          link: payload.actionUrl || "/",
        },
      },
    };
    const response = await messaging.send(message);
    firebase_functions_1.logger.info(
      {
        messageId: response,
        title: payload.title,
      },
      "Push notification sent successfully",
    );
    return { success: true };
  } catch (error) {
    const errorCode = error.code;
    const errorMessage = (0, shared_1.formatErrorMessage)(error);
    // Check for invalid token errors
    const isInvalidToken = [
      "messaging/invalid-registration-token",
      "messaging/registration-token-not-registered",
      "messaging/invalid-argument",
    ].includes(errorCode || "");
    if (isInvalidToken) {
      firebase_functions_1.logger.warn(
        {
          error: errorMessage,
          errorCode,
        },
        "Invalid FCM token - should be removed",
      );
      return {
        success: false,
        error: errorMessage,
        invalidToken: true,
      };
    }
    firebase_functions_1.logger.error(
      {
        error: errorMessage,
        errorCode,
      },
      "Failed to send push notification",
    );
    return {
      success: false,
      error: errorMessage,
    };
  }
}
/**
 * Send push notification to multiple tokens (multicast)
 */
async function sendMulticastPush(fcmTokens, payload) {
  if (!fcmTokens.length) {
    return {
      successCount: 0,
      failureCount: 0,
      invalidTokens: [],
    };
  }
  try {
    const messaging = (0, messaging_1.getMessaging)();
    // Build the multicast message
    const message = {
      tokens: fcmTokens,
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
      },
      data: {
        ...payload.data,
        ...(payload.actionUrl && { actionUrl: payload.actionUrl }),
        timestamp: new Date().toISOString(),
      },
      android: {
        priority: "high",
        notification: {
          icon: "notification_icon",
          color: "#4F46E5",
          sound: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.body,
            },
            sound: "default",
            badge: 1,
          },
        },
      },
    };
    const response = await messaging.sendEachForMulticast(message);
    // Collect invalid tokens
    const invalidTokens = [];
    response.responses.forEach((resp, index) => {
      if (!resp.success) {
        const errorCode = resp.error?.code;
        if (
          errorCode === "messaging/invalid-registration-token" ||
          errorCode === "messaging/registration-token-not-registered"
        ) {
          invalidTokens.push(fcmTokens[index]);
        }
      }
    });
    firebase_functions_1.logger.info(
      {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokenCount: invalidTokens.length,
      },
      "Multicast push notification sent",
    );
    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      invalidTokens,
    };
  } catch (error) {
    const errorMessage = (0, shared_1.formatErrorMessage)(error);
    firebase_functions_1.logger.error(
      {
        error: errorMessage,
        tokenCount: fcmTokens.length,
      },
      "Failed to send multicast push notification",
    );
    return {
      successCount: 0,
      failureCount: fcmTokens.length,
      invalidTokens: [],
    };
  }
}
//# sourceMappingURL=sendPush.js.map
