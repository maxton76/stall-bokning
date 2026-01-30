import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { serializeTimestamps } from "../utils/serialization.js";
import type {
  CreateNotificationInput,
  UpdateNotificationPreferencesInput,
} from "@equiduty/shared";

export async function notificationsRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================

  /**
   * GET /api/v1/notifications
   * Get notifications for the current user
   */
  fastify.get(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const {
          limit: limitParam,
          unreadOnly,
          stableId,
        } = request.query as {
          limit?: string;
          unreadOnly?: string;
          stableId?: string;
        };
        const user = (request as AuthenticatedRequest).user!;

        const limitCount = limitParam ? parseInt(limitParam, 10) : 50;
        if (isNaN(limitCount) || limitCount < 1 || limitCount > 100) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Limit must be between 1 and 100",
          });
        }

        let query = db
          .collection("notifications")
          .where("userId", "==", user.uid);

        if (unreadOnly === "true") {
          query = query.where("read", "==", false) as any;
        }
        if (stableId) {
          query = query.where("stableId", "==", stableId) as any;
        }

        query = query.orderBy("createdAt", "desc").limit(limitCount) as any;

        const snapshot = await query.get();

        const notifications = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { notifications };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch notifications");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch notifications",
        });
      }
    },
  );

  /**
   * GET /api/v1/notifications/unread-count
   * Get count of unread notifications
   */
  fastify.get(
    "/unread-count",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;

        const snapshot = await db
          .collection("notifications")
          .where("userId", "==", user.uid)
          .where("read", "==", false)
          .count()
          .get();

        return { count: snapshot.data().count };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch unread count");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch unread count",
        });
      }
    },
  );

  /**
   * PATCH /api/v1/notifications/:id/read
   * Mark a notification as read
   */
  fastify.patch(
    "/:id/read",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        const doc = await db.collection("notifications").doc(id).get();
        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Notification not found",
          });
        }

        const notification = doc.data()!;
        if (notification.userId !== user.uid && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You can only mark your own notifications as read",
          });
        }

        await db.collection("notifications").doc(id).update({
          read: true,
          readAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        return { success: true };
      } catch (error) {
        request.log.error({ error }, "Failed to mark notification as read");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to mark notification as read",
        });
      }
    },
  );

  /**
   * PATCH /api/v1/notifications/read-all
   * Mark all notifications as read
   */
  fastify.patch(
    "/read-all",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;

        const snapshot = await db
          .collection("notifications")
          .where("userId", "==", user.uid)
          .where("read", "==", false)
          .get();

        if (snapshot.empty) {
          return { success: true, count: 0 };
        }

        const batch = db.batch();
        const now = Timestamp.now();

        snapshot.docs.forEach((doc) => {
          batch.update(doc.ref, {
            read: true,
            readAt: now,
            updatedAt: now,
          });
        });

        await batch.commit();

        return { success: true, count: snapshot.size };
      } catch (error) {
        request.log.error(
          { error },
          "Failed to mark all notifications as read",
        );
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to mark notifications as read",
        });
      }
    },
  );

  /**
   * DELETE /api/v1/notifications/:id
   * Delete a notification
   */
  fastify.delete(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        const doc = await db.collection("notifications").doc(id).get();
        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Notification not found",
          });
        }

        const notification = doc.data()!;
        if (notification.userId !== user.uid && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You can only delete your own notifications",
          });
        }

        await db.collection("notifications").doc(id).delete();

        return { success: true };
      } catch (error) {
        request.log.error({ error }, "Failed to delete notification");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete notification",
        });
      }
    },
  );

  /**
   * DELETE /api/v1/notifications/clear-read
   * Clear all read notifications
   */
  fastify.delete(
    "/clear-read",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;

        const snapshot = await db
          .collection("notifications")
          .where("userId", "==", user.uid)
          .where("read", "==", true)
          .get();

        if (snapshot.empty) {
          return { success: true, count: 0 };
        }

        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });

        await batch.commit();

        return { success: true, count: snapshot.size };
      } catch (error) {
        request.log.error({ error }, "Failed to clear read notifications");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to clear notifications",
        });
      }
    },
  );

  // ============================================================================
  // NOTIFICATION PREFERENCES
  // ============================================================================

  /**
   * GET /api/v1/notifications/preferences
   * Get notification preferences for the current user
   */
  fastify.get(
    "/preferences",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;

        const doc = await db
          .collection("users")
          .doc(user.uid)
          .collection("preferences")
          .doc("notifications")
          .get();

        if (!doc.exists) {
          // Return default preferences
          return {
            preferences: {
              enabled: true,
              language: "sv",
              email: { enabled: true },
              push: { enabled: true, fcmTokens: [] },
              inApp: { enabled: true, showBadge: true, playSound: true },
              telegram: { enabled: false, verified: false },
              shiftReminders: {
                enabled: true,
                reminderTimes: [1440, 120],
                channels: ["inApp", "push", "email"],
              },
              healthReminders: {
                enabled: true,
                reminderDays: [7, 1],
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
                weeklySummaryDay: 0,
                channels: ["email"],
              },
              quietHours: {
                enabled: true,
                start: "22:00",
                end: "07:00",
                timezone: "Europe/Stockholm",
              },
            },
          };
        }

        return { preferences: doc.data() };
      } catch (error) {
        request.log.error(
          { error },
          "Failed to fetch notification preferences",
        );
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch preferences",
        });
      }
    },
  );

  /**
   * PUT /api/v1/notifications/preferences
   * Update notification preferences
   */
  fastify.put(
    "/preferences",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const input = request.body as UpdateNotificationPreferencesInput;

        const prefRef = db
          .collection("users")
          .doc(user.uid)
          .collection("preferences")
          .doc("notifications");

        const existingDoc = await prefRef.get();
        const existingData = existingDoc.exists ? existingDoc.data() : {};

        // Deep merge preferences
        const updatedPreferences = {
          ...existingData,
          ...input,
          email: input.email
            ? { ...existingData?.email, ...input.email }
            : existingData?.email,
          push: input.push
            ? { ...existingData?.push, ...input.push }
            : existingData?.push,
          inApp: input.inApp
            ? { ...existingData?.inApp, ...input.inApp }
            : existingData?.inApp,
          telegram: input.telegram
            ? { ...existingData?.telegram, ...input.telegram }
            : existingData?.telegram,
          shiftReminders: input.shiftReminders
            ? { ...existingData?.shiftReminders, ...input.shiftReminders }
            : existingData?.shiftReminders,
          healthReminders: input.healthReminders
            ? { ...existingData?.healthReminders, ...input.healthReminders }
            : existingData?.healthReminders,
          activityUpdates: input.activityUpdates
            ? { ...existingData?.activityUpdates, ...input.activityUpdates }
            : existingData?.activityUpdates,
          summaries: input.summaries
            ? { ...existingData?.summaries, ...input.summaries }
            : existingData?.summaries,
          quietHours: input.quietHours
            ? { ...existingData?.quietHours, ...input.quietHours }
            : existingData?.quietHours,
          updatedAt: Timestamp.now(),
        };

        await prefRef.set(updatedPreferences, { merge: true });

        return { preferences: updatedPreferences };
      } catch (error) {
        request.log.error(
          { error },
          "Failed to update notification preferences",
        );
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update preferences",
        });
      }
    },
  );

  /**
   * POST /api/v1/notifications/preferences/fcm-token
   * Register FCM token for push notifications
   */
  fastify.post(
    "/preferences/fcm-token",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { token, deviceId, deviceName, platform } = request.body as {
          token: string;
          deviceId: string;
          deviceName?: string;
          platform: "ios" | "android" | "web";
        };

        if (!token || !deviceId || !platform) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "token, deviceId, and platform are required",
          });
        }

        const prefRef = db
          .collection("users")
          .doc(user.uid)
          .collection("preferences")
          .doc("notifications");

        const existingDoc = await prefRef.get();
        const existingData = existingDoc.exists ? existingDoc.data() : {};
        const existingTokens = existingData?.push?.fcmTokens || [];

        // Remove existing token for this device if present
        const filteredTokens = existingTokens.filter(
          (t: any) => t.deviceId !== deviceId,
        );

        // Add new token
        const newToken = {
          token,
          deviceId,
          deviceName: deviceName || `${platform} device`,
          platform,
          createdAt: Timestamp.now(),
          lastUsedAt: Timestamp.now(),
        };

        await prefRef.set(
          {
            push: {
              ...existingData?.push,
              enabled: true,
              fcmTokens: [...filteredTokens, newToken],
            },
            updatedAt: Timestamp.now(),
          },
          { merge: true },
        );

        return { success: true };
      } catch (error) {
        request.log.error({ error }, "Failed to register FCM token");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to register FCM token",
        });
      }
    },
  );

  /**
   * DELETE /api/v1/notifications/preferences/fcm-token/:deviceId
   * Remove FCM token for a device
   */
  fastify.delete(
    "/preferences/fcm-token/:deviceId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { deviceId } = request.params as { deviceId: string };
        const user = (request as AuthenticatedRequest).user!;

        const prefRef = db
          .collection("users")
          .doc(user.uid)
          .collection("preferences")
          .doc("notifications");

        const existingDoc = await prefRef.get();
        if (!existingDoc.exists) {
          return { success: true };
        }

        const existingData = existingDoc.data()!;
        const existingTokens = existingData?.push?.fcmTokens || [];

        const filteredTokens = existingTokens.filter(
          (t: any) => t.deviceId !== deviceId,
        );

        await prefRef.update({
          "push.fcmTokens": filteredTokens,
          updatedAt: Timestamp.now(),
        });

        return { success: true };
      } catch (error) {
        request.log.error({ error }, "Failed to remove FCM token");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to remove FCM token",
        });
      }
    },
  );

  // ============================================================================
  // INTERNAL/ADMIN ENDPOINTS (for Cloud Functions)
  // ============================================================================

  /**
   * POST /api/v1/notifications (internal)
   * Create a notification (typically called by Cloud Functions)
   */
  fastify.post(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;

        // Only system admins or internal service calls can create notifications
        if (user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Only system admins can create notifications",
          });
        }

        const input = request.body as CreateNotificationInput;

        if (!input.userId || !input.type || !input.title || !input.body) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "userId, type, title, and body are required",
          });
        }

        // Validate target user exists (security: prevent notification creation for non-existent users)
        const userDoc = await db.collection("users").doc(input.userId).get();
        if (!userDoc.exists) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Target user does not exist",
          });
        }
        const userEmail = userDoc.data()?.email;

        const now = Timestamp.now();
        const channels = input.channels || ["inApp"];

        const notificationData = {
          userId: input.userId,
          userEmail,
          organizationId: undefined,
          stableId: undefined,
          type: input.type,
          priority: input.priority || "normal",
          title: input.title,
          titleKey: input.titleKey,
          body: input.body,
          bodyKey: input.bodyKey,
          bodyParams: input.bodyParams,
          entityType: input.entityType,
          entityId: input.entityId,
          channels,
          deliveryStatus: channels.reduce(
            (acc, channel) => ({
              ...acc,
              [channel]: "pending",
            }),
            {},
          ),
          deliveryAttempts: 0,
          read: false,
          actionUrl: input.actionUrl,
          actionLabel: input.actionLabel,
          scheduledFor: input.scheduledFor
            ? Timestamp.fromDate(new Date(input.scheduledFor))
            : undefined,
          expiresAt: input.expiresAt
            ? Timestamp.fromDate(new Date(input.expiresAt))
            : undefined,
          createdAt: now,
          updatedAt: now,
        };

        const docRef = await db
          .collection("notifications")
          .add(notificationData);

        // Queue for delivery (in production, this would trigger a Cloud Function)
        for (const channel of channels) {
          await db.collection("notificationQueue").add({
            notificationId: docRef.id,
            userId: input.userId,
            channel,
            priority: input.priority || "normal",
            payload: {
              title: input.title,
              body: input.body,
              data: {
                type: input.type,
                entityType: input.entityType || "",
                entityId: input.entityId || "",
                actionUrl: input.actionUrl || "",
              },
            },
            status: "pending",
            attempts: 0,
            maxAttempts: 3,
            scheduledFor: input.scheduledFor
              ? Timestamp.fromDate(new Date(input.scheduledFor))
              : now,
            createdAt: now,
          });
        }

        return { id: docRef.id, ...serializeTimestamps(notificationData) };
      } catch (error) {
        request.log.error({ error }, "Failed to create notification");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create notification",
        });
      }
    },
  );
}
