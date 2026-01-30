import { Timestamp } from "firebase/firestore";
import { getWeekNumber } from "@equiduty/shared";
import { toDate } from "./timestampUtils";

/**
 * Context for tracking shifts
 */
export interface ShiftTrackingContext {
  currentWeek: number;
  currentMonth: number;
}

/**
 * Member tracking state
 */
export interface MemberTrackingState {
  shiftsThisWeek: number;
  shiftsThisMonth: number;
  currentPoints: number;
  assignedShifts: number;
}

/**
 * Create tracking context for current time period
 */
export function createTrackingContext(): ShiftTrackingContext {
  const now = new Date();
  return {
    currentWeek: getWeekNumber(now),
    currentMonth: now.getMonth(),
  };
}

/**
 * Update member tracking state for a shift
 */
export function updateMemberTracking(
  member: MemberTrackingState,
  shiftDate: Timestamp,
  shiftPoints: number,
  context: ShiftTrackingContext,
): void {
  member.currentPoints += shiftPoints;
  member.assignedShifts += 1;

  const date = toDate(shiftDate);
  if (!date) return; // Skip if date can't be parsed
  const shiftWeek = getWeekNumber(date);
  const shiftMonth = date.getMonth();

  if (shiftWeek === context.currentWeek) {
    member.shiftsThisWeek += 1;
  }
  if (shiftMonth === context.currentMonth) {
    member.shiftsThisMonth += 1;
  }
}
