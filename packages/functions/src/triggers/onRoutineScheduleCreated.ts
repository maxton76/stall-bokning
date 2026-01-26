/**
 * Routine Schedule Created Trigger
 *
 * Watches for new routineSchedules documents and generates
 * all routine instances from startDate to endDate.
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import * as crypto from "crypto";

import { db, Timestamp, FieldValue } from "../lib/firebase.js";
import { formatErrorMessage } from "@stall-bokning/shared";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface RoutineScheduleData {
  id?: string;
  organizationId: string;
  stableId: string;
  templateId: string;
  templateName?: string;
  templateType?: string;
  templateColor?: string;
  stableName?: string;
  name?: string;
  startDate: FirebaseFirestore.Timestamp;
  endDate: FirebaseFirestore.Timestamp;
  repeatPattern: "daily" | "weekdays" | "custom";
  repeatDays?: number[];
  scheduledStartTime: string;
  assignmentMode: "auto" | "manual" | "selfBooked" | "unassigned";
  defaultAssignedTo?: string;
  defaultAssignedToName?: string;
  customAssignments?: Record<string, string | null>; // key: YYYY-MM-DD, value: userId or null
  isEnabled: boolean;
  createdBy: string;
  createdByName?: string;
}

interface RoutineTemplateData {
  id: string;
  name: string;
  type: string;
  color?: string;
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
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a date should have an instance generated based on repeat pattern
 */
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
      return dayOfWeek >= 1 && dayOfWeek <= 5; // Mon-Fri
    case "custom":
      return repeatDays?.includes(dayOfWeek) ?? false;
    default:
      return false;
  }
}

/**
 * Generate all dates from startDate to endDate that match the repeat pattern
 */
function generateScheduledDates(
  startDate: Date,
  endDate: Date,
  repeatPattern: "daily" | "weekdays" | "custom",
  repeatDays?: number[],
): Date[] {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);

  // Normalize to midnight for consistent comparison
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

/**
 * Format date as YYYY-MM-DD for assignment lookup
 */
function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Create routine instance documents in batches
 */
async function createRoutineInstances(
  scheduleId: string,
  scheduleData: RoutineScheduleData,
  template: RoutineTemplateData,
  dates: Date[],
  executionId: string,
): Promise<number> {
  const BATCH_SIZE = 500; // Firestore batch limit
  let totalCreated = 0;

  // Pre-fetch user names for custom assignments if any
  const userNameCache: Record<string, string> = {};
  if (scheduleData.customAssignments) {
    const userIds = new Set(
      Object.values(scheduleData.customAssignments).filter(
        (id): id is string => id !== null && id !== undefined,
      ),
    );

    // Fetch all user documents in parallel
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
      } catch (err) {
        logger.warn(
          { executionId, userId, error: err },
          "Failed to fetch user name",
        );
      }
    });
    await Promise.all(userFetches);
  }

  // Process in batches
  for (let i = 0; i < dates.length; i += BATCH_SIZE) {
    const batchDates = dates.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const date of batchDates) {
      const instanceId = crypto.randomUUID();
      const instanceRef = db.collection("routineInstances").doc(instanceId);
      const dateKey = formatDateKey(date);

      // Check for custom assignment for this date
      const customAssignedUserId = scheduleData.customAssignments?.[dateKey];
      const hasCustomAssignment =
        customAssignedUserId !== undefined && customAssignedUserId !== null;

      // Determine assignment based on mode and custom assignments
      let assignedTo: string | null = null;
      let assignedToName: string | null = null;
      let assignmentType: string;

      if (hasCustomAssignment) {
        // Custom assignment from preview modal
        assignedTo = customAssignedUserId;
        assignedToName = userNameCache[customAssignedUserId] || "Unknown";
        assignmentType = "auto"; // Treated as auto since it came from auto mode
      } else if (scheduleData.assignmentMode === "manual") {
        // Manual mode - use default assignee
        assignedTo = scheduleData.defaultAssignedTo || null;
        assignedToName = scheduleData.defaultAssignedToName || null;
        assignmentType = assignedTo ? "manual" : "unassigned";
      } else if (scheduleData.assignmentMode === "unassigned") {
        assignmentType = "unassigned";
      } else {
        // Auto or selfBooked without custom assignment - leave unassigned
        assignmentType = scheduleData.assignmentMode;
      }

      // Build progress object with empty step progress
      const stepProgress: Record<string, unknown> = {};
      for (const step of template.steps) {
        stepProgress[step.id] = {
          stepId: step.id,
          status: "pending",
        };
      }

      const instanceData = {
        id: instanceId,
        scheduleId, // Link to the schedule that created this instance
        templateId: scheduleData.templateId,
        templateName: template.name,
        organizationId: scheduleData.organizationId,
        stableId: scheduleData.stableId,
        stableName: scheduleData.stableName || null,

        // Scheduling
        scheduledDate: Timestamp.fromDate(date),
        scheduledStartTime: scheduleData.scheduledStartTime,
        estimatedDuration: template.estimatedDuration,

        // Assignment
        assignedTo,
        assignedToName,
        assignmentType,

        // Status
        status: "scheduled",

        // Progress
        progress: {
          stepsCompleted: 0,
          stepsTotal: template.steps.length,
          percentComplete: 0,
          stepProgress,
        },

        // Fairness
        pointsValue: template.pointsValue,

        // Daily notes
        dailyNotesAcknowledged: false,

        // Metadata
        createdAt: FieldValue.serverTimestamp(),
        createdBy: "system",
        updatedAt: FieldValue.serverTimestamp(),
      };

      batch.set(instanceRef, instanceData);
    }

    await batch.commit();
    totalCreated += batchDates.length;

    logger.info(
      {
        executionId,
        scheduleId,
        batchNumber: Math.floor(i / BATCH_SIZE) + 1,
        batchSize: batchDates.length,
        totalCreated,
        totalDates: dates.length,
      },
      "Batch committed",
    );
  }

  return totalCreated;
}

// ============================================================================
// MAIN TRIGGER
// ============================================================================

/**
 * Firestore trigger for routine schedule creation
 *
 * Generates all routine instances from startDate to endDate
 * based on the repeat pattern.
 */
export const onRoutineScheduleCreated = onDocumentCreated(
  {
    document: "routineSchedules/{scheduleId}",
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 540, // 9 minutes for large schedules
  },
  async (event) => {
    const executionId = crypto.randomUUID();
    const scheduleId = event.params.scheduleId;

    if (!event.data) {
      logger.warn(
        { executionId, scheduleId },
        "No data in schedule create event",
      );
      return;
    }

    const scheduleData = event.data.data() as RoutineScheduleData | undefined;

    if (!scheduleData) {
      logger.warn({ executionId, scheduleId }, "No schedule data found");
      return;
    }

    logger.info(
      {
        executionId,
        scheduleId,
        templateId: scheduleData.templateId,
        stableId: scheduleData.stableId,
        startDate: scheduleData.startDate?.toDate?.()?.toISOString(),
        endDate: scheduleData.endDate?.toDate?.()?.toISOString(),
        repeatPattern: scheduleData.repeatPattern,
        isEnabled: scheduleData.isEnabled,
      },
      "Processing new routine schedule",
    );

    // Skip if schedule is disabled
    if (!scheduleData.isEnabled) {
      logger.info(
        { executionId, scheduleId },
        "Schedule is disabled - skipping instance generation",
      );
      return;
    }

    try {
      // Fetch the template for denormalized data
      const templateDoc = await db
        .collection("routineTemplates")
        .doc(scheduleData.templateId)
        .get();

      if (!templateDoc.exists) {
        logger.error(
          { executionId, scheduleId, templateId: scheduleData.templateId },
          "Template not found - cannot generate instances",
        );
        return;
      }

      const template = {
        id: templateDoc.id,
        ...templateDoc.data(),
      } as RoutineTemplateData;

      // Calculate all dates that need instances
      const startDate = scheduleData.startDate.toDate();
      const endDate = scheduleData.endDate.toDate();

      const scheduledDates = generateScheduledDates(
        startDate,
        endDate,
        scheduleData.repeatPattern,
        scheduleData.repeatDays,
      );

      logger.info(
        {
          executionId,
          scheduleId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          repeatPattern: scheduleData.repeatPattern,
          totalDates: scheduledDates.length,
        },
        "Generated scheduled dates",
      );

      if (scheduledDates.length === 0) {
        logger.info(
          { executionId, scheduleId },
          "No dates match the repeat pattern - no instances to create",
        );
        return;
      }

      // Create all routine instances
      const totalCreated = await createRoutineInstances(
        scheduleId,
        scheduleData,
        template,
        scheduledDates,
        executionId,
      );

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

      logger.info(
        {
          executionId,
          scheduleId,
          totalCreated,
          templateName: template.name,
          stableId: scheduleData.stableId,
        },
        "Routine schedule instance generation complete",
      );
    } catch (error) {
      logger.error(
        {
          executionId,
          scheduleId,
          error: formatErrorMessage(error),
        },
        "Failed to generate routine instances",
      );
      throw error; // Trigger retry
    }
  },
);
