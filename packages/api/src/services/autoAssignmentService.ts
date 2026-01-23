/**
 * Auto-Assignment Service
 *
 * Implements a fairness-based algorithm for automatically assigning shifts to members.
 * Uses historical points, availability constraints, and limits to ensure fair distribution.
 */

import {
  parseShiftStartTime,
  isSameWeek,
  isSameMonth,
  parseDate,
  getDayOfWeek,
  isTimeInRange,
} from "@stall-bokning/shared";
import {
  isSwedishHoliday,
  applyHolidayMultiplier,
} from "../utils/holidayHelpers.js";

// ============= Types =============

export interface MemberAvailability {
  neverAvailable?: {
    dayOfWeek: number; // 0=Sunday, 1=Monday, etc.
    timeSlots: { start: string; end: string }[]; // "HH:MM" format
  }[];
  preferredTimes?: {
    dayOfWeek: number;
    timeSlots: { start: string; end: string }[];
  }[];
}

export interface MemberLimits {
  maxShiftsPerWeek?: number;
  minShiftsPerWeek?: number;
  maxShiftsPerMonth?: number;
  minShiftsPerMonth?: number;
}

export interface MemberForAssignment {
  userId: string;
  displayName: string;
  email: string;
  historicalPoints: number;
  availability?: MemberAvailability;
  limits?: MemberLimits;
}

export interface ShiftForAssignment {
  id: string;
  date: Date | string | { toDate: () => Date };
  time: string; // "HH:MM-HH:MM" format
  points: number;
  status: string;
  assignedTo: string | null;
}

export interface AssignmentConfig {
  holidayMultiplier?: number; // Default: 1.5
  preferenceBonus?: number; // Points bonus for preferred times (default: -2)
  memoryHorizonDays?: number; // Default: 90
}

export interface AssignmentResult {
  shiftId: string;
  assignedTo: string;
  assignedToName: string;
  assignedToEmail: string;
  pointsAwarded: number;
  isHoliday: boolean;
}

// Internal tracking state per member during assignment session
interface MemberTrackingState {
  sessionPoints: number;
  shiftsThisWeek: number;
  shiftsThisMonth: number;
  lastAssignedDate: Date | null;
}

// ============= Helper Functions =============

/**
 * Check if a member is available for a specific shift
 */
function isMemberAvailable(
  member: MemberForAssignment,
  shift: ShiftForAssignment,
): boolean {
  if (!member.availability?.neverAvailable) return true;

  const shiftDate = parseDate(shift.date);
  if (!shiftDate) return true; // If date can't be parsed, assume available

  const shiftDay = getDayOfWeek(shiftDate);
  const shiftTime = parseShiftStartTime(shift.time);

  for (const restriction of member.availability.neverAvailable) {
    if (restriction.dayOfWeek === shiftDay) {
      // Check if shift time overlaps with restricted time slots
      for (const slot of restriction.timeSlots) {
        if (isTimeInRange(shiftTime, slot.start, slot.end)) {
          return false; // Member is not available
        }
      }
    }
  }

  return true;
}

/**
 * Check if a member has reached their limits
 */
function hasReachedLimits(
  member: MemberForAssignment,
  tracking: MemberTrackingState,
): boolean {
  if (!member.limits) return false;

  if (
    member.limits.maxShiftsPerWeek !== undefined &&
    tracking.shiftsThisWeek >= member.limits.maxShiftsPerWeek
  ) {
    return true;
  }

  if (
    member.limits.maxShiftsPerMonth !== undefined &&
    tracking.shiftsThisMonth >= member.limits.maxShiftsPerMonth
  ) {
    return true;
  }

  return false;
}

/**
 * Calculate preference bonus for a shift
 * Returns negative points (bonus) if shift is during preferred times
 */
function calculatePreferenceBonus(
  member: MemberForAssignment,
  shift: ShiftForAssignment,
  bonusAmount: number,
): number {
  if (!member.availability?.preferredTimes) return 0;

  const shiftDate = parseDate(shift.date);
  if (!shiftDate) return 0;

  const shiftDay = getDayOfWeek(shiftDate);
  const shiftTime = parseShiftStartTime(shift.time);

  for (const preference of member.availability.preferredTimes) {
    if (preference.dayOfWeek === shiftDay) {
      for (const slot of preference.timeSlots) {
        if (isTimeInRange(shiftTime, slot.start, slot.end)) {
          return bonusAmount; // Return negative bonus (lowers score = higher priority)
        }
      }
    }
  }

  return 0;
}

/**
 * Calculate the total score for a member for a shift
 * Lower score = higher priority for assignment
 */
function calculateMemberScore(
  member: MemberForAssignment,
  tracking: MemberTrackingState,
  shift: ShiftForAssignment,
  config: AssignmentConfig,
): number {
  const preferenceBonus = config.preferenceBonus ?? -2;

  // Base score: historical points + session points
  let score = member.historicalPoints + tracking.sessionPoints;

  // Add preference bonus (negative = bonus)
  score += calculatePreferenceBonus(member, shift, preferenceBonus);

  return score;
}

/**
 * Sort shifts chronologically for fair assignment order
 */
function sortShiftsChronologically(
  shifts: ShiftForAssignment[],
): ShiftForAssignment[] {
  return [...shifts].sort((a, b) => {
    const dateA = parseDate(a.date);
    const dateB = parseDate(b.date);
    if (!dateA || !dateB) return 0;
    return dateA.getTime() - dateB.getTime();
  });
}

// ============= Main Assignment Algorithm =============

/**
 * Auto-assign shifts to members using fairness algorithm
 *
 * Algorithm:
 * 1. Sort shifts chronologically
 * 2. For each unassigned shift:
 *    a. Filter out members who are unavailable (neverAvailable)
 *    b. Filter out members who have reached their limits
 *    c. Score remaining members: historicalPoints + sessionPoints + preferenceBonus
 *    d. Select member with lowest score (most fair to assign)
 *    e. Apply holiday multiplier if applicable
 *    f. Update tracking state
 */
export function autoAssignShifts(
  shifts: ShiftForAssignment[],
  members: MemberForAssignment[],
  config: AssignmentConfig = {},
): AssignmentResult[] {
  const results: AssignmentResult[] = [];
  const holidayMultiplier = config.holidayMultiplier ?? 1.5;

  // Initialize tracking state for each member
  const memberTracking = new Map<string, MemberTrackingState>();
  for (const member of members) {
    memberTracking.set(member.userId, {
      sessionPoints: 0,
      shiftsThisWeek: 0,
      shiftsThisMonth: 0,
      lastAssignedDate: null,
    });
  }

  // Sort shifts chronologically for fair assignment
  const sortedShifts = sortShiftsChronologically(shifts);

  // Track current week/month for limit counting
  let currentWeekRef: Date | null = null;
  let currentMonthRef: Date | null = null;

  for (const shift of sortedShifts) {
    // Skip already assigned shifts
    if (shift.status === "assigned" && shift.assignedTo) {
      continue;
    }

    const shiftDate = parseDate(shift.date);
    if (!shiftDate) continue;

    // Reset week/month counters when we move to a new week/month
    if (currentWeekRef && !isSameWeek(currentWeekRef, shiftDate)) {
      // New week - reset weekly counters
      for (const tracking of memberTracking.values()) {
        tracking.shiftsThisWeek = 0;
      }
    }
    if (currentMonthRef && !isSameMonth(currentMonthRef, shiftDate)) {
      // New month - reset monthly counters
      for (const tracking of memberTracking.values()) {
        tracking.shiftsThisMonth = 0;
      }
    }
    currentWeekRef = shiftDate;
    currentMonthRef = shiftDate;

    // Filter eligible members
    const eligibleMembers = members.filter((member) => {
      const tracking = memberTracking.get(member.userId)!;

      // Check availability
      if (!isMemberAvailable(member, shift)) {
        return false;
      }

      // Check limits
      if (hasReachedLimits(member, tracking)) {
        return false;
      }

      return true;
    });

    // If no eligible members, skip this shift
    if (eligibleMembers.length === 0) {
      continue;
    }

    // Score each eligible member and find the best candidate
    let bestCandidate: MemberForAssignment | null = null;
    let bestScore = Infinity;

    for (const member of eligibleMembers) {
      const tracking = memberTracking.get(member.userId)!;
      const score = calculateMemberScore(member, tracking, shift, config);

      if (score < bestScore) {
        bestScore = score;
        bestCandidate = member;
      }
    }

    if (!bestCandidate) continue;

    // Calculate points with holiday multiplier
    const isHoliday = isSwedishHoliday(shiftDate);
    const pointsAwarded = applyHolidayMultiplier(
      shift.points,
      isHoliday,
      holidayMultiplier,
    );

    // Update tracking state for assigned member
    const tracking = memberTracking.get(bestCandidate.userId)!;
    tracking.sessionPoints += pointsAwarded;
    tracking.shiftsThisWeek += 1;
    tracking.shiftsThisMonth += 1;
    tracking.lastAssignedDate = shiftDate;

    // Record result
    results.push({
      shiftId: shift.id,
      assignedTo: bestCandidate.userId,
      assignedToName: bestCandidate.displayName,
      assignedToEmail: bestCandidate.email,
      pointsAwarded,
      isHoliday,
    });
  }

  return results;
}

/**
 * Validate assignment constraints for a manual assignment
 * Returns an error message if assignment is not allowed, null otherwise
 */
export function validateManualAssignment(
  member: MemberForAssignment,
  shift: ShiftForAssignment,
  currentTracking?: {
    shiftsThisWeek: number;
    shiftsThisMonth: number;
  },
): string | null {
  // Check availability
  if (!isMemberAvailable(member, shift)) {
    return `${member.displayName} is not available during this time slot`;
  }

  // Check limits if tracking provided
  if (currentTracking && member.limits) {
    if (
      member.limits.maxShiftsPerWeek !== undefined &&
      currentTracking.shiftsThisWeek >= member.limits.maxShiftsPerWeek
    ) {
      return `${member.displayName} has reached their maximum shifts per week (${member.limits.maxShiftsPerWeek})`;
    }

    if (
      member.limits.maxShiftsPerMonth !== undefined &&
      currentTracking.shiftsThisMonth >= member.limits.maxShiftsPerMonth
    ) {
      return `${member.displayName} has reached their maximum shifts per month (${member.limits.maxShiftsPerMonth})`;
    }
  }

  return null; // No validation errors
}

/**
 * Calculate summary statistics for assignment results
 */
export function calculateAssignmentSummary(results: AssignmentResult[]): {
  totalAssigned: number;
  totalPoints: number;
  holidayShifts: number;
  memberDistribution: Map<string, { shifts: number; points: number }>;
} {
  const memberDistribution = new Map<
    string,
    { shifts: number; points: number }
  >();

  let totalPoints = 0;
  let holidayShifts = 0;

  for (const result of results) {
    totalPoints += result.pointsAwarded;
    if (result.isHoliday) holidayShifts++;

    const current = memberDistribution.get(result.assignedTo) || {
      shifts: 0,
      points: 0,
    };
    current.shifts++;
    current.points += result.pointsAwarded;
    memberDistribution.set(result.assignedTo, current);
  }

  return {
    totalAssigned: results.length,
    totalPoints,
    holidayShifts,
    memberDistribution,
  };
}
