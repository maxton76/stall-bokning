/**
 * Date Precision Utilities
 * Handles date rounding to prevent millisecond comparison issues
 */

/**
 * Round date to nearest minute (clear seconds and milliseconds)
 * @param date - Date to round
 * @returns Date rounded to minute precision
 */
export function roundToMinute(date: Date): Date {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0); // Clear seconds and milliseconds
  return rounded;
}

/**
 * Round date to nearest time slot
 * @param date - Date to round
 * @param slotMinutes - Slot duration in minutes (e.g. 15 for 15-minute slots)
 * @returns Date rounded down to nearest slot boundary
 */
export function roundToSlot(date: Date, slotMinutes: number): Date {
  const minutes = date.getMinutes();
  const roundedMinutes = Math.floor(minutes / slotMinutes) * slotMinutes;

  const rounded = new Date(date);
  rounded.setMinutes(roundedMinutes, 0, 0); // Clear seconds and milliseconds
  return rounded;
}

/**
 * Round date up to next time slot
 * @param date - Date to round
 * @param slotMinutes - Slot duration in minutes
 * @returns Date rounded up to next slot boundary
 */
export function roundUpToSlot(date: Date, slotMinutes: number): Date {
  const minutes = date.getMinutes();
  const roundedMinutes = Math.ceil(minutes / slotMinutes) * slotMinutes;

  const rounded = new Date(date);
  if (roundedMinutes >= 60) {
    rounded.setHours(rounded.getHours() + 1);
    rounded.setMinutes(roundedMinutes - 60, 0, 0);
  } else {
    rounded.setMinutes(roundedMinutes, 0, 0);
  }
  return rounded;
}

/**
 * Check if two dates are equal at minute precision
 * @param date1 - First date
 * @param date2 - Second date
 * @returns true if dates are equal when rounded to minutes
 */
export function areEqualAtMinutePrecision(date1: Date, date2: Date): boolean {
  return roundToMinute(date1).getTime() === roundToMinute(date2).getTime();
}
