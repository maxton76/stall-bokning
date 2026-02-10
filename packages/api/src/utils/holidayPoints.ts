/**
 * Holiday Points Calculator
 *
 * Applies holiday multiplier at instance creation time so users
 * immediately see the actual points value for holiday shifts.
 */

import { holidayService } from "@equiduty/shared";
import { db } from "./firebase.js";

export interface HolidayPointsResult {
  pointsValue: number;
  isHolidayShift: boolean;
  isHalfDayShift: boolean;
}

export interface HolidaySettings {
  enableHolidayMultiplier?: boolean;
  holidayMultiplier?: number;
}

/**
 * Fetch holiday settings for an organization. Call once per request/batch
 * and pass the result to computeHolidayPoints to avoid repeated reads.
 */
export async function fetchHolidaySettings(
  organizationId: string,
): Promise<HolidaySettings | null> {
  const orgDoc = await db.collection("organizations").doc(organizationId).get();
  return (orgDoc.data()?.settings?.holidayCalendar as HolidaySettings) ?? null;
}

/**
 * Compute points with holiday multiplier applied. Pure function — no Firestore reads.
 * Caller must pre-fetch settings via fetchHolidaySettings().
 */
export function computeHolidayPoints(
  date: Date,
  basePoints: number,
  holidaySettings: HolidaySettings | null,
): HolidayPointsResult {
  const holiday = holidayService.getHoliday(date);
  if (!holiday) {
    return {
      pointsValue: basePoints,
      isHolidayShift: false,
      isHalfDayShift: false,
    };
  }

  const isHalfDayShift = holiday.isHalfDay === true;

  let pointsValue = basePoints;
  if (holidaySettings?.enableHolidayMultiplier) {
    const multiplier = holidaySettings.holidayMultiplier ?? 1.5;
    const effective = isHalfDayShift ? 1 + (multiplier - 1) / 2 : multiplier;
    pointsValue = Math.round(basePoints * effective);
  }

  return { pointsValue, isHolidayShift: true, isHalfDayShift };
}
