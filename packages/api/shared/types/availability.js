/**
 * Default work schedule template
 * Standard 9-5 weekday schedule
 */
export const DEFAULT_WEEKLY_SCHEDULE = [
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
export const DEFAULT_ACCRUAL_CONFIG = {
  monthlyAccrualHours: 2.5,
  maxCarryoverHours: 40,
  carryoverExpiryMonths: 3, // Carryover expires after 3 months
  maxBalanceHours: 200,
};
/**
 * Default availability settings
 */
export const DEFAULT_AVAILABILITY_SETTINGS = {
  accrualConfig: DEFAULT_ACCRUAL_CONFIG,
  requireApproval: true,
  sickLeaveAutoApprove: true,
  maxConsecutiveLeaveDays: 30,
  minAdvanceNoticeDays: 0,
  notifyOnRequest: true,
  notifyOnApproval: true,
};
