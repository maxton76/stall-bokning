/**
 * Routine Auto-Assignment Service
 *
 * Assigns routine instances to members using fairness algorithms.
 *
 * Two paths:
 * 1. Algorithm-based (new): Uses computeTurnOrder() from selectionAlgorithmService
 *    to get a priority order, then distributes dates round-robin.
 * 2. Legacy scoring (fallback): historicalPoints + sessionPoints + preferenceBonus.
 *    Used when no algorithm is specified (backward compatibility).
 */

import {
  getDayOfWeek,
  isTimeInRange,
  isSameWeek,
  isSameMonth,
} from "@equiduty/shared";
import type { SelectionAlgorithm } from "@equiduty/shared";
import type { MemberForAssignment } from "./autoAssignmentService.js";
import { computeTurnOrder } from "./selectionAlgorithmService.js";

// ============= Types =============

export interface AssignmentConfig {
  preferenceBonus?: number; // Points bonus for preferred times (default: -2)
  algorithm?: SelectionAlgorithm; // Fairness algorithm to use
  stableId?: string; // Required for algorithm-based assignment
  organizationId?: string; // Required for algorithm-based assignment
  startDate?: string; // YYYY-MM-DD, required for quota_based algorithm
  endDate?: string; // YYYY-MM-DD, required for quota_based algorithm
}

// Internal tracking state per member during legacy assignment session
interface MemberTrackingState {
  sessionPoints: number;
  shiftsThisWeek: number;
  shiftsThisMonth: number;
  lastAssignedDate: Date | null;
}

// ============= Algorithm-Based Assignment =============

/**
 * Assign dates to members using a fairness algorithm from the Rutinval system.
 *
 * Flow:
 * 1. Call computeTurnOrder() to get members in priority order
 * 2. Distribute dates round-robin among ordered members
 *
 * @returns Record mapping date keys (YYYY-MM-DD) to user IDs
 */
async function directAssignWithAlgorithm(
  dates: Date[],
  members: MemberForAssignment[],
  config: Required<
    Pick<AssignmentConfig, "algorithm" | "stableId" | "organizationId">
  > &
    AssignmentConfig,
): Promise<Record<string, string>> {
  const assignments: Record<string, string> = {};

  if (members.length === 0 || dates.length === 0) {
    return assignments;
  }

  // Get priority order from the selection algorithm
  const turnOrder = await computeTurnOrder({
    stableId: config.stableId,
    organizationId: config.organizationId,
    algorithm: config.algorithm,
    memberIds: members.map((m) => m.userId),
    selectionStartDate: config.startDate || formatDateKey(dates[0]),
    selectionEndDate: config.endDate || formatDateKey(dates[dates.length - 1]),
  });

  const orderedUserIds = turnOrder.turns
    .map((t) => t.userId)
    .filter((id): id is string => Boolean(id));

  if (orderedUserIds.length === 0) {
    return assignments;
  }

  // Distribute dates round-robin among ordered members
  for (let i = 0; i < dates.length; i++) {
    const memberIndex = i % orderedUserIds.length;
    const dateKey = formatDateKey(dates[i]);
    assignments[dateKey] = orderedUserIds[memberIndex];
  }

  return assignments;
}

// ============= Legacy Scoring Helpers =============

function isMemberAvailable(
  member: MemberForAssignment,
  date: Date,
  scheduledStartTime: string,
): boolean {
  if (!member.availability?.neverAvailable) return true;

  const dayOfWeek = getDayOfWeek(date);

  for (const restriction of member.availability.neverAvailable) {
    if (restriction.dayOfWeek === dayOfWeek) {
      for (const slot of restriction.timeSlots) {
        if (isTimeInRange(scheduledStartTime, slot.start, slot.end)) {
          return false;
        }
      }
    }
  }

  return true;
}

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
          return bonusAmount;
        }
      }
    }
  }

  return 0;
}

function calculateMemberScore(
  member: MemberForAssignment,
  tracking: MemberTrackingState,
  date: Date,
  scheduledStartTime: string,
  config: AssignmentConfig,
): number {
  const preferenceBonus = config.preferenceBonus ?? -2;
  let score = member.historicalPoints + tracking.sessionPoints;
  score += calculatePreferenceBonus(
    member,
    date,
    scheduledStartTime,
    preferenceBonus,
  );
  return score;
}

// ============= Legacy Assignment Algorithm =============

/**
 * Legacy scoring-based auto-assignment.
 * Used when no algorithm is specified (backward compatibility).
 */
function legacyAutoAssign(
  dates: Date[],
  members: MemberForAssignment[],
  scheduledStartTime: string,
  pointsValue: number,
  config: AssignmentConfig,
): Record<string, string> {
  const assignments: Record<string, string> = {};

  const memberTracking = new Map<string, MemberTrackingState>();
  for (const member of members) {
    memberTracking.set(member.userId, {
      sessionPoints: 0,
      shiftsThisWeek: 0,
      shiftsThisMonth: 0,
      lastAssignedDate: null,
    });
  }

  let currentWeekRef: Date | null = null;
  let currentMonthRef: Date | null = null;

  for (const date of dates) {
    if (currentWeekRef && !isSameWeek(currentWeekRef, date)) {
      for (const tracking of memberTracking.values()) {
        tracking.shiftsThisWeek = 0;
      }
    }
    if (currentMonthRef && !isSameMonth(currentMonthRef, date)) {
      for (const tracking of memberTracking.values()) {
        tracking.shiftsThisMonth = 0;
      }
    }
    currentWeekRef = date;
    currentMonthRef = date;

    const eligibleMembers = members.filter((member) => {
      const tracking = memberTracking.get(member.userId)!;
      if (!isMemberAvailable(member, date, scheduledStartTime)) return false;
      if (hasReachedLimits(member, tracking)) return false;
      return true;
    });

    if (eligibleMembers.length === 0) continue;

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

    const tracking = memberTracking.get(bestCandidate.userId)!;
    tracking.sessionPoints += pointsValue;
    tracking.shiftsThisWeek += 1;
    tracking.shiftsThisMonth += 1;
    tracking.lastAssignedDate = date;

    const dateKey = formatDateKey(date);
    assignments[dateKey] = bestCandidate.userId;
  }

  return assignments;
}

// ============= Common Helpers =============

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ============= Main Entry Point =============

/**
 * Auto-assign routine instances to members.
 *
 * If an algorithm is specified in config (and stableId/organizationId are provided),
 * uses the Rutinval fairness algorithm for ordering then distributes round-robin.
 * Otherwise falls back to the legacy scoring algorithm.
 *
 * @param dates - Array of dates to assign (sorted chronologically)
 * @param members - Array of eligible members
 * @param scheduledStartTime - Start time for the routine (HH:MM format)
 * @param pointsValue - Points value for each routine instance
 * @param config - Assignment configuration
 * @returns Record mapping date keys (YYYY-MM-DD) to user IDs
 */
export async function autoAssignRoutineInstances(
  dates: Date[],
  members: MemberForAssignment[],
  scheduledStartTime: string,
  pointsValue: number,
  config: AssignmentConfig = {},
): Promise<Record<string, string>> {
  // Use algorithm-based assignment if algorithm + context are provided
  if (config.algorithm && config.stableId && config.organizationId) {
    return directAssignWithAlgorithm(dates, members, {
      ...config,
      algorithm: config.algorithm,
      stableId: config.stableId,
      organizationId: config.organizationId,
    });
  }

  // Legacy fallback: scoring-based assignment
  return legacyAutoAssign(
    dates,
    members,
    scheduledStartTime,
    pointsValue,
    config,
  );
}
