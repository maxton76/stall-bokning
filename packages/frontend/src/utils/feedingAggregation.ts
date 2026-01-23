/**
 * Feeding Aggregation Utilities
 *
 * Reusable functions for extracting and aggregating feeding data from routine instances.
 * Used by FeedingTodayPage, dashboards, and reports.
 */

import type { RoutineInstance, RoutineStep, StepProgress } from "@shared/types";
import type { FeedingTime } from "@shared/types";

// ============================================================================
// Types
// ============================================================================

/**
 * Status for a feeding session derived from routine instance state
 */
export type FeedingSessionStatus =
  | "pending" // Not yet time
  | "upcoming" // Within 30 minutes of scheduled time
  | "active" // Past scheduled time but within 2 hours
  | "in_progress" // Currently being executed
  | "completed" // Successfully completed
  | "overdue"; // More than 2 hours past scheduled time and not completed

/**
 * View model for displaying feeding sessions on FeedingTodayPage
 */
export interface FeedingSessionView {
  // Source references
  instanceId: string;
  stepId: string;
  feedingTimeId?: string;

  // Display
  name: string; // Step name, e.g., "Morgonfodring"
  time: string; // From FeedingTime.time or routine scheduled time
  routineName: string; // Parent routine name

  // Status (derived from routine instance)
  status: FeedingSessionStatus;

  // Progress (from stepProgress)
  horsesTotal: number;
  horsesCompleted: number;

  // Completion info
  completedAt?: string;
  completedBy?: string;
  completedByName?: string;
}

/**
 * Information about a feeding step extracted from a routine instance
 */
export interface FeedingStepInfo {
  instanceId: string;
  step: RoutineStep;
  stepProgress?: StepProgress;
  instance: RoutineInstance;
}

// ============================================================================
// Extraction Functions
// ============================================================================

/**
 * Extract all feeding steps from routine instances
 *
 * @param instances - Routine instances to extract from
 * @returns Array of feeding step info
 */
export function extractFeedingSteps(
  instances: RoutineInstance[],
): FeedingStepInfo[] {
  const feedingSteps: FeedingStepInfo[] = [];

  for (const instance of instances) {
    // Get template from instance (may be embedded or need separate fetch)
    const template = (instance as any).template;
    if (!template?.steps) continue;

    for (const step of template.steps as RoutineStep[]) {
      if (step.category === "feeding") {
        feedingSteps.push({
          instanceId: instance.id,
          step,
          stepProgress: instance.progress?.stepProgress?.[step.id],
          instance,
        });
      }
    }
  }

  return feedingSteps;
}

// ============================================================================
// Status Calculation
// ============================================================================

/**
 * Calculate feeding session status based on instance/step state and time
 *
 * @param instance - The routine instance
 * @param step - The routine step
 * @param feedingTime - Optional linked FeedingTime for accurate scheduling
 * @returns The calculated status
 */
export function calculateFeedingStatus(
  instance: RoutineInstance,
  step: RoutineStep,
  feedingTime?: FeedingTime,
): FeedingSessionStatus {
  const stepProgress = instance.progress?.stepProgress?.[step.id];

  // Check if step is completed
  if (stepProgress?.status === "completed") return "completed";
  if (stepProgress?.status === "skipped") return "completed"; // Treat skipped as completed for display

  // Check if routine is in progress and on this step
  if (instance.status === "in_progress" || instance.status === "started") {
    const template = (instance as any).template;
    const steps = template?.steps as RoutineStep[] | undefined;
    if (steps) {
      const currentStepIndex = instance.progress?.stepsCompleted ?? 0;
      const stepIndex = steps.findIndex((s) => s.id === step.id);

      if (stepIndex === currentStepIndex) return "in_progress";
      if (stepIndex < currentStepIndex) return "completed";
    }
  }

  // Calculate time-based status
  const scheduledTime = feedingTime?.time || instance.scheduledStartTime;
  const now = new Date();

  // Parse scheduled time
  const timeParts = scheduledTime.split(":");
  const hours = parseInt(timeParts[0] ?? "0", 10);
  const minutes = parseInt(timeParts[1] ?? "0", 10);

  const scheduled = new Date();
  scheduled.setHours(hours, minutes, 0, 0);

  const diffMinutes = (now.getTime() - scheduled.getTime()) / 60000;

  if (diffMinutes > 120) return "overdue"; // More than 2 hours late
  if (diffMinutes > 0) return "active"; // Past scheduled time
  if (diffMinutes > -30) return "upcoming"; // Within 30 minutes
  return "pending"; // Not yet time
}

// ============================================================================
// Progress Calculation
// ============================================================================

/**
 * Get step feeding progress with horse counts
 *
 * @param instance - The routine instance
 * @param stepId - The step ID to get progress for
 * @returns Object with total, completed, and skipped counts
 */
export function getStepFeedingProgress(
  instance: RoutineInstance,
  stepId: string,
): { total: number; completed: number; skipped: number } {
  const stepProgress = instance.progress?.stepProgress?.[stepId];

  if (!stepProgress) {
    return { total: 0, completed: 0, skipped: 0 };
  }

  // Use horsesTotal/horsesCompleted if available
  if (
    typeof stepProgress.horsesTotal === "number" &&
    typeof stepProgress.horsesCompleted === "number"
  ) {
    return {
      total: stepProgress.horsesTotal,
      completed: stepProgress.horsesCompleted,
      skipped: 0,
    };
  }

  // Fall back to counting horseProgress entries
  const horseProgress = stepProgress.horseProgress ?? {};
  const entries = Object.values(horseProgress);

  return {
    total: entries.length,
    completed: entries.filter((h) => h.completed).length,
    skipped: entries.filter((h) => h.skipped).length,
  };
}

// ============================================================================
// Aggregation
// ============================================================================

/**
 * Aggregate feeding sessions from routine instances and feeding times
 *
 * @param instances - Today's routine instances
 * @param feedingTimes - Available feeding times for the stable
 * @returns Array of FeedingSessionView for display
 */
export function aggregateFeedingSessions(
  instances: RoutineInstance[],
  feedingTimes: FeedingTime[],
): FeedingSessionView[] {
  const feedingSteps = extractFeedingSteps(instances);

  return feedingSteps.map((info) => {
    // Find linked feeding time if feedingTimeId is set
    const feedingTime = info.step.feedingTimeId
      ? feedingTimes.find((ft) => ft.id === info.step.feedingTimeId)
      : undefined;

    // Calculate status
    const status = calculateFeedingStatus(
      info.instance,
      info.step,
      feedingTime,
    );

    // Get progress
    const progress = getStepFeedingProgress(info.instance, info.step.id);

    // Get completion info from step progress
    const stepProgress = info.stepProgress;
    const completedAt = stepProgress?.completedAt
      ? formatTimestamp(stepProgress.completedAt)
      : undefined;

    return {
      instanceId: info.instanceId,
      stepId: info.step.id,
      feedingTimeId: info.step.feedingTimeId,
      name: info.step.name,
      time: feedingTime?.time || info.instance.scheduledStartTime,
      routineName: info.instance.templateName,
      status,
      horsesTotal: progress.total,
      horsesCompleted: progress.completed,
      completedAt,
      completedBy: undefined, // Could be extracted from instance.completedBy if needed
      completedByName: info.instance.completedByName,
    };
  });
}

/**
 * Sort feeding sessions by time
 *
 * @param sessions - Feeding sessions to sort
 * @returns Sorted array (earliest first)
 */
export function sortFeedingSessionsByTime(
  sessions: FeedingSessionView[],
): FeedingSessionView[] {
  return [...sessions].sort((a, b) => {
    const timeA = parseTimeToMinutes(a.time);
    const timeB = parseTimeToMinutes(b.time);
    return timeA - timeB;
  });
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse HH:MM time string to minutes since midnight
 */
function parseTimeToMinutes(time: string): number {
  const parts = time.split(":");
  const hours = parseInt(parts[0] ?? "0", 10);
  const minutes = parseInt(parts[1] ?? "0", 10);
  return hours * 60 + minutes;
}

/**
 * Format a Firestore timestamp to HH:MM string
 */
function formatTimestamp(
  timestamp: { seconds?: number; toDate?: () => Date } | string | Date,
): string {
  let date: Date;

  if (typeof timestamp === "string") {
    date = new Date(timestamp);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp.toDate === "function") {
    date = timestamp.toDate();
  } else if (typeof timestamp.seconds === "number") {
    date = new Date(timestamp.seconds * 1000);
  } else {
    return "";
  }

  return date.toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
