import { formatDateString } from "@stall-bokning/shared";

/**
 * Fixed Swedish holidays (month is 1-indexed)
 */
const FIXED_HOLIDAYS = [
  { month: 1, day: 1 }, // New Year's Day
  { month: 1, day: 6 }, // Epiphany
  { month: 5, day: 1 }, // May Day
  { month: 6, day: 6 }, // National Day
  { month: 12, day: 24 }, // Christmas Eve
  { month: 12, day: 25 }, // Christmas Day
  { month: 12, day: 26 }, // Boxing Day
  { month: 12, day: 31 }, // New Year's Eve
];

/**
 * Easter dates by year (simplified)
 * In production, use Computus algorithm or a library
 */
const EASTER_DATES_MAP: { [year: number]: string[] } = {
  2025: ["2025-04-18", "2025-04-19", "2025-04-20", "2025-04-21"], // Good Friday to Easter Monday
  2026: ["2026-04-03", "2026-04-04", "2026-04-05", "2026-04-06"],
  2027: ["2027-03-26", "2027-03-27", "2027-03-28", "2027-03-29"],
};

/**
 * Get Easter-related dates for a given year
 */
function getEasterDates(year: number): string[] {
  return EASTER_DATES_MAP[year] || [];
}

/**
 * Check if date is a fixed Swedish holiday
 */
function isFixedHoliday(month: number, day: number): boolean {
  return FIXED_HOLIDAYS.some((h) => h.month === month && h.day === day);
}

/**
 * Check if date is Midsummer Eve (Friday between June 19-25)
 */
function isMidsummerEve(date: Date): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = date.getDay();

  return month === 6 && day >= 19 && day <= 25 && dayOfWeek === 5;
}

/**
 * Check if date is All Saints' Day (Saturday between Oct 31 - Nov 6)
 */
function isAllSaintsDay(date: Date): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = date.getDay();

  return (
    ((month === 10 && day === 31) || (month === 11 && day <= 6)) &&
    dayOfWeek === 6
  );
}

/**
 * Check if date is an Easter-related holiday
 */
function isEasterHoliday(date: Date): boolean {
  const dateStr = formatDateString(date);
  const easterDates = getEasterDates(date.getFullYear());
  return easterDates.includes(dateStr);
}

/**
 * Check if a date is a Swedish holiday
 */
export function isSwedishHoliday(date: Date): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return (
    isFixedHoliday(month, day) ||
    isMidsummerEve(date) ||
    isAllSaintsDay(date) ||
    isEasterHoliday(date)
  );
}

/**
 * Apply holiday multiplier to points
 */
export function applyHolidayMultiplier(
  basePoints: number,
  isHoliday: boolean,
  multiplier: number = 1.5,
): number {
  return isHoliday ? Math.round(basePoints * multiplier) : basePoints;
}
