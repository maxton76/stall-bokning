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
exports.cleanupOldNotifications = exports.retryFailedNotifications = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_functions_1 = require("firebase-functions");
const crypto = __importStar(require("crypto"));
const firebase_js_1 = require("../lib/firebase.js");
const errors_js_1 = require("../lib/errors.js");
/**
 * Retry Failed Notifications
 * Runs every hour to retry failed notifications that haven't exceeded max attempts
 */
exports.retryFailedNotifications = (0, scheduler_1.onSchedule)(
  {
    schedule: "0 * * * *", // Every hour at minute 0
    timeZone: "Europe/Stockholm",
    retryCount: 2,
    region: "europe-west1",
  },
  async (_event) => {
    const executionId = crypto.randomUUID();
    const now = new Date();
    firebase_functions_1.logger.info(
      {
        executionId,
        timestamp: now.toISOString(),
      },
      "Starting failed notification retry",
    );
    try {
      // Find failed notifications that can be retried
      // (status = failed AND attempts < maxAttempts)
      const failedSnapshot = await firebase_js_1.db
        .collection("notificationQueue")
        .where("status", "==", "failed")
        .limit(100)
        .get();
      if (failedSnapshot.empty) {
        firebase_functions_1.logger.info(
          { executionId },
          "No failed notifications to retry",
        );
        return;
      }
      let retried = 0;
      let skipped = 0;
      let cleaned = 0;
      const batch = firebase_js_1.db.batch();
      const toRetry = [];
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
          updatedAt: firebase_js_1.Timestamp.now(),
        });
      }
      firebase_functions_1.logger.info(
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
      firebase_functions_1.logger.error(
        {
          executionId,
          error: (0, errors_js_1.formatErrorMessage)(error),
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
exports.cleanupOldNotifications = (0, scheduler_1.onSchedule)(
  {
    schedule: "0 3 * * *", // Daily at 3 AM
    timeZone: "Europe/Stockholm",
    retryCount: 2,
    region: "europe-west1",
  },
  async (_event) => {
    const executionId = crypto.randomUUID();
    const now = new Date();
    firebase_functions_1.logger.info(
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
      const oldQueueSnapshot = await firebase_js_1.db
        .collection("notificationQueue")
        .where("status", "in", ["sent", "failed"])
        .where(
          "processedAt",
          "<",
          firebase_js_1.Timestamp.fromDate(sevenDaysAgo),
        )
        .limit(500)
        .get();
      let deletedQueue = 0;
      if (!oldQueueSnapshot.empty) {
        const batch = firebase_js_1.db.batch();
        oldQueueSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
          deletedQueue++;
        });
        await batch.commit();
      }
      // Archive read notifications older than 30 days
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const oldNotificationsSnapshot = await firebase_js_1.db
        .collection("notifications")
        .where("read", "==", true)
        .where(
          "createdAt",
          "<",
          firebase_js_1.Timestamp.fromDate(thirtyDaysAgo),
        )
        .limit(500)
        .get();
      let archivedNotifications = 0;
      if (!oldNotificationsSnapshot.empty) {
        const batch = firebase_js_1.db.batch();
        const archiveBatch = firebase_js_1.db.batch();
        for (const doc of oldNotificationsSnapshot.docs) {
          // Move to archive collection
          const archiveRef = firebase_js_1.db
            .collection("notificationsArchive")
            .doc(doc.id);
          archiveBatch.set(archiveRef, {
            ...doc.data(),
            archivedAt: firebase_js_1.Timestamp.now(),
          });
          // Delete from main collection
          batch.delete(doc.ref);
          archivedNotifications++;
        }
        await archiveBatch.commit();
        await batch.commit();
      }
      firebase_functions_1.logger.info(
        {
          executionId,
          deletedQueue,
          archivedNotifications,
        },
        "Notification cleanup complete",
      );
    } catch (error) {
      firebase_functions_1.logger.error(
        {
          executionId,
          error: (0, errors_js_1.formatErrorMessage)(error),
        },
        "Failed to cleanup notifications",
      );
      throw error;
    }
  },
);
//# sourceMappingURL=retryFailed.js.map
