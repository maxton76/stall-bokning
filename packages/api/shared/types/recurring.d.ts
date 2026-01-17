import type { Timestamp } from "firebase/firestore";
/**
 * Recurring Activity Types
 * Support for automated scheduling of daily care, health maintenance, and stable operations
 */
/**
 * Recurrence Pattern for lessons and scheduled activities
 * Used for defining repeating schedules (weekly, bi-weekly, monthly)
 */
export interface RecurrencePattern {
  /** Recurrence frequency type */
  frequency: "daily" | "weekly" | "biweekly" | "monthly";
  /** Interval between occurrences (e.g., 2 for every 2 weeks) */
  interval: number;
  /** Days of week for weekly patterns (0 = Sunday, 6 = Saturday) */
  daysOfWeek?: number[];
  /** Day of month for monthly patterns */
  dayOfMonth?: number;
  /** Maximum occurrences (optional) */
  count?: number;
  /** End date for the recurrence (optional) */
  until?: Timestamp | Date | string;
}
/**
 * Assignment mode for recurring activities
 * - fixed: Always assigned to specific users
 * - rotation: Rotates through a group of users (självskötare pattern)
 * - fair-distribution: Uses fairness algorithm based on accumulated weights
 */
export type RecurringAssignmentMode =
  | "fixed"
  | "rotation"
  | "fair-distribution";
/**
 * Status of a recurring activity pattern
 */
export type RecurringActivityStatus = "active" | "paused" | "archived";
/**
 * Recurring activity category (Swedish stable patterns)
 */
export type RecurringActivityCategory =
  | "feeding"
  | "mucking"
  | "turnout"
  | "bring-in"
  | "health"
  | "grooming"
  | "cleaning"
  | "water"
  | "hay"
  | "other";
/**
 * Recurring Activity Pattern Definition
 * Stored in: recurringActivities/{id}
 */
export interface RecurringActivity {
  id: string;
  stableId: string;
  stableName?: string;
  organizationId?: string;
  title: string;
  description?: string;
  category: RecurringActivityCategory;
  color?: string;
  icon?: string;
  activityTypeId?: string;
  activityTypeName?: string;
  recurrenceRule: string;
  timeOfDay: string;
  duration: number;
  timezone?: string;
  startDate: Timestamp;
  endDate?: Timestamp;
  assignmentMode: RecurringAssignmentMode;
  assignedTo?: string[];
  assignedToNames?: string[];
  rotationGroup?: string[];
  rotationGroupNames?: string[];
  currentRotationIndex?: number;
  horseId?: string;
  horseName?: string;
  appliesToAllHorses: boolean;
  horseGroupId?: string;
  horseGroupName?: string;
  weight: number;
  isHolidayMultiplied: boolean;
  feedingDetails?: FeedingActivityDetails;
  generateDaysAhead: number;
  lastGeneratedDate?: Timestamp;
  instanceCount?: number;
  status: RecurringActivityStatus;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}
/**
 * Activity Instance - Materialized from RecurringActivity
 * Stored in: activityInstances/{id}
 * These are the actual scheduled activities that users interact with
 */
export interface ActivityInstance {
  id: string;
  recurringActivityId: string;
  stableId: string;
  stableName?: string;
  organizationId?: string;
  title: string;
  description?: string;
  category: RecurringActivityCategory;
  color?: string;
  icon?: string;
  scheduledDate: Timestamp;
  scheduledTime: string;
  scheduledEndTime?: string;
  duration: number;
  assignedTo?: string;
  assignedToName?: string;
  assignedAt?: Timestamp;
  assignedBy?: string;
  horseId?: string;
  horseName?: string;
  appliesToAllHorses: boolean;
  horseGroupId?: string;
  horseGroupName?: string;
  progress: ActivityProgress;
  checklist?: ChecklistItem[];
  status: ActivityInstanceStatus;
  completedAt?: Timestamp;
  completedBy?: string;
  cancelledAt?: Timestamp;
  cancelledBy?: string;
  cancellationReason?: string;
  isException: boolean;
  exceptionNote?: string;
  weight: number;
  pointsAwarded?: number;
  isHolidayShift?: boolean;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}
/**
 * Activity Instance Status
 */
export type ActivityInstanceStatus =
  | "scheduled"
  | "in-progress"
  | "completed"
  | "missed"
  | "cancelled"
  | "skipped";
/**
 * Progress tracking for activity instances
 */
export interface ActivityProgress {
  value: number;
  source: "manual" | "calculated";
  displayText?: string;
  lastUpdatedAt?: Timestamp;
  lastUpdatedBy?: string;
}
/**
 * Checklist item for tracking subtasks within an activity
 */
export interface ChecklistItem {
  id: string;
  text: string;
  entityType?: "horse" | "task" | "custom";
  entityId?: string;
  completed: boolean;
  completedAt?: Timestamp;
  completedBy?: string;
  order: number;
}
/**
 * Recurring Activity Exception
 * Stored in: recurringActivityExceptions/{id}
 * Handles cancellations or modifications for specific dates
 */
export interface RecurringActivityException {
  id: string;
  recurringActivityId: string;
  stableId: string;
  exceptionDate: Timestamp;
  exceptionType: "skip" | "modify" | "add";
  modifiedTitle?: string;
  modifiedTime?: string;
  modifiedAssignedTo?: string;
  modifiedAssignedToName?: string;
  reason?: string;
  createdAt: Timestamp;
  createdBy: string;
}
/**
 * Create Recurring Activity input (for API)
 */
export interface CreateRecurringActivityInput {
  stableId: string;
  title: string;
  description?: string;
  category: RecurringActivityCategory;
  color?: string;
  icon?: string;
  activityTypeId?: string;
  recurrenceRule: string;
  timeOfDay: string;
  duration: number;
  startDate: Date | string;
  endDate?: Date | string;
  assignmentMode: RecurringAssignmentMode;
  assignedTo?: string[];
  rotationGroup?: string[];
  horseId?: string;
  appliesToAllHorses?: boolean;
  horseGroupId?: string;
  weight?: number;
  isHolidayMultiplied?: boolean;
  generateDaysAhead?: number;
}
/**
 * Update Recurring Activity input (for API)
 */
export interface UpdateRecurringActivityInput {
  title?: string;
  description?: string;
  category?: RecurringActivityCategory;
  color?: string;
  icon?: string;
  recurrenceRule?: string;
  timeOfDay?: string;
  duration?: number;
  endDate?: Date | string | null;
  assignmentMode?: RecurringAssignmentMode;
  assignedTo?: string[];
  rotationGroup?: string[];
  horseId?: string | null;
  appliesToAllHorses?: boolean;
  horseGroupId?: string | null;
  weight?: number;
  isHolidayMultiplied?: boolean;
  generateDaysAhead?: number;
  status?: RecurringActivityStatus;
}
/**
 * Batch update progress input
 */
export interface UpdateProgressInput {
  instanceId: string;
  progress?: number;
  checklistUpdates?: {
    itemId: string;
    completed: boolean;
  }[];
}
/**
 * Extended checklist item with feeding details
 * Used when a recurring activity includes feeding tasks
 */
export interface FeedingChecklistItem extends ChecklistItem {
  feedingDetails?: {
    horseFeedingId: string;
    horseId: string;
    horseName: string;
    feedTypeId: string;
    feedTypeName: string;
    quantity: number;
    quantityMeasure: string;
    inventoryId?: string;
    status: FeedingChecklistStatus;
    notes?: string;
    completedQuantity?: number;
    skippedReason?: string;
  };
}
/**
 * Status of a feeding checklist item
 */
export type FeedingChecklistStatus =
  | "pending"
  | "completed"
  | "skipped"
  | "partial";
/**
 * Feeding activity details - additional metadata for feeding-type activities
 * Linked via RecurringActivity.feedingDetails
 */
export interface FeedingActivityDetails {
  feedingTimeId: string;
  feedingTimeName: string;
  autoGenerateChecklist: boolean;
  includeHorseGroups?: string[];
  excludeHorseIds?: string[];
  inventoryDeductionEnabled: boolean;
  requireQuantityConfirmation: boolean;
}
/**
 * Feeding completion record - tracks actual feeding vs. scheduled
 * Stored in: feedingCompletions/{id}
 */
export interface FeedingCompletionRecord {
  id: string;
  activityInstanceId: string;
  stableId: string;
  feedingTimeId: string;
  completedAt: Timestamp;
  completedBy: string;
  completedByName?: string;
  totalHorses: number;
  completedCount: number;
  skippedCount: number;
  partialCount: number;
  horseFeedings: FeedingCompletionItem[];
  inventoryDeductions?: InventoryDeduction[];
}
/**
 * Individual horse feeding completion
 */
export interface FeedingCompletionItem {
  horseFeedingId: string;
  horseId: string;
  horseName: string;
  feedTypeId: string;
  feedTypeName: string;
  scheduledQuantity: number;
  actualQuantity: number;
  quantityMeasure: string;
  status: FeedingChecklistStatus;
  notes?: string;
  completedAt?: Timestamp;
  completedBy?: string;
}
/**
 * Inventory deduction record
 */
export interface InventoryDeduction {
  inventoryId: string;
  feedTypeId: string;
  feedTypeName: string;
  quantityDeducted: number;
  quantityMeasure: string;
  transactionId?: string;
}
/**
 * Extended RecurringActivity with feeding details
 * Used for feeding-category activities
 */
export interface RecurringFeedingActivity extends RecurringActivity {
  category: "feeding";
  feedingDetails: FeedingActivityDetails;
}
/**
 * API input for completing a feeding activity
 */
export interface CompleteFeedingActivityInput {
  activityInstanceId: string;
  completions: {
    horseFeedingId: string;
    status: FeedingChecklistStatus;
    actualQuantity?: number;
    notes?: string;
  }[];
  deductFromInventory?: boolean;
}
/**
 * Feeding activity summary for overview/analytics
 */
export interface FeedingActivitySummary {
  date: string;
  feedingTimeId: string;
  feedingTimeName: string;
  stableId: string;
  status: "pending" | "in-progress" | "completed" | "missed";
  scheduledTime: string;
  actualCompletionTime?: string;
  totalHorses: number;
  fedCount: number;
  skippedCount: number;
  pendingCount: number;
  assignedTo?: string;
  assignedToName?: string;
  completedBy?: string;
  completedByName?: string;
}
/**
 * Feeding overview for a specific date range
 */
export interface FeedingOverview {
  stableId: string;
  dateRange: {
    start: string;
    end: string;
  };
  feedingTimes: {
    id: string;
    name: string;
    time: string;
  }[];
  dailySummaries: {
    date: string;
    feedingActivities: FeedingActivitySummary[];
    completionRate: number;
  }[];
  overallCompletionRate: number;
  missedFeedingsCount: number;
}
//# sourceMappingURL=recurring.d.ts.map
