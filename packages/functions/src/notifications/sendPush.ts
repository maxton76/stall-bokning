import { getMessaging } from "firebase-admin/messaging";
import { logger } from "firebase-functions";

import { formatErrorMessage } from "../lib/errors.js";

/**
 * Push notification payload
 */
interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  actionUrl?: string;
}

/**
 * Send push notification via Firebase Cloud Messaging
 */
export async function sendPushNotification(
  fcmToken: string,
  payload: PushPayload,
): Promise<{ success: boolean; error?: string; invalidToken?: boolean }> {
  if (!fcmToken) {
    return {
      success: false,
      error: "FCM token is required",
    };
  }

  try {
    const messaging = getMessaging();

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
        priority: "high" as const,
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

    logger.info(
      {
        messageId: response,
        title: payload.title,
      },
      "Push notification sent successfully",
    );

    return { success: true };
  } catch (error) {
    const errorCode = (error as { code?: string }).code;
    const errorMessage = formatErrorMessage(error);

    // Check for invalid token errors
    const isInvalidToken = [
      "messaging/invalid-registration-token",
      "messaging/registration-token-not-registered",
      "messaging/invalid-argument",
    ].includes(errorCode || "");

    if (isInvalidToken) {
      logger.warn(
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

    logger.error(
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
export async function sendMulticastPush(
  fcmTokens: string[],
  payload: PushPayload,
): Promise<{
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
}> {
  if (!fcmTokens.length) {
    return {
      successCount: 0,
      failureCount: 0,
      invalidTokens: [],
    };
  }

  try {
    const messaging = getMessaging();

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
        priority: "high" as const,
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
    const invalidTokens: string[] = [];
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

    logger.info(
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
    const errorMessage = formatErrorMessage(error);
    logger.error(
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
