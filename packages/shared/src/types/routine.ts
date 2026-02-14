import type { FirestoreTimestamp } from "./common.js";

/**
 * Routine Flow Types
 * Support for guided step-by-step stable routines with horse-specific context
 *
 * Note: Uses FirestoreTimestamp from common.ts for cross-SDK compatibility
 * (works with both firebase-admin and firebase client SDK)
 */

// ============================================================
// Routine Categories (Swedish stable patterns)
// ============================================================

/**
 * Category for routine steps (aligned with Swedish stable terminology)
 */
export type RoutineCategory =
  | "preparation" // Förberedelse
  | "feeding" // Utfodring
  | "medication" // Medicinering
  | "blanket" // Täckehantering
  | "turnout" // Utsläpp
  | "bring_in" // Insläpp
  | "mucking" // Mockning
  | "water" // Vatten
  | "health_check" // Visitering
  | "safety" // Säkerhetskontroll
  | "cleaning" // Städning
  | "other"; // Övrigt

/**
 * Standard routine types (Swedish patterns)
 */
export type RoutineType = "morning" | "midday" | "evening" | "custom";

// ============================================================
// Routine Template (Definition)
// ============================================================

/**
 * Routine Template - Reusable routine pattern definition
 * Stored in: organizations/{orgId}/routineTemplates/{id}
 */
export interface RoutineTemplate {
  id: string;
  organizationId: string;
  stableId?: string; // Optional: stable-specific template

  // Identity
  name: string; // e.g., "Morgonpass", "Kvällspass"
  description?: string;
  type: RoutineType;
  icon?: string; // Emoji or icon identifier
  color?: string; // Hex color for display

  // Timing
  defaultStartTime: string; // "HH:MM" format, e.g., "06:30"
  estimatedDuration: number; // Total estimated duration in minutes

  // Steps (ordered)
  steps: RoutineStep[];

  // Settings
  requiresNotesRead: boolean; // Must read daily notes before starting
  allowSkipSteps: boolean; // Can steps be skipped?
  pointsValue: number; // Base points for fairness algorithm

  // Audit
  createdAt: FirestoreTimestamp;
  createdBy: string;
  updatedAt: FirestoreTimestamp;
  updatedBy?: string;
  isActive: boolean; // Toggle switch state
  deletedAt?: FirestoreTimestamp; // Soft delete timestamp
  deletedBy?: string; // User who soft deleted
}

/**
 * Individual step within a routine template
 */
export interface RoutineStep {
  id: string;
  order: number;

  // Step definition
  name: string; // "Morgonfodring", "Mockning", etc.
  description?: string;
  category: RoutineCategory;
  icon?: string; // Optional step-specific icon

  // Horse context configuration
  horseContext: RoutineStepHorseContext;
  horseFilter?: RoutineStepHorseFilter;

  // What to show per horse
  showFeeding?: boolean;
  showMedication?: boolean;
  showSpecialInstructions?: boolean;
  showBlanketStatus?: boolean;

  // Completion requirements
  requiresConfirmation: boolean;
  allowPartialCompletion: boolean; // Can complete some horses, skip others
  allowPhotoEvidence?: boolean; // Can attach photos

  // Time tracking
  estimatedMinutes?: number;

  // Link to FeedingTime for feeding steps (only relevant when category === "feeding")
  feedingTimeId?: string;
}

/**
 * Horse context mode for a step
 */
export type RoutineStepHorseContext =
  | "all" // Show all horses in stable
  | "specific" // Show specific horses
  | "groups" // Show horses from specific groups
  | "none"; // No horse context (e.g., general safety check)

/**
 * Filter for which horses to include in a step
 */
export interface RoutineStepHorseFilter {
  horseIds?: string[]; // Specific horse IDs
  groupIds?: string[]; // Horse group IDs
  locationIds?: string[]; // Location/paddock IDs
  excludeHorseIds?: string[]; // Horses to exclude
}

// ============================================================
// Routine Instance (Materialized for a specific date)
// ============================================================

/**
 * Routine Instance - Materialized routine for a specific date/assignment
 * Stored in: stables/{stableId}/routineInstances/{id}
 */
export interface RoutineInstance {
  id: string;
  scheduleId?: string; // Links to routineSchedule that created this instance
  templateId: string;
  templateName: string; // Denormalized for display
  organizationId: string;
  stableId: string;
  stableName?: string; // Denormalized for display

  // Scheduling
  scheduledDate: FirestoreTimestamp;
  scheduledStartTime: string; // "HH:MM" format
  estimatedDuration: number; // Minutes

  // Assignment
  assignedTo?: string;
  assignedToName?: string;
  assignmentType: RoutineAssignmentType;
  assignedAt?: FirestoreTimestamp;
  assignedBy?: string;

  // Status
  status: RoutineInstanceStatus;
  startedAt?: FirestoreTimestamp;
  startedBy?: string;
  startedByName?: string; // Denormalized name of user who started
  completedAt?: FirestoreTimestamp;
  completedBy?: string;
  completedByName?: string; // Denormalized name of user who completed
  cancelledAt?: FirestoreTimestamp;
  cancelledBy?: string;
  cancellationReason?: string;

  // Progress
  currentStepId?: string;
  currentStepOrder?: number;
  progress: RoutineProgress;

  // Fairness
  pointsValue: number;
  pointsAwarded?: number;
  isHolidayShift?: boolean;
  isHalfDayShift?: boolean;

  // Daily notes acknowledgment
  dailyNotesAcknowledged: boolean;
  dailyNotesAcknowledgedAt?: FirestoreTimestamp;

  // Notes
  notes?: string;

  // Metadata
  createdAt: FirestoreTimestamp;
  createdBy: string; // "system" for auto-generated
  updatedAt: FirestoreTimestamp;
  updatedBy?: string;
}

/**
 * Assignment type for routine instances
 */
export type RoutineAssignmentType = "auto" | "manual" | "self" | "unassigned";

/**
 * Status of a routine instance
 */
export type RoutineInstanceStatus =
  | "scheduled" // Upcoming, not started
  | "started" // In progress (notes acknowledged)
  | "in_progress" // Actively working on steps
  | "completed" // All steps completed
  | "missed" // Overdue and not completed
  | "cancelled"; // Explicitly cancelled

/**
 * Overall progress tracking for a routine instance
 */
export interface RoutineProgress {
  stepsCompleted: number;
  stepsTotal: number;
  percentComplete: number; // 0-100
  stepProgress: Record<string, StepProgress>; // Keyed by step ID
}

/**
 * Progress tracking for an individual step
 */
export interface StepProgress {
  stepId: string;
  status: StepStatus;
  startedAt?: FirestoreTimestamp;
  completedAt?: FirestoreTimestamp;

  // For steps without horse context
  generalNotes?: string;
  photoUrls?: string[];

  // Per-horse completion (for horse-context steps)
  horseProgress?: Record<string, HorseStepProgress>; // Keyed by horse ID
  horsesCompleted?: number;
  horsesTotal?: number;
}

/**
 * Step completion status
 */
export type StepStatus = "pending" | "in_progress" | "completed" | "skipped";

/**
 * Per-horse progress within a step
 */
export interface HorseStepProgress {
  horseId: string;
  horseName: string; // Denormalized
  completed: boolean;
  skipped: boolean;
  skipReason?: string;
  notes?: string;
  photoUrls?: string[]; // Firebase Storage URLs for evidence photos

  // Category-specific data
  feedingConfirmed?: boolean;
  feedingDetails?: HorseFeedingContext; // What to feed
  medicationGiven?: boolean;
  medicationSkipped?: boolean; // Triggers alert notification
  medicationDetails?: HorseMedicationContext; // What medication
  blanketAction?: "on" | "off" | "unchanged";
  blanketDetails?: HorseBlanketContext; // Blanket info

  // Timestamps
  completedAt?: FirestoreTimestamp;
  completedBy?: string;
}

/**
 * Horse feeding context displayed during routine step
 */
export interface HorseFeedingContext {
  feedTypeName: string;
  quantity: number;
  quantityMeasure: string;
  specialInstructions?: string;
}

/**
 * Horse medication context displayed during routine step
 */
export interface HorseMedicationContext {
  medicationName: string;
  dosage: string;
  administrationMethod: string;
  notes?: string;
  isRequired: boolean;
}

/**
 * Horse blanket context displayed during routine step
 */
export interface HorseBlanketContext {
  currentBlanket?: string;
  recommendedAction: "on" | "off" | "change" | "none";
  targetBlanket?: string;
  reason?: string;
}

// ============================================================
// Daily Notes
// ============================================================

/**
 * Daily Notes - Organization-wide notes for the day
 * Stored in: stables/{stableId}/dailyNotes/{date}
 * Date format: "YYYY-MM-DD"
 */
export interface DailyNotes {
  id: string; // Same as date: "YYYY-MM-DD"
  organizationId: string;
  stableId: string;
  date: string; // "YYYY-MM-DD"

  // General notes
  generalNotes?: string;
  weatherNotes?: string;

  // Horse-specific notes
  horseNotes: HorseDailyNote[];

  // Priority alerts (shown prominently)
  alerts: DailyAlert[];

  // Metadata
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  lastUpdatedBy: string;
  lastUpdatedByName?: string;
}

/**
 * Horse-specific note for the day
 */
export interface HorseDailyNote {
  id: string;
  horseId: string;
  horseName: string; // Denormalized
  note: string;
  priority: NotePriority;
  category?: DailyNoteCategory;
  createdAt: FirestoreTimestamp;
  createdBy: string;
  createdByName?: string;

  // Owner note extensions (date-range notes)
  rangeGroupId?: string; // UUID linking copies across days
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string; // "YYYY-MM-DD"
  routineType?: RoutineType | "all"; // Filter to specific routine or all
  isOwnerNote?: boolean; // Distinguish from staff notes
}

/**
 * Priority level for notes and alerts
 */
export type NotePriority = "info" | "warning" | "critical";

/**
 * Blanket action for horse step progress
 */
export type BlanketAction = "on" | "off" | "unchanged";

/**
 * Category for horse daily notes
 */
export type DailyNoteCategory =
  | "medication"
  | "health"
  | "feeding"
  | "blanket"
  | "behavior"
  | "other";

/**
 * Priority alert for the day
 */
export interface DailyAlert {
  id: string;
  title: string;
  message: string;
  priority: NotePriority;
  affectedHorseIds?: string[];
  affectedHorseNames?: string[]; // Denormalized
  expiresAt?: FirestoreTimestamp;
  createdAt: FirestoreTimestamp;
  createdBy: string;
  createdByName?: string;
}

// ============================================================
// API Input Types
// ============================================================

/**
 * Input for creating a routine instance
 */
export interface CreateRoutineInstanceInput {
  templateId: string;
  stableId: string;
  scheduledDate: string; // ISO date string
  scheduledStartTime?: string; // Optional - defaults to template's defaultStartTime
  assignedTo?: string;
}

/**
 * Input for creating a routine template
 */
export interface CreateRoutineTemplateInput {
  organizationId: string;
  stableId?: string;
  name: string;
  description?: string;
  type: RoutineType;
  icon?: string;
  color?: string;
  defaultStartTime: string;
  estimatedDuration: number;
  steps: CreateRoutineStepInput[];
  requiresNotesRead?: boolean;
  allowSkipSteps?: boolean;
  pointsValue?: number;
}

/**
 * Input for creating a routine step
 */
export interface CreateRoutineStepInput {
  name: string;
  description?: string;
  category: RoutineCategory;
  icon?: string;
  horseContext: RoutineStepHorseContext;
  horseFilter?: RoutineStepHorseFilter;
  showFeeding?: boolean;
  showMedication?: boolean;
  showSpecialInstructions?: boolean;
  showBlanketStatus?: boolean;
  requiresConfirmation?: boolean;
  allowPartialCompletion?: boolean;
  allowPhotoEvidence?: boolean;
  estimatedMinutes?: number;
  feedingTimeId?: string; // Link to FeedingTime for feeding steps
}

/**
 * Input for updating a routine template
 */
export interface UpdateRoutineTemplateInput {
  name?: string;
  description?: string;
  type?: RoutineType;
  stableId?: string | null; // Allow updating stable assignment (null = all stables)
  icon?: string;
  color?: string;
  defaultStartTime?: string;
  estimatedDuration?: number;
  steps?: CreateRoutineStepInput[];
  requiresNotesRead?: boolean;
  allowSkipSteps?: boolean;
  pointsValue?: number;
  isActive?: boolean;
}

/**
 * Input for starting a routine instance
 */
export interface StartRoutineInput {
  instanceId: string;
  dailyNotesAcknowledged: boolean;
}

/**
 * Input for updating step progress
 */
export interface UpdateStepProgressInput {
  instanceId: string;
  stepId: string;

  // General step completion
  status?: StepStatus;
  generalNotes?: string;
  photoUrls?: string[];

  // Horse-specific updates
  horseUpdates?: UpdateHorseProgressInput[];
}

/**
 * Input for updating horse progress within a step
 */
export interface UpdateHorseProgressInput {
  horseId: string;
  horseName?: string; // Optional for backwards compatibility
  completed?: boolean;
  skipped?: boolean;
  skipReason?: string;
  notes?: string;
  photoUrls?: string[];

  // Category-specific
  feedingConfirmed?: boolean;
  medicationGiven?: boolean;
  medicationSkipped?: boolean;
  blanketAction?: "on" | "off" | "unchanged";
}

/**
 * Input for completing a routine instance
 */
export interface CompleteRoutineInput {
  instanceId: string;
  notes?: string;
}

/**
 * Input for creating/updating daily notes
 */
export interface UpdateDailyNotesInput {
  stableId: string;
  date: string; // "YYYY-MM-DD"
  generalNotes?: string;
  weatherNotes?: string;
  horseNotes?: CreateHorseNoteInput[];
  alerts?: CreateAlertInput[];
}

/**
 * Input for creating a horse daily note
 */
export interface CreateHorseNoteInput {
  horseId: string;
  note: string;
  priority: NotePriority;
  category?: DailyNoteCategory;
}

/**
 * Input for creating an owner horse note (ranged)
 */
export interface CreateOwnerHorseNoteInput {
  horseId: string;
  note: string;
  priority: NotePriority;
  category?: DailyNoteCategory;
  startDate: string; // "YYYY-MM-DD"
  endDate?: string; // "YYYY-MM-DD" (defaults to startDate)
  routineType?: RoutineType | "all"; // Filter to specific routine type
}

/**
 * Input for updating an owner horse note across its date range
 */
export interface UpdateOwnerHorseNoteInput {
  note?: string;
  priority?: NotePriority;
  category?: DailyNoteCategory;
  routineType?: RoutineType | "all";
}

/**
 * Input for creating a daily alert
 */
export interface CreateAlertInput {
  title: string;
  message: string;
  priority: NotePriority;
  affectedHorseIds?: string[];
  expiresAt?: Date | string;
}

/**
 * Query parameters for listing routine templates
 */
export interface ListRoutineTemplatesQuery {
  type?: RoutineType;
  isActive?: boolean;
  stableId?: string;
}

/**
 * Query parameters for listing routine instances
 */
export interface ListRoutineInstancesQuery {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  status?: RoutineInstanceStatus;
  assignedTo?: string;
  templateId?: string;
  limit?: number;
  offset?: number;
}

// ============================================================
// Standard Templates (Pre-configured Swedish patterns)
// ============================================================

/**
 * Standard Swedish routine template definitions
 * Used for seeding new organizations
 */
export const STANDARD_ROUTINE_TEMPLATES: Omit<
  RoutineTemplate,
  "id" | "organizationId" | "createdAt" | "createdBy" | "updatedAt"
>[] = [
  {
    name: "Morgonpass",
    description: "Standard morgonrutin för stallet",
    type: "morning",
    icon: "sun",
    color: "#FFA500",
    defaultStartTime: "06:30",
    estimatedDuration: 90,
    requiresNotesRead: true,
    allowSkipSteps: true,
    pointsValue: 3,
    isActive: true,
    steps: [
      {
        id: "step-1",
        order: 1,
        name: "Läs dagens notiser",
        description: "Kontrollera dagens anteckningar och varningar",
        category: "preparation",
        icon: "clipboard",
        horseContext: "none",
        requiresConfirmation: true,
        allowPartialCompletion: false,
        estimatedMinutes: 5,
      },
      {
        id: "step-2",
        order: 2,
        name: "Morgonfodring",
        description: "Ge morgonfoder och tillskott till alla hästar",
        category: "feeding",
        icon: "utensils",
        horseContext: "all",
        showFeeding: true,
        showMedication: true,
        showSpecialInstructions: true,
        requiresConfirmation: true,
        allowPartialCompletion: true,
        allowPhotoEvidence: true,
        estimatedMinutes: 30,
      },
      {
        id: "step-3",
        order: 3,
        name: "Täckehantering",
        description: "Ta av/på täcken efter dagens väder",
        category: "blanket",
        icon: "coat",
        horseContext: "all",
        showBlanketStatus: true,
        requiresConfirmation: true,
        allowPartialCompletion: true,
        estimatedMinutes: 20,
      },
      {
        id: "step-4",
        order: 4,
        name: "Utsläpp",
        description: "Släpp ut hästarna i sina hagar",
        category: "turnout",
        icon: "gate",
        horseContext: "all",
        showSpecialInstructions: true,
        requiresConfirmation: true,
        allowPartialCompletion: true,
        estimatedMinutes: 25,
      },
      {
        id: "step-5",
        order: 5,
        name: "Vattencheck",
        description: "Kontrollera vatten i boxar och hinkar",
        category: "water",
        icon: "droplet",
        horseContext: "none",
        requiresConfirmation: true,
        allowPartialCompletion: false,
        estimatedMinutes: 10,
      },
    ],
  },
  {
    name: "Dagpass",
    description: "Lunchrutin med mockning",
    type: "midday",
    icon: "clock",
    color: "#4CAF50",
    defaultStartTime: "11:00",
    estimatedDuration: 120,
    requiresNotesRead: true,
    allowSkipSteps: true,
    pointsValue: 4,
    isActive: true,
    steps: [
      {
        id: "step-1",
        order: 1,
        name: "Läs notiser",
        description: "Kontrollera eventuella uppdateringar",
        category: "preparation",
        icon: "clipboard",
        horseContext: "none",
        requiresConfirmation: true,
        allowPartialCompletion: false,
        estimatedMinutes: 5,
      },
      {
        id: "step-2",
        order: 2,
        name: "Mockning",
        description: "Mocka alla boxar",
        category: "mucking",
        icon: "broom",
        horseContext: "all",
        requiresConfirmation: true,
        allowPartialCompletion: true,
        allowPhotoEvidence: true,
        estimatedMinutes: 90,
      },
      {
        id: "step-3",
        order: 3,
        name: "Lunchfodring",
        description: "Ge lunchtillägg om tillämpligt",
        category: "feeding",
        icon: "utensils",
        horseContext: "all",
        showFeeding: true,
        showMedication: true,
        requiresConfirmation: true,
        allowPartialCompletion: true,
        estimatedMinutes: 15,
      },
      {
        id: "step-4",
        order: 4,
        name: "Vattencheck i hagar",
        description: "Kontrollera vatten i alla hagar",
        category: "water",
        icon: "droplet",
        horseContext: "none",
        requiresConfirmation: true,
        allowPartialCompletion: false,
        estimatedMinutes: 10,
      },
    ],
  },
  {
    name: "Kvällspass",
    description: "Standard kvällsrutin för stallet",
    type: "evening",
    icon: "moon",
    color: "#3F51B5",
    defaultStartTime: "16:30",
    estimatedDuration: 90,
    requiresNotesRead: true,
    allowSkipSteps: true,
    pointsValue: 3,
    isActive: true,
    steps: [
      {
        id: "step-1",
        order: 1,
        name: "Läs notiser",
        description: "Kontrollera eventuella uppdateringar",
        category: "preparation",
        icon: "clipboard",
        horseContext: "none",
        requiresConfirmation: true,
        allowPartialCompletion: false,
        estimatedMinutes: 5,
      },
      {
        id: "step-2",
        order: 2,
        name: "Insläpp",
        description: "Hämta in alla hästar från hagen",
        category: "bring_in",
        icon: "home",
        horseContext: "all",
        showSpecialInstructions: true,
        requiresConfirmation: true,
        allowPartialCompletion: true,
        estimatedMinutes: 25,
      },
      {
        id: "step-3",
        order: 3,
        name: "Kvällsfodring",
        description: "Ge kvällsfoder, hö och mediciner",
        category: "feeding",
        icon: "utensils",
        horseContext: "all",
        showFeeding: true,
        showMedication: true,
        showSpecialInstructions: true,
        requiresConfirmation: true,
        allowPartialCompletion: true,
        allowPhotoEvidence: true,
        estimatedMinutes: 35,
      },
      {
        id: "step-4",
        order: 4,
        name: "Täcke på",
        description: "Lägg på nattäcken på de hästar som behöver",
        category: "blanket",
        icon: "coat",
        horseContext: "all",
        showBlanketStatus: true,
        requiresConfirmation: true,
        allowPartialCompletion: true,
        estimatedMinutes: 15,
      },
      {
        id: "step-5",
        order: 5,
        name: "Säkerhetskontroll",
        description: "Kontrollera dörrar, vatten, belysning",
        category: "safety",
        icon: "shield",
        horseContext: "none",
        requiresConfirmation: true,
        allowPartialCompletion: false,
        estimatedMinutes: 10,
      },
    ],
  },
];

// ============================================================
// Utility Types
// ============================================================

/**
 * Routine summary for list views
 */
export interface RoutineSummary {
  id: string;
  templateId: string;
  templateName: string;
  type: RoutineType;
  icon?: string;
  color?: string;
  scheduledDate: string; // "YYYY-MM-DD"
  scheduledStartTime: string;
  status: RoutineInstanceStatus;
  assignedToName?: string;
  progressPercent: number;
  stepsCompleted: number;
  stepsTotal: number;
}

/**
 * Daily routine overview
 */
export interface DailyRoutineOverview {
  date: string; // "YYYY-MM-DD"
  stableId: string;
  routines: RoutineSummary[];
  dailyNotesCount: number;
  alertsCount: number;
  hasUnreadNotes: boolean;
}

// ============================================================
// Horse Activity History
// ============================================================

/**
 * Horse Activity History Entry
 * Captures a snapshot of routine activity completion for a specific horse.
 * Single source of truth for all horse routine activities.
 *
 * Stored in: horseActivityHistory/{id}
 *
 * Query patterns:
 * - By horseId + executedAt (horse timeline)
 * - By horseId + category + executedAt (filtered horse timeline)
 * - By routineInstanceId + stepOrder (routine completed view)
 * - By stableId + executedAt (stable-wide activity view)
 */
export interface HorseActivityHistoryEntry {
  id: string;

  // Query keys
  horseId: string;
  routineInstanceId: string;
  routineStepId: string;
  organizationId: string;
  stableId: string;

  // Denormalized (snapshot at execution time)
  horseName: string;
  stableName?: string;

  // Routine context
  routineTemplateName: string;
  routineType: RoutineType;
  stepName: string;
  category: RoutineCategory;
  stepOrder: number;

  // Execution
  executionStatus: "completed" | "skipped";
  routineInstanceCompleted: boolean;
  executedAt: FirestoreTimestamp;
  executedBy: string;
  executedByName?: string;
  scheduledDate: FirestoreTimestamp;

  // Skip details
  skipReason?: string;
  notes?: string;
  photoUrls?: string[];

  // Category-specific snapshots (instructions AT execution time)
  feedingSnapshot?: {
    instructions: HorseFeedingContext;
    confirmed: boolean;
  };
  medicationSnapshot?: {
    instructions: HorseMedicationContext;
    given: boolean;
    skipped: boolean;
    skipReason?: string;
  };
  blanketSnapshot?: {
    instructions: HorseBlanketContext;
    action: "on" | "off" | "unchanged";
  };
  horseContextSnapshot?: {
    specialInstructions?: string;
    categoryInstructions?: string;
    horseGroupName?: string;
  };

  // Metadata
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  version: number;
}

/**
 * Input for creating horse activity history entries
 */
export interface CreateHorseActivityHistoryInput {
  horseId: string;
  routineInstanceId: string;
  routineStepId: string;
  organizationId: string;
  stableId: string;
  horseName: string;
  stableName?: string;
  routineTemplateName: string;
  routineType: RoutineType;
  stepName: string;
  category: RoutineCategory;
  stepOrder: number;
  executionStatus: "completed" | "skipped";
  executedBy: string;
  executedByName?: string;
  scheduledDate: Date | FirestoreTimestamp;
  skipReason?: string;
  notes?: string;
  photoUrls?: string[];
  feedingSnapshot?: HorseActivityHistoryEntry["feedingSnapshot"];
  medicationSnapshot?: HorseActivityHistoryEntry["medicationSnapshot"];
  blanketSnapshot?: HorseActivityHistoryEntry["blanketSnapshot"];
  horseContextSnapshot?: HorseActivityHistoryEntry["horseContextSnapshot"];
}

/**
 * Filters for querying horse activity history
 */
export interface HorseActivityHistoryFilters {
  category?: RoutineCategory;
  startDate?: Date | string;
  endDate?: Date | string;
  limit?: number;
  cursor?: string;
}

/**
 * Response for paginated horse activity history
 */
export interface HorseActivityHistoryResponse {
  activities: HorseActivityHistoryEntry[];
  nextCursor?: string;
  hasMore: boolean;
  totalCount?: number;
}
