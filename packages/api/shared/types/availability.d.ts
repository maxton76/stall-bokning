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
  userName?: string;
  userEmail?: string;
  organizationId: string;
  type: LeaveType;
  firstDay: Timestamp;
  lastDay: Timestamp;
  note?: string;
  isPartialDay: boolean;
  partialDayType?: PartialDayType;
  partialDayStartTime?: string;
  partialDayEndTime?: string;
  impactHours: number;
  status: LeaveStatus;
  requestedAt: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  reviewerName?: string;
  reviewNote?: string;
  cancelledAt?: Timestamp;
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
  periodDisplay: string;
  durationDays: number;
  partialDayDisplay?: string;
}
/**
 * Day of week schedule entry
 */
export interface DaySchedule {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startTime: string;
  hours: number;
  isWorkDay: boolean;
}
/**
 * Work schedule document structure
 * Admin-assigned schedule for each user
 */
export interface WorkSchedule {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  organizationId: string;
  weeklySchedule: DaySchedule[];
  effectiveFrom: Timestamp;
  effectiveUntil?: Timestamp;
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
  totalWeeklyHours: number;
  isCurrentlyActive: boolean;
}
/**
 * Balance accrual configuration (organization-level)
 */
export interface AccrualConfig {
  monthlyAccrualHours: number;
  maxCarryoverHours: number;
  carryoverExpiryMonths: number;
  maxBalanceHours: number;
}
/**
 * Time balance document structure
 * Tracks accumulated and used time for a user per year
 */
export interface TimeBalance {
  id: string;
  userId: string;
  userName?: string;
  organizationId: string;
  year: number;
  carryoverFromPreviousYear: number;
  buildUpHours: number;
  corrections: number;
  approvedLeave: number;
  tentativeLeave: number;
  approvedOvertime: number;
  customAccrualConfig?: Partial<AccrualConfig>;
  updatedAt: Timestamp;
  lastAccrualDate?: Timestamp;
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
  currentBalance: number;
  endOfYearProjection: number;
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
  amount: number;
  reason: string;
  appliedBy: string;
  appliedByName?: string;
  appliedAt: Timestamp;
}
/**
 * Organization-level availability settings
 */
export interface AvailabilitySettings {
  organizationId: string;
  accrualConfig: AccrualConfig;
  requireApproval: boolean;
  sickLeaveAutoApprove: boolean;
  maxConsecutiveLeaveDays: number;
  minAdvanceNoticeDays: number;
  notifyOnRequest: boolean;
  notifyOnApproval: boolean;
  updatedAt: Timestamp;
  updatedBy: string;
}
/**
 * Default work schedule template
 * Standard 9-5 weekday schedule
 */
export declare const DEFAULT_WEEKLY_SCHEDULE: DaySchedule[];
/**
 * Default accrual configuration
 * 2.5 hours/month = 30 hours/year
 */
export declare const DEFAULT_ACCRUAL_CONFIG: AccrualConfig;
/**
 * Default availability settings
 */
export declare const DEFAULT_AVAILABILITY_SETTINGS: Omit<
  AvailabilitySettings,
  "organizationId" | "updatedAt" | "updatedBy"
>;
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
  userName?: string;
  organizationId: string;
  type: ConstraintType;
  isRecurring: boolean;
  dayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  specificDate?: Timestamp;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  reason?: string;
  effectiveFrom?: Timestamp;
  effectiveUntil?: Timestamp;
  isActive: boolean;
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
  displayText: string;
  typeDisplay: string;
}
/**
 * Leave status for a calendar day
 */
export type CalendarLeaveStatus = "none" | "pending" | "approved" | "partial";
/**
 * Availability calendar day
 * Used for displaying availability in calendar view
 */
export interface AvailabilityCalendarDay {
  date: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  isWorkDay: boolean;
  scheduledHours: number;
  workStartTime?: string;
  workEndTime?: string;
  leaveStatus: CalendarLeaveStatus;
  leaveType?: LeaveType;
  leaveRequestId?: string;
  isPartialLeave?: boolean;
  leaveHours?: number;
  hasConstraints: boolean;
  constraintHours?: number;
  constraints?: {
    id: string;
    type: ConstraintType;
    startTime: string;
    endTime: string;
    reason?: string;
  }[];
  hasAssignments: boolean;
  assignmentCount: number;
  assignedHours?: number;
  assignments?: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
  }[];
  availableHours: number;
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
  days: {
    date: string;
    availableHours: number;
    isAvailable: boolean;
    leaveStatus: CalendarLeaveStatus;
    hasConstraints: boolean;
    assignmentCount: number;
  }[];
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
    start: string;
    end: string;
  };
  staffAvailability: StaffAvailabilityRow[];
  teamSummary: {
    date: string;
    totalStaff: number;
    availableStaff: number;
    totalAvailableHours: number;
    coverageScore: number;
    hasShortage: boolean;
  }[];
  averageDailyAvailability: number;
  minimumStaffingMet: boolean;
  shortageCount: number;
}
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
  severity: "blocking" | "warning";
  description: string;
  startTime?: string;
  endTime?: string;
  relatedId?: string;
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
  isAvailable: boolean;
  canOverride: boolean;
  conflicts: AvailabilityConflict[];
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
  availableStaff: {
    userId: string;
    userName: string;
    availabilityScore: number;
    fairnessScore: number;
    currentPeriodPoints: number;
    conflicts: AvailabilityConflict[];
  }[];
  unavailableStaff: {
    userId: string;
    userName: string;
    reason: string;
    conflicts: AvailabilityConflict[];
  }[];
}
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
//# sourceMappingURL=availability.d.ts.map
