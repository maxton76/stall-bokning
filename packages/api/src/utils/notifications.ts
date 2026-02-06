/**
 * Notification Utilities
 *
 * Shared utilities for creating in-app notifications across the API.
 * Centralizes notification creation to ensure consistent structure.
 */

import { db } from "./firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import type {
  NotificationType,
  NotificationPriority,
  NotificationChannel,
  NotificationEntityType,
} from "@equiduty/shared";

/**
 * Options for creating an in-app notification
 */
export interface CreateNotificationOptions {
  userId: string;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  titleKey?: string;
  body: string;
  bodyKey?: string;
  bodyParams?: Record<string, string>;
  entityType?: NotificationEntityType;
  entityId?: string;
  channels?: NotificationChannel[];
  actionUrl?: string;
  organizationId?: string;
}

/**
 * Create an in-app notification
 *
 * This utility creates a notification document in Firestore with consistent
 * structure. It does NOT trigger email or push delivery - those are handled
 * by the notification queue processor.
 *
 * @param options - Notification options
 * @returns The created notification document ID
 */
export async function createInAppNotification(
  options: CreateNotificationOptions,
): Promise<string> {
  const now = FieldValue.serverTimestamp();
  const channels = options.channels ?? ["inApp"];

  // Build delivery status object for each channel
  const deliveryStatus: Record<string, string> = {};
  for (const channel of channels) {
    deliveryStatus[channel] = "pending";
  }

  const notificationData = {
    userId: options.userId,
    type: options.type,
    priority: options.priority ?? "normal",
    title: options.title,
    titleKey: options.titleKey,
    body: options.body,
    bodyKey: options.bodyKey,
    bodyParams: options.bodyParams,
    entityType: options.entityType,
    entityId: options.entityId,
    organizationId: options.organizationId,
    channels,
    deliveryStatus,
    deliveryAttempts: 0,
    read: false,
    actionUrl: options.actionUrl,
    createdAt: now,
    updatedAt: now,
  };

  // Remove undefined fields to keep Firestore documents clean
  const cleanedData = Object.fromEntries(
    Object.entries(notificationData).filter(([_, v]) => v !== undefined),
  );

  const docRef = await db.collection("notifications").add(cleanedData);
  return docRef.id;
}

/**
 * Create a notification only if not already created (prevents duplicates)
 *
 * Uses a separate sentReminders collection to track what has been sent.
 * This is useful for scheduled notifications like billing reminders.
 *
 * @param reminderDocId - Unique ID for tracking this notification
 * @param options - Notification options
 * @param reminderMetadata - Additional metadata to store in sentReminders
 * @returns true if notification was created, false if already existed
 */
export async function createNotificationIfNotExists(
  reminderDocId: string,
  options: CreateNotificationOptions,
  reminderMetadata?: Record<string, unknown>,
): Promise<boolean> {
  const reminderRef = db.collection("sentReminders").doc(reminderDocId);

  const wasCreated = await db.runTransaction(async (transaction) => {
    const reminderDoc = await transaction.get(reminderRef);

    if (reminderDoc.exists) {
      return false; // Already sent
    }

    // Mark as sent within the transaction
    transaction.set(reminderRef, {
      type: options.type,
      userId: options.userId,
      entityId: options.entityId,
      sentAt: FieldValue.serverTimestamp(),
      ...reminderMetadata,
    });

    return true;
  });

  if (!wasCreated) {
    return false;
  }

  // Create the notification outside the transaction
  await createInAppNotification(options);
  return true;
}
