import type { FirestoreTimestamp } from "./common.js";
import type { RoutineAssignmentType, RoutineType } from "./routine.js";

/**
 * Routine Schedule Types
 * Persistent schedule definitions for recurring routines
 *
 * RoutineSchedule defines the recurring pattern (when, what template, how often)
 * while RoutineInstance represents a materialized occurrence of a schedule
 */

// ============================================================
// Repeat Pattern Types
// ============================================================

/**
 * Repeat pattern for routine schedules
 */
export type RoutineScheduleRepeatPattern = "daily" | "weekdays" | "custom";

// ============================================================
// Routine Schedule (Definition)
// ============================================================

/**
 * Routine Schedule - Persistent recurring schedule definition
 * Stored in: routineSchedules/{id}
 *
 * Links a RoutineTemplate to a recurring time pattern.
 * Used to automatically generate RoutineInstance documents.
 */
export interface RoutineSchedule {
  id: string;
  organizationId: string;
  stableId: string;
  templateId: string;

  // Denormalized for display
  templateName: string;
  templateType?: RoutineType;
  templateColor?: string;
  stableName?: string;

  // Schedule identity
  name?: string; // Optional custom name for this schedule

  // Schedule configuration
  startDate: FirestoreTimestamp;
  endDate?: FirestoreTimestamp; // null = indefinite
  repeatPattern: RoutineScheduleRepeatPattern;
  repeatDays?: number[]; // [0-6] where 0=Sunday, 6=Saturday (used when pattern is 'custom')
  scheduledStartTime: string; // "HH:MM" format, e.g., "07:00"

  // Assignment configuration
  assignmentMode: RoutineAssignmentType | "unassigned";
  defaultAssignedTo?: string; // User ID for manual assignment mode
  defaultAssignedToName?: string; // Denormalized

  // Status
  isEnabled: boolean;
  lastGeneratedDate?: FirestoreTimestamp; // Last date instances were generated
  nextGenerationDate?: FirestoreTimestamp; // Next date to generate instances

  // Audit
  createdAt: FirestoreTimestamp;
  createdBy: string;
  createdByName?: string;
  updatedAt: FirestoreTimestamp;
  updatedBy?: string;
  updatedByName?: string;
}

// ============================================================
// API Input Types
// ============================================================

/**
 * Input for creating a routine schedule
 */
export interface CreateRoutineScheduleInput {
  organizationId: string;
  stableId: string;
  templateId: string;

  // Optional custom name
  name?: string;

  // Schedule configuration
  startDate: string; // ISO date string
  endDate?: string; // ISO date string, optional
  repeatPattern: RoutineScheduleRepeatPattern;
  repeatDays?: number[]; // Required when repeatPattern is 'custom'
  scheduledStartTime: string; // "HH:MM" format

  // Assignment configuration
  assignmentMode: RoutineAssignmentType | "unassigned";
  defaultAssignedTo?: string;
}

/**
 * Input for updating a routine schedule
 */
export interface UpdateRoutineScheduleInput {
  name?: string;
  startDate?: string; // ISO date string
  endDate?: string | null; // null to remove end date
  repeatPattern?: RoutineScheduleRepeatPattern;
  repeatDays?: number[];
  scheduledStartTime?: string;
  assignmentMode?: RoutineAssignmentType | "unassigned";
  defaultAssignedTo?: string | null;
  isEnabled?: boolean;
}

/**
 * Query parameters for listing routine schedules
 */
export interface ListRoutineSchedulesQuery {
  stableId?: string;
  templateId?: string;
  isEnabled?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================================
// Utility Types
// ============================================================

/**
 * Routine schedule summary for list views
 */
export interface RoutineScheduleSummary {
  id: string;
  name?: string;
  templateId: string;
  templateName: string;
  templateType?: RoutineType;
  templateColor?: string;
  stableId: string;
  stableName?: string;
  startDate: string; // ISO date
  endDate?: string; // ISO date
  repeatPattern: RoutineScheduleRepeatPattern;
  repeatDays?: number[];
  scheduledStartTime: string;
  assignmentMode: RoutineAssignmentType | "unassigned";
  defaultAssignedToName?: string;
  isEnabled: boolean;
  lastGeneratedDate?: string; // ISO date
}

/**
 * Helper to get display text for repeat pattern
 */
export function getRepeatPatternDisplayText(
  pattern: RoutineScheduleRepeatPattern,
  repeatDays?: number[],
  locale: "sv" | "en" = "sv",
): string {
  const dayNames =
    locale === "sv"
      ? ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  switch (pattern) {
    case "daily":
      return locale === "sv" ? "Dagligen" : "Daily";
    case "weekdays":
      return locale === "sv" ? "Vardagar" : "Weekdays";
    case "custom":
      if (repeatDays && repeatDays.length > 0) {
        const sortedDays = [...repeatDays].sort((a, b) => a - b);
        return sortedDays.map((d) => dayNames[d]).join(", ");
      }
      return locale === "sv" ? "Anpassad" : "Custom";
    default:
      return pattern;
  }
}
