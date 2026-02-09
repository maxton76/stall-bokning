/**
 * Routine Auto-Assignment Service
 *
 * Implements fairness-based algorithm for automatically assigning routine instances to members.
 * Adapted from autoAssignmentService.ts for routine schedules.
 *
 * Key differences from shift auto-assignment:
 * - Assigns all dates at once (pre-generation)
 * - Returns Record<YYYY-MM-DD, userId> instead of AssignmentResult[]
 * - Simpler interface (no holiday multipliers, no status tracking)
 */

import {
  getDayOfWeek,
  isTimeInRange,
  isSameWeek,
  isSameMonth,
} from "@equiduty/shared";
import type { MemberForAssignment } from "./autoAssignmentService.js";

// ============= Types =============

export interface AssignmentConfig {
  preferenceBonus?: number; // Points bonus for preferred times (default: -2)
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
 * Check if a member is available for a specific date/time
 */
function isMemberAvailable(
  member: MemberForAssignment,
  date: Date,
  scheduledStartTime: string,
): boolean {
  if (!member.availability?.neverAvailable) return true;

  const dayOfWeek = getDayOfWeek(date);

  for (const restriction of member.availability.neverAvailable) {
    if (restriction.dayOfWeek === dayOfWeek) {
      // Check if scheduled time overlaps with restricted time slots
      for (const slot of restriction.timeSlots) {
        if (isTimeInRange(scheduledStartTime, slot.start, slot.end)) {
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
 * Calculate preference bonus for a date/time
 * Returns negative points (bonus) if time is during preferred times
 */
function calculatePreferenceBonus(
  member: MemberForAssignment,
  date: Date,
  scheduledStartTime: string,
  bonusAmount: number,
): number {
  if (!member.availability?.preferredTimes) return 0;

  const dayOfWeek = getDayOfWeek(date);

  for (const preference of member.availability.preferredTimes) {
    if (preference.dayOfWeek === dayOfWeek) {
      for (const slot of preference.timeSlots) {
        if (isTimeInRange(scheduledStartTime, slot.start, slot.end)) {
          return bonusAmount; // Return negative bonus (lowers score = higher priority)
        }
      }
    }
  }

  return 0;
}

/**
 * Calculate the total score for a member for a routine
 * Lower score = higher priority for assignment
 */
function calculateMemberScore(
  member: MemberForAssignment,
  tracking: MemberTrackingState,
  date: Date,
  scheduledStartTime: string,
  config: AssignmentConfig,
): number {
  const preferenceBonus = config.preferenceBonus ?? -2;

  // Base score: historical points + session points
  let score = member.historicalPoints + tracking.sessionPoints;

  // Add preference bonus (negative = bonus)
  score += calculatePreferenceBonus(
    member,
    date,
    scheduledStartTime,
    preferenceBonus,
  );

  return score;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ============= Main Assignment Algorithm =============

/**
 * Auto-assign routine instances to members using fairness algorithm
 *
 * Algorithm:
 * 1. Initialize tracking state for each member (session points, weekly/monthly counters)
 * 2. For each date in chronological order:
 *    a. Filter out members who are unavailable (neverAvailable)
 *    b. Filter out members who have reached their limits
 *    c. Score remaining members: historicalPoints + sessionPoints + preferenceBonus
 *    d. Select member with lowest score (most fair to assign)
 *    e. Update tracking state for assigned member
 * 3. Return Record<YYYY-MM-DD, userId>
 *
 * @param dates - Array of dates to assign (should be sorted chronologically)
 * @param members - Array of eligible members with historical points and constraints
 * @param scheduledStartTime - Start time for the routine (HH:MM format)
 * @param pointsValue - Points value for each routine instance
 * @param config - Assignment configuration (preferenceBonus, etc.)
 * @returns Record mapping date keys (YYYY-MM-DD) to user IDs
 */
export function autoAssignRoutineInstances(
  dates: Date[],
  members: MemberForAssignment[],
  scheduledStartTime: string,
  pointsValue: number,
  config: AssignmentConfig = {},
): Record<string, string> {
  const assignments: Record<string, string> = {};

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

  // Track current week/month for limit counting
  let currentWeekRef: Date | null = null;
  let currentMonthRef: Date | null = null;

  // Process dates in chronological order
  for (const date of dates) {
    // Reset week/month counters when we move to a new week/month
    if (currentWeekRef && !isSameWeek(currentWeekRef, date)) {
      // New week - reset weekly counters
      for (const tracking of memberTracking.values()) {
        tracking.shiftsThisWeek = 0;
      }
    }
    if (currentMonthRef && !isSameMonth(currentMonthRef, date)) {
      // New month - reset monthly counters
      for (const tracking of memberTracking.values()) {
        tracking.shiftsThisMonth = 0;
      }
    }
    currentWeekRef = date;
    currentMonthRef = date;

    // Filter eligible members
    const eligibleMembers = members.filter((member) => {
      const tracking = memberTracking.get(member.userId)!;

      // Check availability
      if (!isMemberAvailable(member, date, scheduledStartTime)) {
        return false;
      }

      // Check limits
      if (hasReachedLimits(member, tracking)) {
        return false;
      }

      return true;
    });

    // If no eligible members, skip this date (will remain unassigned)
    if (eligibleMembers.length === 0) {
      continue;
    }

    // Score each eligible member and find the best candidate
    let bestCandidate: MemberForAssignment | null = null;
    let bestScore = Infinity;

    for (const member of eligibleMembers) {
      const tracking = memberTracking.get(member.userId)!;
      const score = calculateMemberScore(
        member,
        tracking,
        date,
        scheduledStartTime,
        config,
      );

      if (score < bestScore) {
        bestScore = score;
        bestCandidate = member;
      }
    }

    if (!bestCandidate) continue;

    // Update tracking state for assigned member
    const tracking = memberTracking.get(bestCandidate.userId)!;
    tracking.sessionPoints += pointsValue;
    tracking.shiftsThisWeek += 1;
    tracking.shiftsThisMonth += 1;
    tracking.lastAssignedDate = date;

    // Record assignment
    const dateKey = formatDateKey(date);
    assignments[dateKey] = bestCandidate.userId;
  }

  return assignments;
}
