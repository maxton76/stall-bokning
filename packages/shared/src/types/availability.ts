import type { Timestamp } from "firebase/firestore";

/**
 * Leave request types
 */
export type LeaveType = "vacation" | "sick" | "parental" | "other";

/**
 * Leave request status
 */
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

/**
 * Partial day leave type
 * - morning: First half of work day
 * - afternoon: Second half of work day
 * - custom: Custom time range within work day
 */
export type PartialDayType = "morning" | "afternoon" | "custom";

/**
 * Leave request document structure
 * Users can request time off which requires approval
 */
export interface LeaveRequest {
  id: string;
  userId: string;
  userName?: string; // Cached for display
  userEmail?: string; // Cached for display
  organizationId: string;

  // Request details
  type: LeaveType;
  firstDay: Timestamp;
  lastDay: Timestamp;
  note?: string;

  // Partial day support (Phase 3.1)
  isPartialDay: boolean; // True if this is a partial day leave
  partialDayType?: PartialDayType; // Only set if isPartialDay is true
  partialDayStartTime?: string; // "HH:MM" format, only for custom type
  partialDayEndTime?: string; // "HH:MM" format, only for custom type

  // Calculated impact
  impactHours: number; // Total hours of leave based on work schedule

  // Status and workflow
  status: LeaveStatus;
  requestedAt: Timestamp;

  // Review details (when approved/rejected)
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  reviewerName?: string; // Cached for display
  reviewNote?: string;

  // Cancellation (by user)
  cancelledAt?: Timestamp;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Leave request for display in UI
 */
export interface LeaveRequestDisplay extends Omit<
  LeaveRequest,
  | "firstDay"
  | "lastDay"
  | "requestedAt"
  | "reviewedAt"
  | "cancelledAt"
  | "createdAt"
  | "updatedAt"
> {
  firstDay: Date;
  lastDay: Date;
  requestedAt: Date;
  reviewedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Computed fields
  periodDisplay: string; // e.g., "Jan 5 - Jan 7, 2026" or "Jan 5 (morning)"
  durationDays: number;
  partialDayDisplay?: string; // e.g., "Morning (08:00-12:00)"
}

/**
 * Day of week schedule entry
 */
export interface DaySchedule {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sunday, 1=Monday, etc.
  startTime: string; // "HH:MM" format
  hours: number; // Hours to work this day
  isWorkDay: boolean; // Whether this is a working day
}

/**
 * Work schedule document structure
 * Admin-assigned schedule for each user
 */
export interface WorkSchedule {
  id: string;
  userId: string;
  userName?: string; // Cached for display
  userEmail?: string; // Cached for display
  organizationId: string;

  // Weekly schedule configuration
  weeklySchedule: DaySchedule[];

  // Effective period
  effectiveFrom: Timestamp;
  effectiveUntil?: Timestamp; // null = currently active

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  lastModifiedBy: string;
}

/**
 * Work schedule for display in UI
 */
export interface WorkScheduleDisplay extends Omit<
  WorkSchedule,
  "effectiveFrom" | "effectiveUntil" | "createdAt" | "updatedAt"
> {
  effectiveFrom: Date;
  effectiveUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Computed fields
  totalWeeklyHours: number;
  isCurrentlyActive: boolean;
}

/**
 * Balance accrual configuration (organization-level)
 */
export interface AccrualConfig {
  // Monthly accrual
  monthlyAccrualHours: number; // e.g., 2.5 hours/month = 30 hours/year

  // Carryover rules
  maxCarryoverHours: number; // Max hours to carry to next year
  carryoverExpiryMonths: number; // How long carryover is valid (0 = no expiry)

  // Cap
  maxBalanceHours: number; // Maximum balance allowed
}

/**
 * Time balance document structure
 * Tracks accumulated and used time for a user per year
 */
export interface TimeBalance {
  id: string; // Format: {userId}_{organizationId}_{year}
  userId: string;
  userName?: string; // Cached for display
  organizationId: string;
  year: number; // e.g., 2026

  // Accumulated hours (positive)
  carryoverFromPreviousYear: number; // Hours carried from last year
  buildUpHours: number; // Hours accrued this year
  corrections: number; // Manual adjustments (can be negative)

  // Used hours (tracked for reporting)
  approvedLeave: number; // Total hours of approved leave
  tentativeLeave: number; // Total hours of pending leave
  approvedOvertime: number; // Approved overtime hours

  // Configuration override (if different from org default)
  customAccrualConfig?: Partial<AccrualConfig>;

  // Metadata
  updatedAt: Timestamp;
  lastAccrualDate?: Timestamp; // When balance was last accrued
}

/**
 * Time balance for display in UI
 */
export interface TimeBalanceDisplay extends Omit<
  TimeBalance,
  "updatedAt" | "lastAccrualDate"
> {
  updatedAt: Date;
  lastAccrualDate?: Date;
  // Computed fields
  currentBalance: number; // carryover + buildUp + corrections - approvedLeave
  endOfYearProjection: number; // Projected balance at end of year
}

/**
 * Balance correction record
 * Audit trail for manual adjustments
 */
export interface BalanceCorrection {
  id: string;
  timeBalanceId: string;
  userId: string;
  organizationId: string;
  year: number;

  // Correction details
  amount: number; // Can be positive or negative
  reason: string;

  // Applied by
  appliedBy: string;
  appliedByName?: string; // Cached for display
  appliedAt: Timestamp;
}

/**
 * Organization-level availability settings
 */
export interface AvailabilitySettings {
  organizationId: string;

  // Accrual configuration
  accrualConfig: AccrualConfig;

  // Leave policies
  requireApproval: boolean; // If false, leave requests are auto-approved
  sickLeaveAutoApprove: boolean; // If true, sick leave is auto-approved
  maxConsecutiveLeaveDays: number; // Max days for a single request (0 = unlimited)
  minAdvanceNoticeDays: number; // How many days in advance to request (0 = same day allowed)

  // Notifications
  notifyOnRequest: boolean; // Notify admins of new requests
  notifyOnApproval: boolean; // Notify user when request is approved/rejected

  // Metadata
  updatedAt: Timestamp;
  updatedBy: string;
}

/**
 * Default work schedule template
 * Standard 9-5 weekday schedule
 */
export const DEFAULT_WEEKLY_SCHEDULE: DaySchedule[] = [
  { dayOfWeek: 0, startTime: "08:00", hours: 0, isWorkDay: false }, // Sunday
  { dayOfWeek: 1, startTime: "08:00", hours: 8, isWorkDay: true }, // Monday
  { dayOfWeek: 2, startTime: "08:00", hours: 8, isWorkDay: true }, // Tuesday
  { dayOfWeek: 3, startTime: "08:00", hours: 8, isWorkDay: true }, // Wednesday
  { dayOfWeek: 4, startTime: "08:00", hours: 8, isWorkDay: true }, // Thursday
  { dayOfWeek: 5, startTime: "08:00", hours: 8, isWorkDay: true }, // Friday
  { dayOfWeek: 6, startTime: "08:00", hours: 0, isWorkDay: false }, // Saturday
];

/**
 * Default accrual configuration
 * 2.5 hours/month = 30 hours/year
 */
export const DEFAULT_ACCRUAL_CONFIG: AccrualConfig = {
  monthlyAccrualHours: 2.5,
  maxCarryoverHours: 40,
  carryoverExpiryMonths: 3, // Carryover expires after 3 months
  maxBalanceHours: 200,
};

/**
 * Default availability settings
 */
export const DEFAULT_AVAILABILITY_SETTINGS: Omit<
  AvailabilitySettings,
  "organizationId" | "updatedAt" | "updatedBy"
> = {
  accrualConfig: DEFAULT_ACCRUAL_CONFIG,
  requireApproval: true,
  sickLeaveAutoApprove: true,
  maxConsecutiveLeaveDays: 30,
  minAdvanceNoticeDays: 0,
  notifyOnRequest: true,
  notifyOnApproval: true,
};

// ============================================================
// Availability Constraints (Phase 3.2)
// ============================================================

/**
 * Constraint type
 * - never_available: User is never available during these times
 * - preferred: User prefers these times (soft constraint)
 */
export type ConstraintType = "never_available" | "preferred";

/**
 * Availability Constraint
 * Defines recurring times when a user is not available (or preferred)
 * Stored in: availabilityConstraints/{id}
 */
export interface AvailabilityConstraint {
  id: string;
  userId: string;
  userName?: string; // Denormalized for display
  organizationId: string;

  // Constraint type
  type: ConstraintType;

  // When does this constraint apply?
  isRecurring: boolean; // True for weekly patterns
  dayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6; // Only for recurring (0=Sunday)
  specificDate?: Timestamp; // Only for one-time constraints

  // Time range
  startTime: string; // "HH:MM" format
  endTime: string; // "HH:MM" format
  isAllDay: boolean; // If true, ignore start/end times

  // Description
  reason?: string; // e.g., "School pickup", "Second job"

  // Validity period for recurring constraints
  effectiveFrom?: Timestamp; // When this constraint starts applying
  effectiveUntil?: Timestamp; // When this constraint stops applying (null = indefinite)

  // Status
  isActive: boolean;

  // Metadata
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

/**
 * Availability Constraint for display in UI
 */
export interface AvailabilityConstraintDisplay extends Omit<
  AvailabilityConstraint,
  | "specificDate"
  | "effectiveFrom"
  | "effectiveUntil"
  | "createdAt"
  | "updatedAt"
> {
  specificDate?: Date;
  effectiveFrom?: Date;
  effectiveUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Computed fields
  displayText: string; // e.g., "Mondays 15:00-17:00"
  typeDisplay: string; // Localized type
}

// ============================================================
// Availability Calendar Types (Phase 3.2)
// ============================================================

/**
 * Leave status for a calendar day
 */
export type CalendarLeaveStatus = "none" | "pending" | "approved" | "partial";

/**
 * Availability calendar day
 * Used for displaying availability in calendar view
 */
export interface AvailabilityCalendarDay {
  date: string; // "YYYY-MM-DD" format
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;

  // Work schedule
  isWorkDay: boolean;
  scheduledHours: number;
  workStartTime?: string;
  workEndTime?: string;

  // Leave status
  leaveStatus: CalendarLeaveStatus;
  leaveType?: LeaveType;
  leaveRequestId?: string;
  isPartialLeave?: boolean;
  leaveHours?: number;

  // Constraints
  hasConstraints: boolean;
  constraintHours?: number; // Hours blocked by constraints
  constraints?: {
    id: string;
    type: ConstraintType;
    startTime: string;
    endTime: string;
    reason?: string;
  }[];

  // Assignments
  hasAssignments: boolean;
  assignmentCount: number;
  assignedHours?: number;
  assignments?: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
  }[];

  // Computed availability
  availableHours: number; // scheduledHours - leaveHours - constraintHours
  isFullyAvailable: boolean;
  isPartiallyAvailable: boolean;
  isUnavailable: boolean;
}

/**
 * Staff availability matrix row
 * Used for team availability overview
 */
export interface StaffAvailabilityRow {
  userId: string;
  userName: string;
  userEmail?: string;
  role?: string;

  // Daily availability
  days: {
    date: string;
    availableHours: number;
    isAvailable: boolean;
    leaveStatus: CalendarLeaveStatus;
    hasConstraints: boolean;
    assignmentCount: number;
  }[];

  // Summary
  totalAvailableHours: number;
  totalScheduledHours: number;
  availabilityPercentage: number;
}

/**
 * Staff availability matrix
 * Team-wide availability overview
 */
export interface StaffAvailabilityMatrix {
  organizationId: string;
  dateRange: {
    start: string; // "YYYY-MM-DD"
    end: string;
  };

  // Staff data
  staffAvailability: StaffAvailabilityRow[];

  // Team summary by date
  teamSummary: {
    date: string;
    totalStaff: number;
    availableStaff: number;
    totalAvailableHours: number;
    coverageScore: number; // 0-100, percentage of coverage
    hasShortage: boolean; // True if below minimum staffing
  }[];

  // Overall summary
  averageDailyAvailability: number;
  minimumStaffingMet: boolean;
  shortageCount: number; // Number of days with staffing shortage
}

// ============================================================
// Availability Check Types (Phase 3.4)
// ============================================================

/**
 * Availability conflict type
 */
export type AvailabilityConflictType =
  | "approved_leave"
  | "pending_leave"
  | "constraint"
  | "existing_assignment"
  | "outside_work_hours";

/**
 * Availability conflict
 * Represents a conflict when trying to assign work
 */
export interface AvailabilityConflict {
  type: AvailabilityConflictType;
  severity: "blocking" | "warning"; // blocking = cannot assign, warning = can override
  description: string;
  startTime?: string;
  endTime?: string;
  relatedId?: string; // Leave request ID, constraint ID, or assignment ID
}

/**
 * Staff availability check result
 * Used when checking if staff can be assigned
 */
export interface StaffAvailabilityCheck {
  userId: string;
  userName: string;
  date: string;
  requestedStartTime: string;
  requestedEndTime: string;

  // Result
  isAvailable: boolean;
  canOverride: boolean; // True if conflicts are only warnings

  // Conflicts (if any)
  conflicts: AvailabilityConflict[];

  // Work schedule context
  isWorkDay: boolean;
  scheduledHours: number;
  workStartTime?: string;
  workEndTime?: string;
}

/**
 * Available staff for activity
 * Used for suggesting staff assignments
 */
export interface AvailableStaffForActivity {
  activityId: string;
  activityDate: string;
  activityStartTime: string;
  activityEndTime: string;

  // Available staff (sorted by fairness score)
  availableStaff: {
    userId: string;
    userName: string;
    availabilityScore: number; // 100 = fully available, lower = has some constraints
    fairnessScore: number; // Lower = should be assigned more
    currentPeriodPoints: number; // Points already accumulated
    conflicts: AvailabilityConflict[]; // Only warnings, no blocking conflicts
  }[];

  // Unavailable staff with reasons
  unavailableStaff: {
    userId: string;
    userName: string;
    reason: string;
    conflicts: AvailabilityConflict[];
  }[];
}

// ============================================================
// Create/Update DTOs
// ============================================================

export interface CreateLeaveRequestData {
  type: LeaveType;
  firstDay: string | Date;
  lastDay: string | Date;
  note?: string;
  isPartialDay?: boolean;
  partialDayType?: PartialDayType;
  partialDayStartTime?: string;
  partialDayEndTime?: string;
}

export interface CreateAvailabilityConstraintData {
  type: ConstraintType;
  isRecurring: boolean;
  dayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  specificDate?: string | Date;
  startTime: string;
  endTime: string;
  isAllDay?: boolean;
  reason?: string;
  effectiveFrom?: string | Date;
  effectiveUntil?: string | Date;
}

export interface UpdateAvailabilityConstraintData {
  type?: ConstraintType;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  reason?: string;
  effectiveUntil?: string | Date | null;
  isActive?: boolean;
}
