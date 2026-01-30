/**
 * Schedule Published Trigger
 *
 * Watches for schedule status changes from draft → published
 * and creates notifications for all assigned users.
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import * as crypto from "crypto";

import { db, Timestamp } from "../lib/firebase.js";
import { formatErrorMessage } from "@equiduty/shared";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ScheduleData {
  id?: string;
  name: string;
  stableId: string;
  stableName: string;
  status: "draft" | "published" | "archived";
  notifyMembers: boolean;
  startDate: FirebaseFirestore.Timestamp;
  endDate: FirebaseFirestore.Timestamp;
  publishedAt?: FirebaseFirestore.Timestamp;
  publishedBy?: string;
  notificationsSentAt?: FirebaseFirestore.Timestamp;
}

interface ShiftData {
  id: string;
  scheduleId: string;
  stableId: string;
  stableName: string;
  date: FirebaseFirestore.Timestamp;
  time: string;
  status: string;
  assignedTo: string | null;
  assignedToName: string | null;
  assignedToEmail: string | null;
  routineTemplateName?: string;
  shiftTypeName?: string; // Legacy field
}

interface UserData {
  email?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  locale?: string;
}

interface UserShiftSummary {
  userId: string;
  email: string | null;
  displayName: string;
  locale: string;
  shifts: Array<{
    date: Date;
    time: string;
    routineName: string;
  }>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format date for display in email
 */
function formatDate(date: Date, locale: string = "sv"): string {
  const options: Intl.DateTimeFormatOptions = {
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
function getUserDisplayName(userData: UserData | undefined): string {
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
function buildEmailBody(
  userSummary: UserShiftSummary,
  scheduleName: string,
  stableName: string,
  actionUrl: string,
): { subject: string; body: string } {
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
EquiDuty`,
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
EquiDuty`,
  };
}

/**
 * Get user notification preferences
 */
async function getUserNotificationPreferences(
  userId: string,
): Promise<{ email: boolean; push: boolean; telegram: boolean }> {
  try {
    const prefsDoc = await db
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
    logger.warn(
      { userId, error: formatErrorMessage(error) },
      "Failed to get notification preferences, using defaults",
    );
    return { email: true, push: false, telegram: false };
  }
}

/**
 * Create notification document and queue items for a user
 */
async function createUserNotification(
  userSummary: UserShiftSummary,
  scheduleId: string,
  scheduleData: ScheduleData,
  executionId: string,
): Promise<void> {
  const { userId, email, shifts } = userSummary;

  // Generate action URL
  const baseUrl = process.env.FRONTEND_URL || "https://app.equiduty.se";
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
  const channels: string[] = ["inApp"]; // Always create in-app notification
  if (prefs.email && email) channels.push("email");
  if (prefs.push) channels.push("push");
  if (prefs.telegram) channels.push("telegram");

  const now = Timestamp.now();
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
    deliveryStatus: channels.reduce(
      (acc, ch) => {
        acc[ch] = ch === "inApp" ? "sent" : "pending";
        return acc;
      },
      {} as Record<string, string>,
    ),
    read: false,
    createdAt: now,
    updatedAt: now,
  };

  // Use batch write for atomicity
  const batch = db.batch();

  // Add notification document
  const notificationRef = db.collection("notifications").doc(notificationId);
  batch.set(notificationRef, notificationData);

  // Create queue items for each channel (except inApp which is already "sent")
  for (const channel of channels) {
    if (channel === "inApp") continue;

    const queueItemId = crypto.randomUUID();
    const queueRef = db.collection("notificationQueue").doc(queueItemId);

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

  logger.info(
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
  scheduleId: string,
  scheduleData: ScheduleData,
  executionId: string,
): Promise<{ usersNotified: number; errors: number }> {
  logger.info(
    {
      executionId,
      scheduleId,
      scheduleName: scheduleData.name,
      stableId: scheduleData.stableId,
    },
    "Creating notifications for published schedule",
  );

  // Query all assigned shifts for this schedule
  const shiftsSnapshot = await db
    .collection("shifts")
    .where("scheduleId", "==", scheduleId)
    .where("status", "==", "assigned")
    .get();

  if (shiftsSnapshot.empty) {
    logger.info(
      { executionId, scheduleId },
      "No assigned shifts found - skipping notifications",
    );
    return { usersNotified: 0, errors: 0 };
  }

  // Group shifts by assignedTo userId
  const userShiftsMap = new Map<string, ShiftData[]>();

  for (const doc of shiftsSnapshot.docs) {
    const shift = { id: doc.id, ...doc.data() } as ShiftData;

    if (!shift.assignedTo) continue;

    const existing = userShiftsMap.get(shift.assignedTo) || [];
    existing.push(shift);
    userShiftsMap.set(shift.assignedTo, existing);
  }

  logger.info(
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
      const userDoc = await db.collection("users").doc(userId).get();
      const userData = userDoc.exists
        ? (userDoc.data() as UserData)
        : undefined;

      // Build user summary
      const userSummary: UserShiftSummary = {
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
      logger.error(
        {
          executionId,
          userId,
          error: formatErrorMessage(error),
        },
        "Failed to create notification for user",
      );
      // Continue processing other users
    }
  }

  // Mark schedule as notified (idempotency)
  await db.collection("schedules").doc(scheduleId).update({
    notificationsSentAt: Timestamp.now(),
    notifiedUsersCount: usersNotified,
  });

  logger.info(
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
export const onSchedulePublished = onDocumentUpdated(
  {
    document: "schedules/{scheduleId}",
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 300, // 5 minutes for large schedules
  },
  async (event) => {
    const executionId = crypto.randomUUID();

    if (!event.data) {
      logger.warn({ executionId }, "No data in schedule update event");
      return;
    }

    const beforeData = event.data.before.data() as ScheduleData | undefined;
    const afterData = event.data.after.data() as ScheduleData | undefined;
    const scheduleId = event.params.scheduleId;

    if (!afterData) {
      logger.warn(
        { executionId, scheduleId },
        "No after data in schedule update",
      );
      return;
    }

    logger.info(
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
      logger.debug(
        { executionId, scheduleId },
        "Not a publish event - skipping",
      );
      return;
    }

    // Check if notifyMembers is enabled
    if (!afterData.notifyMembers) {
      logger.info(
        { executionId, scheduleId },
        "notifyMembers is false - skipping notifications",
      );
      return;
    }

    // Idempotency check: skip if notifications were already sent
    if (afterData.notificationsSentAt) {
      logger.info(
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

      logger.info(
        {
          executionId,
          scheduleId,
          usersNotified: result.usersNotified,
          errors: result.errors,
        },
        "Schedule publish notification trigger complete",
      );
    } catch (error) {
      logger.error(
        {
          executionId,
          scheduleId,
          error: formatErrorMessage(error),
        },
        "Failed to create schedule publish notifications",
      );
      // Don't throw - we don't want to retry as that could cause duplicate notifications
      // The notificationsSentAt field will not be set, allowing manual retry if needed
    }
  },
);
