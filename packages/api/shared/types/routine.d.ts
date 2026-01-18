import type { FirestoreTimestamp } from "./common.js";
/**
 * Routine Flow Types
 * Support for guided step-by-step stable routines with horse-specific context
 *
 * Note: Uses FirestoreTimestamp from common.ts for cross-SDK compatibility
 * (works with both firebase-admin and firebase client SDK)
 */
/**
 * Category for routine steps (aligned with Swedish stable terminology)
 */
export type RoutineCategory =
  | "preparation"
  | "feeding"
  | "medication"
  | "blanket"
  | "turnout"
  | "bring_in"
  | "mucking"
  | "water"
  | "health_check"
  | "safety"
  | "cleaning"
  | "other";
/**
 * Standard routine types (Swedish patterns)
 */
export type RoutineType = "morning" | "midday" | "evening" | "custom";
/**
 * Routine Template - Reusable routine pattern definition
 * Stored in: organizations/{orgId}/routineTemplates/{id}
 */
export interface RoutineTemplate {
  id: string;
  organizationId: string;
  stableId?: string;
  name: string;
  description?: string;
  type: RoutineType;
  icon?: string;
  color?: string;
  defaultStartTime: string;
  estimatedDuration: number;
  steps: RoutineStep[];
  requiresNotesRead: boolean;
  allowSkipSteps: boolean;
  pointsValue: number;
  createdAt: FirestoreTimestamp;
  createdBy: string;
  updatedAt: FirestoreTimestamp;
  updatedBy?: string;
  isActive: boolean;
}
/**
 * Individual step within a routine template
 */
export interface RoutineStep {
  id: string;
  order: number;
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
  requiresConfirmation: boolean;
  allowPartialCompletion: boolean;
  allowPhotoEvidence?: boolean;
  estimatedMinutes?: number;
}
/**
 * Horse context mode for a step
 */
export type RoutineStepHorseContext = "all" | "specific" | "groups" | "none";
/**
 * Filter for which horses to include in a step
 */
export interface RoutineStepHorseFilter {
  horseIds?: string[];
  groupIds?: string[];
  locationIds?: string[];
  excludeHorseIds?: string[];
}
/**
 * Routine Instance - Materialized routine for a specific date/assignment
 * Stored in: stables/{stableId}/routineInstances/{id}
 */
export interface RoutineInstance {
  id: string;
  templateId: string;
  templateName: string;
  organizationId: string;
  stableId: string;
  stableName?: string;
  scheduledDate: FirestoreTimestamp;
  scheduledStartTime: string;
  estimatedDuration: number;
  assignedTo?: string;
  assignedToName?: string;
  assignmentType: RoutineAssignmentType;
  assignedAt?: FirestoreTimestamp;
  assignedBy?: string;
  status: RoutineInstanceStatus;
  startedAt?: FirestoreTimestamp;
  completedAt?: FirestoreTimestamp;
  completedBy?: string;
  cancelledAt?: FirestoreTimestamp;
  cancelledBy?: string;
  cancellationReason?: string;
  currentStepId?: string;
  currentStepOrder?: number;
  progress: RoutineProgress;
  pointsValue: number;
  pointsAwarded?: number;
  isHolidayShift?: boolean;
  dailyNotesAcknowledged: boolean;
  dailyNotesAcknowledgedAt?: FirestoreTimestamp;
  notes?: string;
  createdAt: FirestoreTimestamp;
  createdBy: string;
  updatedAt: FirestoreTimestamp;
  updatedBy?: string;
}
/**
 * Assignment type for routine instances
 */
export type RoutineAssignmentType = "auto" | "manual" | "selfBooked";
/**
 * Status of a routine instance
 */
export type RoutineInstanceStatus =
  | "scheduled"
  | "started"
  | "in_progress"
  | "completed"
  | "missed"
  | "cancelled";
/**
 * Overall progress tracking for a routine instance
 */
export interface RoutineProgress {
  stepsCompleted: number;
  stepsTotal: number;
  percentComplete: number;
  stepProgress: Record<string, StepProgress>;
}
/**
 * Progress tracking for an individual step
 */
export interface StepProgress {
  stepId: string;
  status: StepStatus;
  startedAt?: FirestoreTimestamp;
  completedAt?: FirestoreTimestamp;
  generalNotes?: string;
  photoUrls?: string[];
  horseProgress?: Record<string, HorseStepProgress>;
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
  horseName: string;
  completed: boolean;
  skipped: boolean;
  skipReason?: string;
  notes?: string;
  photoUrls?: string[];
  feedingConfirmed?: boolean;
  feedingDetails?: HorseFeedingContext;
  medicationGiven?: boolean;
  medicationSkipped?: boolean;
  medicationDetails?: HorseMedicationContext;
  blanketAction?: "on" | "off" | "unchanged";
  blanketDetails?: HorseBlanketContext;
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
/**
 * Daily Notes - Organization-wide notes for the day
 * Stored in: stables/{stableId}/dailyNotes/{date}
 * Date format: "YYYY-MM-DD"
 */
export interface DailyNotes {
  id: string;
  organizationId: string;
  stableId: string;
  date: string;
  generalNotes?: string;
  weatherNotes?: string;
  horseNotes: HorseDailyNote[];
  alerts: DailyAlert[];
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
  horseName: string;
  note: string;
  priority: NotePriority;
  category?: DailyNoteCategory;
  createdAt: FirestoreTimestamp;
  createdBy: string;
  createdByName?: string;
}
/**
 * Priority level for notes and alerts
 */
export type NotePriority = "info" | "warning" | "critical";
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
  affectedHorseNames?: string[];
  expiresAt?: FirestoreTimestamp;
  createdAt: FirestoreTimestamp;
  createdBy: string;
  createdByName?: string;
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
}
/**
 * Input for updating a routine template
 */
export interface UpdateRoutineTemplateInput {
  name?: string;
  description?: string;
  type?: RoutineType;
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
  status?: StepStatus;
  generalNotes?: string;
  photoUrls?: string[];
  horseUpdates?: UpdateHorseProgressInput[];
}
/**
 * Input for updating horse progress within a step
 */
export interface UpdateHorseProgressInput {
  horseId: string;
  completed?: boolean;
  skipped?: boolean;
  skipReason?: string;
  notes?: string;
  photoUrls?: string[];
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
  date: string;
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
 * Standard Swedish routine template definitions
 * Used for seeding new organizations
 */
export declare const STANDARD_ROUTINE_TEMPLATES: Omit<
  RoutineTemplate,
  "id" | "organizationId" | "createdAt" | "createdBy" | "updatedAt"
>[];
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
  scheduledDate: string;
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
  date: string;
  stableId: string;
  routines: RoutineSummary[];
  dailyNotesCount: number;
  alertsCount: number;
  hasUnreadNotes: boolean;
}
//# sourceMappingURL=routine.d.ts.map
