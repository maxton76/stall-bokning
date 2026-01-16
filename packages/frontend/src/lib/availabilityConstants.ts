/**
 * Availability Constants
 *
 * Centralized constants for the availability/leave management system.
 * This prevents duplication across components and pages.
 */

import type {
  LeaveType,
  LeaveStatus,
  DaySchedule,
} from "@stall-bokning/shared";

/**
 * Human-readable labels for leave request types
 */
export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  vacation: "Vacation",
  sick: "Sick leave",
  parental: "Parental leave",
  other: "Other",
};

/**
 * Badge styling configuration for leave request statuses
 */
export const STATUS_BADGES: Record<
  LeaveStatus,
  {
    variant: "default" | "secondary" | "destructive" | "outline";
    label: string;
  }
> = {
  pending: { variant: "secondary", label: "Pending" },
  approved: { variant: "default", label: "Approved" },
  rejected: { variant: "destructive", label: "Rejected" },
  cancelled: { variant: "outline", label: "Cancelled" },
};

/**
 * Filter options for leave request status in admin views
 */
export const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
] as const;

/**
 * Full day names (Sunday-indexed)
 * Used in forms and dialogs where full names are preferred
 */
export const DAY_NAMES_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/**
 * Abbreviated day names (Sunday-indexed)
 * Used in compact displays like work schedule cards
 */
export const DAY_NAMES_SHORT = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

/**
 * Default work schedule for new users
 * Standard 8-hour workday Monday-Friday, weekends off
 */
export const DEFAULT_SCHEDULE: DaySchedule[] = [
  { dayOfWeek: 0, startTime: "08:00", hours: 0, isWorkDay: false },
  { dayOfWeek: 1, startTime: "08:00", hours: 8, isWorkDay: true },
  { dayOfWeek: 2, startTime: "08:00", hours: 8, isWorkDay: true },
  { dayOfWeek: 3, startTime: "08:00", hours: 8, isWorkDay: true },
  { dayOfWeek: 4, startTime: "08:00", hours: 8, isWorkDay: true },
  { dayOfWeek: 5, startTime: "08:00", hours: 8, isWorkDay: true },
  { dayOfWeek: 6, startTime: "08:00", hours: 0, isWorkDay: false },
];

/**
 * Default monthly accrual rate in hours
 * This should match the backend configuration
 */
export const DEFAULT_MONTHLY_ACCRUAL = 2.5;

/**
 * Maximum hours allowed for leave balance
 */
export const MAX_BALANCE_HOURS = 100;

/**
 * Maximum hours that can carry over to next year
 */
export const MAX_CARRYOVER_HOURS = 40;
