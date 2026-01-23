import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import * as crypto from "crypto";

import { db, Timestamp } from "../lib/firebase.js";
import { formatErrorMessage } from "@stall-bokning/shared";

/**
 * Retry Failed Notifications
 * Runs every hour to retry failed notifications that haven't exceeded max attempts
 */
export const retryFailedNotifications = onSchedule(
  {
    schedule: "0 * * * *", // Every hour at minute 0
    timeZone: "Europe/Stockholm",
    retryCount: 2,
    region: "europe-west1",
  },
  async (_event) => {
    const executionId = crypto.randomUUID();
    const now = new Date();

    logger.info(
      {
        executionId,
        timestamp: now.toISOString(),
      },
      "Starting failed notification retry",
    );

    try {
      // Find failed notifications that can be retried
      // (status = failed AND attempts < maxAttempts)
      const failedSnapshot = await db
        .collection("notificationQueue")
        .where("status", "==", "failed")
        .limit(100)
        .get();

      if (failedSnapshot.empty) {
        logger.info({ executionId }, "No failed notifications to retry");
        return;
      }

      let retried = 0;
      let skipped = 0;
      let cleaned = 0;

      const batch = db.batch();
      const toRetry: FirebaseFirestore.DocumentReference[] = [];

      for (const doc of failedSnapshot.docs) {
        const data = doc.data();

        // Check if max attempts reached
        if (data.attempts >= data.maxAttempts) {
          skipped++;
          continue;
        }

        // Check if notification is too old (older than 24 hours)
        const createdAt = data.createdAt?.toDate();
        if (
          createdAt &&
          now.getTime() - createdAt.getTime() > 24 * 60 * 60 * 1000
        ) {
          cleaned++;
          batch.delete(doc.ref);
          continue;
        }

        // Reset to pending for retry
        toRetry.push(doc.ref);
        retried++;
      }

      // Commit deletions in batch
      if (cleaned > 0) {
        await batch.commit();
      }

      // Reset items to pending (triggers the onCreate function)
      // We do this outside the batch to ensure triggers fire
      for (const ref of toRetry) {
        await ref.update({
          status: "pending",
          updatedAt: Timestamp.now(),
        });
      }

      logger.info(
        {
          executionId,
          retried,
          skipped,
          cleaned,
          total: failedSnapshot.size,
        },
        "Failed notification retry complete",
      );
    } catch (error) {
      logger.error(
        {
          executionId,
          error: formatErrorMessage(error),
        },
        "Failed to retry notifications",
      );
      throw error;
    }
  },
);

/**
 * Cleanup Old Notifications
 * Runs daily at 3 AM to clean up old processed notifications
 */
export const cleanupOldNotifications = onSchedule(
  {
    schedule: "0 3 * * *", // Daily at 3 AM
    timeZone: "Europe/Stockholm",
    retryCount: 2,
    region: "europe-west1",
  },
  async (_event) => {
    const executionId = crypto.randomUUID();
    const now = new Date();

    logger.info(
      {
        executionId,
        timestamp: now.toISOString(),
      },
      "Starting notification cleanup",
    );

    try {
      // Delete processed queue items older than 7 days
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const oldQueueSnapshot = await db
        .collection("notificationQueue")
        .where("status", "in", ["sent", "failed"])
        .where("processedAt", "<", Timestamp.fromDate(sevenDaysAgo))
        .limit(500)
        .get();

      let deletedQueue = 0;

      if (!oldQueueSnapshot.empty) {
        const batch = db.batch();
        oldQueueSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
          deletedQueue++;
        });
        await batch.commit();
      }

      // Archive read notifications older than 30 days
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const oldNotificationsSnapshot = await db
        .collection("notifications")
        .where("read", "==", true)
        .where("createdAt", "<", Timestamp.fromDate(thirtyDaysAgo))
        .limit(500)
        .get();

      let archivedNotifications = 0;

      if (!oldNotificationsSnapshot.empty) {
        const batch = db.batch();
        const archiveBatch = db.batch();

        for (const doc of oldNotificationsSnapshot.docs) {
          // Move to archive collection
          const archiveRef = db.collection("notificationsArchive").doc(doc.id);
          archiveBatch.set(archiveRef, {
            ...doc.data(),
            archivedAt: Timestamp.now(),
          });

          // Delete from main collection
          batch.delete(doc.ref);
          archivedNotifications++;
        }

        await archiveBatch.commit();
        await batch.commit();
      }

      logger.info(
        {
          executionId,
          deletedQueue,
          archivedNotifications,
        },
        "Notification cleanup complete",
      );
    } catch (error) {
      logger.error(
        {
          executionId,
          error: formatErrorMessage(error),
        },
        "Failed to cleanup notifications",
      );
      throw error;
    }
  },
);
