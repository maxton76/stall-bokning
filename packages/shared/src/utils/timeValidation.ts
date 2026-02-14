/**
 * Time Validation Utilities
 * Validates and parses HH:mm time strings safely
 */

export interface ParsedTime {
  hour: number;
  minute: number;
}

/**
 * Parse HH:mm format time string with validation
 * @param timeStr - Time string in HH:mm format
 * @returns Parsed hour and minute, or null if invalid
 */
export function parseTime(timeStr: string): ParsedTime | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeStr);
  if (!match) return null;

  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);

  if (hour < 0 || hour > 23) return null;
  if (minute < 0 || minute > 59) return null;

  return { hour, minute };
}

/**
 * Validate time range (from < to)
 * @param from - Start time in HH:mm format
 * @param to - End time in HH:mm format
 * @returns true if range is valid (from < to)
 */
export function validateTimeRange(from: string, to: string): boolean {
  const fromParsed = parseTime(from);
  const toParsed = parseTime(to);

  if (!fromParsed || !toParsed) return false;

  const fromMinutes = fromParsed.hour * 60 + fromParsed.minute;
  const toMinutes = toParsed.hour * 60 + toParsed.minute;

  return toMinutes > fromMinutes;
}

/**
 * Convert minutes since midnight to HH:mm string
 * @param minutes - Minutes since midnight (0-1439)
 * @returns Time string in HH:mm format
 */
export function minutesToTime(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
