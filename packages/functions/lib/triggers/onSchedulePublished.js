"use strict";
/**
 * Schedule Published Trigger
 *
 * Watches for schedule status changes from draft → published
 * and creates notifications for all assigned users.
 */
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
exports.onSchedulePublished = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firebase_functions_1 = require("firebase-functions");
const crypto = __importStar(require("crypto"));
const firebase_js_1 = require("../lib/firebase.js");
const errors_js_1 = require("../lib/errors.js");
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Format date for display in email
 */
function formatDate(date, locale = "sv") {
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString(locale === "en" ? "en-US" : "sv-SE", options);
}
/**
 * Get user display name from user data
 */
function getUserDisplayName(userData) {
  if (!userData) return "Medlem";
  if (userData.firstName && userData.lastName) {
    return `${userData.firstName} ${userData.lastName}`;
  }
  if (userData.displayName) {
    return userData.displayName;
  }
  return "Medlem";
}
/**
 * Build email body content
 */
function buildEmailBody(userSummary, scheduleName, stableName, actionUrl) {
  const isEnglish = userSummary.locale === "en";
  const shiftCount = userSummary.shifts.length;
  // Sort shifts by date
  const sortedShifts = [...userSummary.shifts].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  // Build shift list
  const shiftList = sortedShifts
    .map(
      (shift) =>
        `- ${formatDate(shift.date, userSummary.locale)} kl ${shift.time}: ${shift.routineName}`,
    )
    .join("\n");
  if (isEnglish) {
    return {
      subject: `You have been assigned shifts in "${scheduleName}"`,
      body: `Hi ${userSummary.displayName}!

You have been assigned ${shiftCount} shift${shiftCount > 1 ? "s" : ""} in the schedule "${scheduleName}" for ${stableName}.

Your shifts:
${shiftList}

View the full schedule: ${actionUrl}

Best regards,
Stallbokning`,
    };
  }
  // Default to Swedish
  return {
    subject: `Du har tilldelats pass i schemat "${scheduleName}"`,
    body: `Hej ${userSummary.displayName}!

Du har tilldelats ${shiftCount} pass i schemat "${scheduleName}" för ${stableName}.

Dina pass:
${shiftList}

Se hela schemat: ${actionUrl}

Med vänliga hälsningar,
Stallbokning`,
  };
}
/**
 * Get user notification preferences
 */
async function getUserNotificationPreferences(userId) {
  try {
    const prefsDoc = await firebase_js_1.db
      .collection("users")
      .doc(userId)
      .collection("preferences")
      .doc("notifications")
      .get();
    if (!prefsDoc.exists) {
      // Default: email enabled, others disabled
      return { email: true, push: false, telegram: false };
    }
    const prefs = prefsDoc.data();
    return {
      email: prefs?.email?.enabled !== false, // Default to true
      push: prefs?.push?.enabled === true,
      telegram:
        prefs?.telegram?.enabled === true && prefs?.telegram?.verified === true,
    };
  } catch (error) {
    firebase_functions_1.logger.warn(
      { userId, error: (0, errors_js_1.formatErrorMessage)(error) },
      "Failed to get notification preferences, using defaults",
    );
    return { email: true, push: false, telegram: false };
  }
}
/**
 * Create notification document and queue items for a user
 */
async function createUserNotification(
  userSummary,
  scheduleId,
  scheduleData,
  executionId,
) {
  const { userId, email, shifts } = userSummary;
  // Generate action URL
  const baseUrl = process.env.FRONTEND_URL || "https://app.stallbokning.se";
  const actionUrl = `${baseUrl}/schedules/${scheduleId}`;
  // Build email content
  const { subject, body } = buildEmailBody(
    userSummary,
    scheduleData.name,
    scheduleData.stableName,
    actionUrl,
  );
  // Get user notification preferences
  const prefs = await getUserNotificationPreferences(userId);
  // Determine channels to use
  const channels = ["inApp"]; // Always create in-app notification
  if (prefs.email && email) channels.push("email");
  if (prefs.push) channels.push("push");
  if (prefs.telegram) channels.push("telegram");
  const now = firebase_js_1.Timestamp.now();
  const notificationId = crypto.randomUUID();
  // Create notification document
  const notificationData = {
    userId,
    type: "schedule_published",
    title: subject,
    body,
    data: {
      scheduleId,
      scheduleName: scheduleData.name,
      stableId: scheduleData.stableId,
      stableName: scheduleData.stableName,
      shiftCount: shifts.length,
      shifts: shifts.map((s) => ({
        date: s.date.toISOString(),
        time: s.time,
        routineName: s.routineName,
      })),
      actionUrl,
    },
    channels,
    deliveryStatus: channels.reduce((acc, ch) => {
      acc[ch] = ch === "inApp" ? "sent" : "pending";
      return acc;
    }, {}),
    read: false,
    createdAt: now,
    updatedAt: now,
  };
  // Use batch write for atomicity
  const batch = firebase_js_1.db.batch();
  // Add notification document
  const notificationRef = firebase_js_1.db
    .collection("notifications")
    .doc(notificationId);
  batch.set(notificationRef, notificationData);
  // Create queue items for each channel (except inApp which is already "sent")
  for (const channel of channels) {
    if (channel === "inApp") continue;
    const queueItemId = crypto.randomUUID();
    const queueRef = firebase_js_1.db
      .collection("notificationQueue")
      .doc(queueItemId);
    batch.set(queueRef, {
      notificationId,
      userId,
      channel,
      priority: "normal",
      payload: {
        title: subject,
        body,
        data: {
          actionUrl,
          scheduleId,
          stableId: scheduleData.stableId,
          type: "schedule_published",
        },
      },
      status: "pending",
      attempts: 0,
      maxAttempts: 3,
      scheduledFor: now,
      createdAt: now,
    });
  }
  await batch.commit();
  firebase_functions_1.logger.info(
    {
      executionId,
      userId,
      notificationId,
      channels,
      shiftCount: shifts.length,
    },
    "Created notification for user",
  );
}
/**
 * Create notifications for all assigned users when schedule is published
 */
async function createSchedulePublishNotifications(
  scheduleId,
  scheduleData,
  executionId,
) {
  firebase_functions_1.logger.info(
    {
      executionId,
      scheduleId,
      scheduleName: scheduleData.name,
      stableId: scheduleData.stableId,
    },
    "Creating notifications for published schedule",
  );
  // Query all assigned shifts for this schedule
  const shiftsSnapshot = await firebase_js_1.db
    .collection("shifts")
    .where("scheduleId", "==", scheduleId)
    .where("status", "==", "assigned")
    .get();
  if (shiftsSnapshot.empty) {
    firebase_functions_1.logger.info(
      { executionId, scheduleId },
      "No assigned shifts found - skipping notifications",
    );
    return { usersNotified: 0, errors: 0 };
  }
  // Group shifts by assignedTo userId
  const userShiftsMap = new Map();
  for (const doc of shiftsSnapshot.docs) {
    const shift = { id: doc.id, ...doc.data() };
    if (!shift.assignedTo) continue;
    const existing = userShiftsMap.get(shift.assignedTo) || [];
    existing.push(shift);
    userShiftsMap.set(shift.assignedTo, existing);
  }
  firebase_functions_1.logger.info(
    {
      executionId,
      scheduleId,
      totalShifts: shiftsSnapshot.size,
      uniqueUsers: userShiftsMap.size,
    },
    "Grouped shifts by user",
  );
  // Process each user
  let usersNotified = 0;
  let errors = 0;
  for (const [userId, shifts] of userShiftsMap) {
    try {
      // Get user data
      const userDoc = await firebase_js_1.db
        .collection("users")
        .doc(userId)
        .get();
      const userData = userDoc.exists ? userDoc.data() : undefined;
      // Build user summary
      const userSummary = {
        userId,
        email: shifts[0]?.assignedToEmail || userData?.email || null,
        displayName: shifts[0]?.assignedToName || getUserDisplayName(userData),
        locale: userData?.locale || "sv",
        shifts: shifts.map((s) => ({
          date: s.date.toDate(),
          time: s.time,
          routineName: s.routineTemplateName || s.shiftTypeName || "Passning",
        })),
      };
      // Create notification and queue items
      await createUserNotification(
        userSummary,
        scheduleId,
        scheduleData,
        executionId,
      );
      usersNotified++;
    } catch (error) {
      errors++;
      firebase_functions_1.logger.error(
        {
          executionId,
          userId,
          error: (0, errors_js_1.formatErrorMessage)(error),
        },
        "Failed to create notification for user",
      );
      // Continue processing other users
    }
  }
  // Mark schedule as notified (idempotency)
  await firebase_js_1.db.collection("schedules").doc(scheduleId).update({
    notificationsSentAt: firebase_js_1.Timestamp.now(),
    notifiedUsersCount: usersNotified,
  });
  firebase_functions_1.logger.info(
    {
      executionId,
      scheduleId,
      usersNotified,
      errors,
    },
    "Schedule publish notifications complete",
  );
  return { usersNotified, errors };
}
// ============================================================================
// MAIN TRIGGER
// ============================================================================
/**
 * Firestore trigger for schedule published events
 *
 * Triggers when:
 * 1. Schedule status changes to "published" (from any other status)
 * 2. notifyMembers flag is true
 * 3. Notifications haven't already been sent (idempotency check)
 */
exports.onSchedulePublished = (0, firestore_1.onDocumentUpdated)(
  {
    document: "schedules/{scheduleId}",
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 300, // 5 minutes for large schedules
  },
  async (event) => {
    const executionId = crypto.randomUUID();
    if (!event.data) {
      firebase_functions_1.logger.warn(
        { executionId },
        "No data in schedule update event",
      );
      return;
    }
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();
    const scheduleId = event.params.scheduleId;
    if (!afterData) {
      firebase_functions_1.logger.warn(
        { executionId, scheduleId },
        "No after data in schedule update",
      );
      return;
    }
    firebase_functions_1.logger.info(
      {
        executionId,
        scheduleId,
        beforeStatus: beforeData?.status,
        afterStatus: afterData.status,
        notifyMembers: afterData.notifyMembers,
        hasNotificationsSentAt: !!afterData.notificationsSentAt,
      },
      "Processing schedule update",
    );
    // Check if this is a publish event
    const wasNotPublished = beforeData?.status !== "published";
    const isNowPublished = afterData.status === "published";
    if (!wasNotPublished || !isNowPublished) {
      firebase_functions_1.logger.debug(
        { executionId, scheduleId },
        "Not a publish event - skipping",
      );
      return;
    }
    // Check if notifyMembers is enabled
    if (!afterData.notifyMembers) {
      firebase_functions_1.logger.info(
        { executionId, scheduleId },
        "notifyMembers is false - skipping notifications",
      );
      return;
    }
    // Idempotency check: skip if notifications were already sent
    if (afterData.notificationsSentAt) {
      firebase_functions_1.logger.info(
        {
          executionId,
          scheduleId,
          notificationsSentAt: afterData.notificationsSentAt
            .toDate()
            .toISOString(),
        },
        "Notifications already sent for this schedule - skipping",
      );
      return;
    }
    // Create notifications for all assigned users
    try {
      const result = await createSchedulePublishNotifications(
        scheduleId,
        { ...afterData, id: scheduleId },
        executionId,
      );
      firebase_functions_1.logger.info(
        {
          executionId,
          scheduleId,
          usersNotified: result.usersNotified,
          errors: result.errors,
        },
        "Schedule publish notification trigger complete",
      );
    } catch (error) {
      firebase_functions_1.logger.error(
        {
          executionId,
          scheduleId,
          error: (0, errors_js_1.formatErrorMessage)(error),
        },
        "Failed to create schedule publish notifications",
      );
      // Don't throw - we don't want to retry as that could cause duplicate notifications
      // The notificationsSentAt field will not be set, allowing manual retry if needed
    }
  },
);
//# sourceMappingURL=onSchedulePublished.js.map
