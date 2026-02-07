/**
 * Routine Instance Generator
 *
 * Generates routineInstance documents from a schedule definition.
 * Moved from Cloud Function trigger to API for reliability -
 * the Eventarc trigger had protobuf deserialization issues.
 */

import crypto from "crypto";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { db } from "./firebase.js";

// ============================================================================
// TYPES
// ============================================================================

interface ScheduleData {
  organizationId: string;
  stableId: string;
  templateId: string;
  stableName?: string;
  startDate: string; // YYYY-MM-DD (from validated API input)
  endDate: string; // YYYY-MM-DD (from validated API input)
  repeatPattern: "daily" | "weekdays" | "custom";
  repeatDays?: number[];
  scheduledStartTime: string;
  assignmentMode: string;
  defaultAssignedTo?: string;
  defaultAssignedToName?: string;
  customAssignments?: Record<string, string | null>;
}

interface TemplateData {
  id: string;
  name: string;
  estimatedDuration: number;
  pointsValue: number;
  steps: Array<{
    id: string;
    order: number;
    name: string;
    category: string;
  }>;
}

// ============================================================================
// HELPERS
// ============================================================================

function shouldGenerateForDate(
  date: Date,
  repeatPattern: "daily" | "weekdays" | "custom",
  repeatDays?: number[],
): boolean {
  const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday

  switch (repeatPattern) {
    case "daily":
      return true;
    case "weekdays":
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case "custom":
      return repeatDays?.includes(dayOfWeek) ?? false;
    default:
      return false;
  }
}

function generateScheduledDates(
  startDate: Date,
  endDate: Date,
  repeatPattern: "daily" | "weekdays" | "custom",
  repeatDays?: number[],
): Date[] {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);

  currentDate.setHours(0, 0, 0, 0);
  const normalizedEndDate = new Date(endDate);
  normalizedEndDate.setHours(23, 59, 59, 999);

  while (currentDate <= normalizedEndDate) {
    if (shouldGenerateForDate(currentDate, repeatPattern, repeatDays)) {
      dates.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

/**
 * Generate routine instances for a schedule.
 * Creates all instance documents in Firestore and updates the schedule
 * with generation metadata.
 *
 * @returns Number of instances created
 */
export async function generateRoutineInstances(
  scheduleId: string,
  schedule: ScheduleData,
  template: TemplateData,
): Promise<number> {
  const startDate = new Date(schedule.startDate);
  const endDate = new Date(schedule.endDate);

  const scheduledDates = generateScheduledDates(
    startDate,
    endDate,
    schedule.repeatPattern,
    schedule.repeatDays,
  );

  if (scheduledDates.length === 0) {
    return 0;
  }

  // Pre-fetch user names for custom assignments
  const userNameCache: Record<string, string> = {};
  if (schedule.customAssignments) {
    const userIds = new Set(
      Object.values(schedule.customAssignments).filter(
        (id): id is string => id !== null && id !== undefined,
      ),
    );

    const userFetches = Array.from(userIds).map(async (userId) => {
      try {
        const userDoc = await db.collection("users").doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          userNameCache[userId] =
            userData?.displayName ||
            `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim() ||
            "Unknown";
        }
      } catch {
        // Skip failed user name lookups
      }
    });
    await Promise.all(userFetches);
  }

  // Create instances in batches
  const BATCH_SIZE = 500;
  let totalCreated = 0;

  for (let i = 0; i < scheduledDates.length; i += BATCH_SIZE) {
    const batchDates = scheduledDates.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const date of batchDates) {
      const instanceId = crypto.randomUUID();
      const instanceRef = db.collection("routineInstances").doc(instanceId);
      const dateKey = formatDateKey(date);

      // Determine assignment
      const customAssignedUserId = schedule.customAssignments?.[dateKey];
      const hasCustomAssignment =
        customAssignedUserId !== undefined && customAssignedUserId !== null;

      let assignedTo: string | null = null;
      let assignedToName: string | null = null;
      let assignmentType: string;

      if (hasCustomAssignment) {
        assignedTo = customAssignedUserId;
        assignedToName = userNameCache[customAssignedUserId] || "Unknown";
        assignmentType = "auto";
      } else if (schedule.assignmentMode === "manual") {
        assignedTo = schedule.defaultAssignedTo || null;
        assignedToName = schedule.defaultAssignedToName || null;
        assignmentType = assignedTo ? "manual" : "unassigned";
      } else if (schedule.assignmentMode === "unassigned") {
        assignmentType = "unassigned";
      } else {
        assignmentType = schedule.assignmentMode;
      }

      // Build step progress
      const stepProgress: Record<string, unknown> = {};
      for (const step of template.steps) {
        stepProgress[step.id] = {
          stepId: step.id,
          status: "pending",
        };
      }

      const instanceData = {
        id: instanceId,
        scheduleId,
        templateId: schedule.templateId,
        templateName: template.name,
        organizationId: schedule.organizationId,
        stableId: schedule.stableId,
        stableName: schedule.stableName || null,

        scheduledDate: Timestamp.fromDate(date),
        scheduledStartTime: schedule.scheduledStartTime,
        estimatedDuration: template.estimatedDuration,

        assignedTo,
        assignedToName,
        assignmentType,

        status: "scheduled",

        progress: {
          stepsCompleted: 0,
          stepsTotal: template.steps.length,
          percentComplete: 0,
          stepProgress,
        },

        pointsValue: template.pointsValue,
        dailyNotesAcknowledged: false,

        createdAt: FieldValue.serverTimestamp(),
        createdBy: "system",
        updatedAt: FieldValue.serverTimestamp(),
      };

      batch.set(instanceRef, instanceData);
    }

    await batch.commit();
    totalCreated += batchDates.length;
  }

  // Update the schedule with generation metadata
  await db
    .collection("routineSchedules")
    .doc(scheduleId)
    .update({
      lastGeneratedDate: Timestamp.fromDate(
        scheduledDates[scheduledDates.length - 1],
      ),
      instancesGenerated: totalCreated,
      updatedAt: FieldValue.serverTimestamp(),
    });

  return totalCreated;
}
