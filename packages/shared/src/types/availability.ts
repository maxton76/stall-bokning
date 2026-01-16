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
  periodDisplay: string; // e.g., "Jan 5 - Jan 7, 2026"
  durationDays: number;
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
