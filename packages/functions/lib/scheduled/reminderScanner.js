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
exports.scanForReminders = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_functions_1 = require("firebase-functions");
const crypto = __importStar(require("crypto"));
const firebase_js_1 = require("../lib/firebase.js");
const shared_1 = require("@equiduty/shared");
/**
 * Check if current time is within user's quiet hours
 */
function isInQuietHours(quietHours, now) {
  if (!quietHours?.enabled) return false;
  const [startHour, startMin] = quietHours.start.split(":").map(Number);
  const [endHour, endMin] = quietHours.end.split(":").map(Number);
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const currentMinutes = currentHour * 60 + currentMin;
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  // Handle overnight quiet hours (e.g., 22:00 - 07:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}
/**
 * Get user notification preferences
 */
async function getUserPreferences(userId) {
  const prefDoc = await firebase_js_1.db
    .collection("users")
    .doc(userId)
    .collection("preferences")
    .doc("notifications")
    .get();
  if (!prefDoc.exists) {
    // Return defaults
    return {
      enabled: true,
      shiftReminders: {
        enabled: true,
        reminderTimes: [1440, 120], // 24h and 2h
        channels: ["inApp", "push", "email"],
      },
      healthReminders: {
        enabled: true,
        reminderDays: [7, 1],
        channels: ["inApp", "email"],
      },
      quietHours: {
        enabled: true,
        start: "22:00",
        end: "07:00",
        timezone: "Europe/Stockholm",
      },
    };
  }
  return prefDoc.data();
}
/**
 * Create notification queue item
 */
async function queueNotification(
  userId,
  userEmail,
  channels,
  priority,
  title,
  body,
  entityType,
  entityId,
  actionUrl,
) {
  const now = firebase_js_1.Timestamp.now();
  // Create notification document
  const notificationRef = await firebase_js_1.db
    .collection("notifications")
    .add({
      userId,
      userEmail,
      type: entityType.includes("health")
        ? "health_reminder"
        : "shift_reminder",
      priority,
      title,
      body,
      entityType,
      entityId,
      channels,
      deliveryStatus: channels.reduce(
        (acc, channel) => ({ ...acc, [channel]: "pending" }),
        {},
      ),
      deliveryAttempts: 0,
      read: false,
      actionUrl,
      createdAt: now,
      updatedAt: now,
    });
  // Queue for each channel
  for (const channel of channels) {
    await firebase_js_1.db.collection("notificationQueue").add({
      notificationId: notificationRef.id,
      userId,
      channel,
      priority,
      payload: {
        title,
        body,
        data: {
          type: entityType.includes("health")
            ? "health_reminder"
            : "shift_reminder",
          entityType,
          entityId,
          actionUrl: actionUrl || "",
        },
      },
      status: "pending",
      attempts: 0,
      maxAttempts: 3,
      scheduledFor: now,
      createdAt: now,
    });
  }
}
/**
 * Format time remaining as human-readable text
 */
function formatTimeRemaining(minutes) {
  if (minutes >= 1440) {
    const days = Math.floor(minutes / 1440);
    return days === 1 ? "1 dag" : `${days} dagar`;
  } else if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return hours === 1 ? "1 timme" : `${hours} timmar`;
  }
  return minutes === 1 ? "1 minut" : `${minutes} minuter`;
}
/**
 * Reminder Scanner Cloud Function
 * Runs every 15 minutes
 * Scans for upcoming activities and sends reminders
 */
exports.scanForReminders = (0, scheduler_1.onSchedule)(
  {
    schedule: "*/15 * * * *", // Every 15 minutes
    timeZone: "Europe/Stockholm",
    region: "europe-west1",
    retryCount: 2,
  },
  async (_event) => {
    const executionId = crypto.randomUUID();
    const now = new Date();
    firebase_functions_1.logger.info(
      {
        executionId,
        timestamp: now.toISOString(),
      },
      "Starting reminder scan",
    );
    try {
      let totalReminders = 0;
      let totalSkipped = 0;
      let totalErrors = 0;
      // ========================================================================
      // SHIFT/ACTIVITY REMINDERS
      // ========================================================================
      // Scan for activities due in the next 24 hours + 2 hours
      const reminderWindows = [1440, 120]; // Minutes: 24h and 2h
      const maxWindow = Math.max(...reminderWindows);
      const windowEnd = new Date(now.getTime() + maxWindow * 60 * 1000);
      // Paginate to avoid loading too many documents into memory
      const BATCH_SIZE = 500;
      const instancesSnapshot = await firebase_js_1.db
        .collection("activityInstances")
        .where("status", "==", "scheduled")
        .where("scheduledDate", ">=", firebase_js_1.Timestamp.fromDate(now))
        .where(
          "scheduledDate",
          "<=",
          firebase_js_1.Timestamp.fromDate(windowEnd),
        )
        .limit(BATCH_SIZE)
        .get();
      firebase_functions_1.logger.info(
        {
          executionId,
          instanceCount: instancesSnapshot.size,
        },
        "Found upcoming activity instances",
      );
      for (const instanceDoc of instancesSnapshot.docs) {
        try {
          const instance = instanceDoc.data();
          const instanceId = instanceDoc.id;
          // Skip if no assignee
          if (!instance.assignedTo) {
            totalSkipped++;
            continue;
          }
          // Get user preferences
          const preferences = await getUserPreferences(instance.assignedTo);
          // Check if reminders are enabled
          if (!preferences.enabled || !preferences.shiftReminders?.enabled) {
            totalSkipped++;
            continue;
          }
          // Check quiet hours
          if (isInQuietHours(preferences.quietHours, now)) {
            totalSkipped++;
            continue;
          }
          // Calculate time until activity
          const scheduledDate = instance.scheduledDate.toDate();
          const [hours, minutes] = instance.scheduledTime
            .split(":")
            .map(Number);
          scheduledDate.setHours(hours, minutes, 0, 0);
          const minutesUntil = Math.floor(
            (scheduledDate.getTime() - now.getTime()) / (60 * 1000),
          );
          // Check each reminder time
          const reminderTimes = preferences.shiftReminders.reminderTimes || [
            1440, 120,
          ];
          for (const reminderMinutes of reminderTimes) {
            // Check if we're within 15 minutes of this reminder time
            const tolerance = 15;
            if (
              minutesUntil <= reminderMinutes &&
              minutesUntil > reminderMinutes - tolerance
            ) {
              // Use transaction to prevent race condition (TOCTOU)
              // This ensures only one function instance can send a reminder
              const reminderDocId = `${instanceId}_${reminderMinutes}`;
              const reminderRef = firebase_js_1.db
                .collection("sentReminders")
                .doc(reminderDocId);
              const wasReminderSent = await firebase_js_1.db.runTransaction(
                async (transaction) => {
                  const sentRemindersDoc = await transaction.get(reminderRef);
                  if (sentRemindersDoc.exists) {
                    return false; // Already sent
                  }
                  // Mark as sent within the transaction
                  transaction.set(reminderRef, {
                    instanceId,
                    reminderMinutes,
                    sentAt: firebase_js_1.Timestamp.now(),
                    userId: instance.assignedTo,
                  });
                  return true; // Reminder should be sent
                },
              );
              if (!wasReminderSent) {
                continue; // Another instance already sent this reminder
              }
              // Get user info for email
              const userDoc = await firebase_js_1.db
                .collection("users")
                .doc(instance.assignedTo)
                .get();
              const userEmail = userDoc.exists
                ? userDoc.data()?.email
                : undefined;
              // Build notification
              const timeRemaining = formatTimeRemaining(minutesUntil);
              const title = `Påminnelse: ${instance.title}`;
              const body = `Din aktivitet "${instance.title}" börjar om ${timeRemaining} (${instance.scheduledTime})`;
              const actionUrl = `/activities/instances/${instanceId}`;
              // Queue notification
              const channels = preferences.shiftReminders.channels || ["inApp"];
              await queueNotification(
                instance.assignedTo,
                userEmail,
                channels,
                "normal",
                title,
                body,
                "instance",
                instanceId,
                actionUrl,
              );
              totalReminders++;
              firebase_functions_1.logger.info(
                {
                  executionId,
                  instanceId,
                  userId: instance.assignedTo,
                  reminderMinutes,
                  minutesUntil,
                },
                "Sent shift reminder",
              );
            }
          }
        } catch (error) {
          totalErrors++;
          firebase_functions_1.logger.error(
            {
              executionId,
              instanceId: instanceDoc.id,
              error: (0, shared_1.formatErrorMessage)(error),
            },
            "Error processing instance reminder",
          );
        }
      }
      // ========================================================================
      // HEALTH CARE REMINDERS (Multi-Rule System)
      // ========================================================================
      // Scan for horses with upcoming health care due dates
      // Uses aggregate nextVaccinationDue for efficient query, then checks per-rule
      const healthReminderDays = [7, 1]; // Days before due
      const maxHealthDays = Math.max(...healthReminderDays);
      const healthWindowEnd = new Date(now);
      healthWindowEnd.setDate(healthWindowEnd.getDate() + maxHealthDays);
      // Paginate horses query to avoid memory issues
      // Query by aggregate nextVaccinationDue (nearest due date across all rules)
      const horsesSnapshot = await firebase_js_1.db
        .collection("horses")
        .where("status", "==", "active")
        .where(
          "nextVaccinationDue",
          ">=",
          firebase_js_1.Timestamp.fromDate(now),
        )
        .where(
          "nextVaccinationDue",
          "<=",
          firebase_js_1.Timestamp.fromDate(healthWindowEnd),
        )
        .limit(BATCH_SIZE)
        .get();
      firebase_functions_1.logger.info(
        {
          executionId,
          horseCount: horsesSnapshot.size,
        },
        "Found horses with upcoming health care",
      );
      for (const horseDoc of horsesSnapshot.docs) {
        try {
          const horse = horseDoc.data();
          const horseId = horseDoc.id;
          // Get the horse owner
          const ownerId = horse.ownerId;
          if (!ownerId) {
            totalSkipped++;
            continue;
          }
          // Get user preferences
          const preferences = await getUserPreferences(ownerId);
          // Check if health reminders are enabled
          if (!preferences.enabled || !preferences.healthReminders?.enabled) {
            totalSkipped++;
            continue;
          }
          // Check quiet hours
          if (isInQuietHours(preferences.quietHours, now)) {
            totalSkipped++;
            continue;
          }
          // Get user info (once per horse, not per rule)
          const userDoc = await firebase_js_1.db
            .collection("users")
            .doc(ownerId)
            .get();
          const userEmail = userDoc.exists ? userDoc.data()?.email : undefined;
          const reminderDays = preferences.healthReminders.reminderDays || [
            7, 1,
          ];
          // Process multi-rule assignments (new system)
          const assignedRules = horse.assignedVaccinationRules || [];
          if (assignedRules.length > 0) {
            // New multi-rule system: send reminders per rule
            for (const assignment of assignedRules) {
              if (!assignment.nextDueDate) continue;
              const dueDate = assignment.nextDueDate.toDate();
              const daysUntil = Math.ceil(
                (dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
              );
              // Check each reminder day for this rule
              for (const reminderDay of reminderDays) {
                if (daysUntil === reminderDay) {
                  // Use transaction to prevent race condition (TOCTOU)
                  // Include ruleId in the document ID for per-rule tracking
                  const reminderDocId = `health_${horseId}_${assignment.ruleId}_${reminderDay}`;
                  const reminderRef = firebase_js_1.db
                    .collection("sentReminders")
                    .doc(reminderDocId);
                  const wasReminderSent = await firebase_js_1.db.runTransaction(
                    async (transaction) => {
                      const sentRemindersDoc =
                        await transaction.get(reminderRef);
                      if (sentRemindersDoc.exists) {
                        return false; // Already sent
                      }
                      // Mark as sent within the transaction
                      transaction.set(reminderRef, {
                        horseId,
                        ruleId: assignment.ruleId,
                        ruleName: assignment.ruleName,
                        reminderDay,
                        sentAt: firebase_js_1.Timestamp.now(),
                        userId: ownerId,
                      });
                      return true; // Reminder should be sent
                    },
                  );
                  if (!wasReminderSent) {
                    continue; // Another instance already sent this reminder
                  }
                  // Build notification with rule-specific information
                  const timeText =
                    reminderDay === 1 ? "imorgon" : `om ${reminderDay} dagar`;
                  const title = `Vaccination: ${horse.name}`;
                  const body = `${assignment.ruleName} för ${horse.name} förfaller ${timeText} (${dueDate.toLocaleDateString("sv-SE")})`;
                  const actionUrl = `/horses/${horseId}`;
                  // Queue notification
                  const channels = preferences.healthReminders.channels || [
                    "inApp",
                    "email",
                  ];
                  await queueNotification(
                    ownerId,
                    userEmail,
                    channels,
                    reminderDay === 1 ? "high" : "normal",
                    title,
                    body,
                    "horse_vaccination",
                    `${horseId}_${assignment.ruleId}`,
                    actionUrl,
                  );
                  totalReminders++;
                  firebase_functions_1.logger.info(
                    {
                      executionId,
                      horseId,
                      ruleId: assignment.ruleId,
                      ruleName: assignment.ruleName,
                      userId: ownerId,
                      reminderDay,
                      daysUntil,
                    },
                    "Sent vaccination reminder (per-rule)",
                  );
                }
              }
            }
          } else if (horse.nextVaccinationDue) {
            // Legacy single-rule system (backward compatibility)
            const dueDate = horse.nextVaccinationDue.toDate();
            const daysUntil = Math.ceil(
              (dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
            );
            for (const reminderDay of reminderDays) {
              if (daysUntil === reminderDay) {
                // Use transaction to prevent race condition (TOCTOU)
                const reminderDocId = `health_${horseId}_${reminderDay}`;
                const reminderRef = firebase_js_1.db
                  .collection("sentReminders")
                  .doc(reminderDocId);
                const wasReminderSent = await firebase_js_1.db.runTransaction(
                  async (transaction) => {
                    const sentRemindersDoc = await transaction.get(reminderRef);
                    if (sentRemindersDoc.exists) {
                      return false; // Already sent
                    }
                    // Mark as sent within the transaction
                    transaction.set(reminderRef, {
                      horseId,
                      reminderDay,
                      sentAt: firebase_js_1.Timestamp.now(),
                      userId: ownerId,
                    });
                    return true; // Reminder should be sent
                  },
                );
                if (!wasReminderSent) {
                  continue; // Another instance already sent this reminder
                }
                // Build notification
                const timeText =
                  reminderDay === 1 ? "imorgon" : `om ${reminderDay} dagar`;
                const ruleName = horse.vaccinationRuleName || "Vaccination";
                const title = `Vaccination: ${horse.name}`;
                const body = `${ruleName} för ${horse.name} förfaller ${timeText} (${dueDate.toLocaleDateString("sv-SE")})`;
                const actionUrl = `/horses/${horseId}`;
                // Queue notification
                const channels = preferences.healthReminders.channels || [
                  "inApp",
                  "email",
                ];
                await queueNotification(
                  ownerId,
                  userEmail,
                  channels,
                  reminderDay === 1 ? "high" : "normal",
                  title,
                  body,
                  "horse",
                  horseId,
                  actionUrl,
                );
                totalReminders++;
                firebase_functions_1.logger.info(
                  {
                    executionId,
                    horseId,
                    userId: ownerId,
                    reminderDay,
                    daysUntil,
                  },
                  "Sent health care reminder (legacy)",
                );
              }
            }
          }
        } catch (error) {
          totalErrors++;
          firebase_functions_1.logger.error(
            {
              executionId,
              horseId: horseDoc.id,
              error: (0, shared_1.formatErrorMessage)(error),
            },
            "Error processing health reminder",
          );
        }
      }
      // ========================================================================
      // OVERDUE ACTIVITIES
      // ========================================================================
      // Check for overdue activities (scheduled in the past but not completed)
      const overdueSnapshot = await firebase_js_1.db
        .collection("activityInstances")
        .where("status", "==", "scheduled")
        .where("scheduledDate", "<", firebase_js_1.Timestamp.fromDate(now))
        .limit(100)
        .get();
      firebase_functions_1.logger.info(
        {
          executionId,
          overdueCount: overdueSnapshot.size,
        },
        "Found overdue activity instances",
      );
      for (const instanceDoc of overdueSnapshot.docs) {
        try {
          const instance = instanceDoc.data();
          const instanceId = instanceDoc.id;
          // Mark as missed
          await instanceDoc.ref.update({
            status: "missed",
            updatedAt: firebase_js_1.Timestamp.now(),
            updatedBy: "system",
          });
          // Send notification if assigned
          if (instance.assignedTo) {
            // Use transaction to prevent race condition (TOCTOU)
            const reminderDocId = `missed_${instanceId}`;
            const reminderRef = firebase_js_1.db
              .collection("sentReminders")
              .doc(reminderDocId);
            const shouldSendNotification =
              await firebase_js_1.db.runTransaction(async (transaction) => {
                const sentMissedDoc = await transaction.get(reminderRef);
                if (sentMissedDoc.exists) {
                  return false; // Already sent
                }
                // Mark as sent within the transaction
                transaction.set(reminderRef, {
                  instanceId,
                  sentAt: firebase_js_1.Timestamp.now(),
                  userId: instance.assignedTo,
                });
                return true;
              });
            if (shouldSendNotification) {
              const userDoc = await firebase_js_1.db
                .collection("users")
                .doc(instance.assignedTo)
                .get();
              const userEmail = userDoc.exists
                ? userDoc.data()?.email
                : undefined;
              const title = `Missad aktivitet: ${instance.title}`;
              const body = `Aktiviteten "${instance.title}" som var planerad för ${instance.scheduledDate.toDate().toLocaleDateString("sv-SE")} har markerats som missad.`;
              const actionUrl = `/activities/instances/${instanceId}`;
              await queueNotification(
                instance.assignedTo,
                userEmail,
                ["inApp", "email"],
                "high",
                title,
                body,
                "instance",
                instanceId,
                actionUrl,
              );
              totalReminders++;
            }
          }
        } catch (error) {
          totalErrors++;
          firebase_functions_1.logger.error(
            {
              executionId,
              instanceId: instanceDoc.id,
              error: (0, shared_1.formatErrorMessage)(error),
            },
            "Error processing overdue activity",
          );
        }
      }
      // ========================================================================
      // CLEANUP OLD SENT REMINDERS
      // ========================================================================
      // Clean up sent reminders older than 30 days
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const oldRemindersSnapshot = await firebase_js_1.db
        .collection("sentReminders")
        .where("sentAt", "<", firebase_js_1.Timestamp.fromDate(thirtyDaysAgo))
        .limit(500)
        .get();
      if (!oldRemindersSnapshot.empty) {
        const batch = firebase_js_1.db.batch();
        oldRemindersSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        firebase_functions_1.logger.info(
          {
            executionId,
            cleanedUp: oldRemindersSnapshot.size,
          },
          "Cleaned up old sent reminders",
        );
      }
      firebase_functions_1.logger.info(
        {
          executionId,
          totalReminders,
          totalSkipped,
          totalErrors,
          duration: Date.now() - now.getTime(),
        },
        "Reminder scan complete",
      );
    } catch (error) {
      firebase_functions_1.logger.error(
        {
          executionId,
          error: (0, shared_1.formatErrorMessage)(error),
        },
        "Reminder scan failed",
      );
      throw error;
    }
  },
);
//# sourceMappingURL=reminderScanner.js.map
