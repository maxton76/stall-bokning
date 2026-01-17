import type { Timestamp } from "firebase/firestore";

/**
 * Recurring Activity Types
 * Support for automated scheduling of daily care, health maintenance, and stable operations
 */

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
  | "feeding" // Utfodring
  | "mucking" // Mockning
  | "turnout" // Hage/utsläpp
  | "bring-in" // Intag
  | "health" // Hälsovård (farrier, vet, dental)
  | "grooming" // Skötsel
  | "cleaning" // Städning
  | "water" // Vattning
  | "hay" // Hö
  | "other"; // Övrigt

/**
 * Recurring Activity Pattern Definition
 * Stored in: recurringActivities/{id}
 */
export interface RecurringActivity {
  id: string;
  stableId: string;
  stableName?: string; // Denormalized for display
  organizationId?: string;

  // Display
  title: string;
  description?: string;
  category: RecurringActivityCategory;
  color?: string; // Hex color for calendar display
  icon?: string; // Emoji or icon identifier

  // Activity type reference (optional link to activityTypes collection)
  activityTypeId?: string;
  activityTypeName?: string;

  // Recurrence Pattern (iCal RRULE format)
  recurrenceRule: string; // e.g., "RRULE:FREQ=DAILY" or "RRULE:FREQ=WEEKLY;INTERVAL=6"
  timeOfDay: string; // "HH:MM" format, e.g., "07:00"
  duration: number; // Duration in minutes

  // Advanced timing (optional)
  timezone?: string; // Default: "Europe/Stockholm"
  startDate: Timestamp; // When this recurring pattern starts
  endDate?: Timestamp; // Optional end date for the pattern

  // Assignment Configuration
  assignmentMode: RecurringAssignmentMode;
  assignedTo?: string[]; // User IDs for fixed assignment
  assignedToNames?: string[]; // Denormalized names for display
  rotationGroup?: string[]; // User IDs for rotation assignment
  rotationGroupNames?: string[]; // Denormalized names
  currentRotationIndex?: number; // Track position in rotation

  // Horse Association
  horseId?: string; // Specific horse (for farrier, vet appointments)
  horseName?: string; // Denormalized for display
  appliesToAllHorses: boolean; // True for stable-wide activities (morning feed)
  horseGroupId?: string; // Target specific horse group
  horseGroupName?: string; // Denormalized for display

  // Fairness/Weighting
  weight: number; // 1-4 based on effort (see task weighting system)
  isHolidayMultiplied: boolean; // Apply 1.5x on weekends/holidays

  // Feeding Integration (optional, for category="feeding")
  feedingDetails?: FeedingActivityDetails;

  // Generation Settings
  generateDaysAhead: number; // How many days ahead to materialize instances (default: 60)
  lastGeneratedDate?: Timestamp; // Track generation progress
  instanceCount?: number; // Total instances generated

  // Status
  status: RecurringActivityStatus;

  // Metadata
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
  recurringActivityId: string; // Reference to parent pattern
  stableId: string;
  stableName?: string;
  organizationId?: string;

  // Display (inherited from RecurringActivity)
  title: string;
  description?: string;
  category: RecurringActivityCategory;
  color?: string;
  icon?: string;

  // Schedule
  scheduledDate: Timestamp; // Specific date for this instance
  scheduledTime: string; // "HH:MM" format
  scheduledEndTime?: string; // Calculated from duration
  duration: number; // Minutes

  // Assignment (resolved at generation or runtime)
  assignedTo?: string;
  assignedToName?: string;
  assignedAt?: Timestamp;
  assignedBy?: string; // "system" for auto-assignment

  // Horse Association
  horseId?: string;
  horseName?: string;
  appliesToAllHorses: boolean;
  horseGroupId?: string;
  horseGroupName?: string;

  // Progress Tracking (Feature #2)
  progress: ActivityProgress;
  checklist?: ChecklistItem[];

  // Status
  status: ActivityInstanceStatus;
  completedAt?: Timestamp;
  completedBy?: string;
  cancelledAt?: Timestamp;
  cancelledBy?: string;
  cancellationReason?: string;

  // Exception handling
  isException: boolean; // True if modified from pattern
  exceptionNote?: string; // Reason for exception

  // Fairness tracking
  weight: number;
  pointsAwarded?: number; // Actual points (may include multipliers)
  isHolidayShift?: boolean;

  // Metadata
  createdAt: Timestamp;
  createdBy: string; // "system" for auto-generated
  updatedAt: Timestamp;
  updatedBy: string;
}

/**
 * Activity Instance Status
 */
export type ActivityInstanceStatus =
  | "scheduled" // Upcoming
  | "in-progress" // Currently being worked on
  | "completed" // Done
  | "missed" // Overdue and not completed
  | "cancelled" // Explicitly cancelled
  | "skipped"; // Exception - skipped this occurrence

/**
 * Progress tracking for activity instances
 */
export interface ActivityProgress {
  value: number; // 0-100 percentage
  source: "manual" | "calculated"; // Manual entry or calculated from checklist
  displayText?: string; // e.g., "5 of 8 horses fed"
  lastUpdatedAt?: Timestamp;
  lastUpdatedBy?: string;
}

/**
 * Checklist item for tracking subtasks within an activity
 */
export interface ChecklistItem {
  id: string; // UUID for React keys
  text: string; // Horse name or task description
  entityType?: "horse" | "task" | "custom"; // Type of checklist item
  entityId?: string; // Horse ID if entityType is "horse"
  completed: boolean;
  completedAt?: Timestamp;
  completedBy?: string;
  order: number; // Sort order
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

  // Target date for the exception
  exceptionDate: Timestamp;

  // Exception type
  exceptionType: "skip" | "modify" | "add";

  // For modifications
  modifiedTitle?: string;
  modifiedTime?: string;
  modifiedAssignedTo?: string;
  modifiedAssignedToName?: string;

  // Reason
  reason?: string;

  // Metadata
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

// ============================================================
// Activity-Feeding Integration Types
// ============================================================

/**
 * Extended checklist item with feeding details
 * Used when a recurring activity includes feeding tasks
 */
export interface FeedingChecklistItem extends ChecklistItem {
  feedingDetails?: {
    horseFeedingId: string; // Reference to HorseFeeding
    horseId: string; // Horse ID
    horseName: string; // Denormalized for display
    feedTypeId: string; // Feed type ID
    feedTypeName: string; // Denormalized for display
    quantity: number; // Amount to feed
    quantityMeasure: string; // Unit (scoop, kg, etc.)
    inventoryId?: string; // Optional link to FeedInventory for deduction
    status: FeedingChecklistStatus;
    notes?: string; // Special instructions
    completedQuantity?: number; // Actual quantity given (if different)
    skippedReason?: string; // If skipped, why
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
  feedingTimeId: string; // Reference to FeedingTime
  feedingTimeName: string; // Denormalized
  autoGenerateChecklist: boolean; // Generate checklist from HorseFeedings
  includeHorseGroups?: string[]; // Filter to specific groups
  excludeHorseIds?: string[]; // Exclude specific horses
  inventoryDeductionEnabled: boolean; // Auto-deduct from inventory on completion
  requireQuantityConfirmation: boolean; // Require confirmation of actual quantities
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

  // Summary
  totalHorses: number;
  completedCount: number;
  skippedCount: number;
  partialCount: number;

  // Detailed records
  horseFeedings: FeedingCompletionItem[];

  // Inventory impact
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
  transactionId?: string; // Reference to InventoryTransaction
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

  // Status
  status: "pending" | "in-progress" | "completed" | "missed";
  scheduledTime: string;
  actualCompletionTime?: string;

  // Counts
  totalHorses: number;
  fedCount: number;
  skippedCount: number;
  pendingCount: number;

  // Assignment
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
