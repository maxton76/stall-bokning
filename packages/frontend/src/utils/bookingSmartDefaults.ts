/**
 * Smart Defaults for Facility Booking
 * Provides intelligent pre-filling based on user history and preferences
 */

const STORAGE_KEYS = {
  LAST_FACILITY: "equiduty_last_facility_id",
  LAST_DURATION: "equiduty_last_booking_duration",
  BOOKING_HISTORY: "equiduty_booking_history",
} as const;

interface BookingHistoryItem {
  facilityId: string;
  duration: number; // minutes
  timestamp: number;
}

interface SmartDefaults {
  facilityId?: string;
  startTime: string;
  endTime: string;
  duration: number; // minutes
}

/**
 * Get the last used facility ID
 */
export function getLastUsedFacilityId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.LAST_FACILITY);
  } catch {
    return null;
  }
}

/**
 * Save the last used facility ID
 */
export function saveLastUsedFacilityId(facilityId: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_FACILITY, facilityId);
  } catch (error) {
    console.warn("Failed to save last facility ID:", error);
  }
}

/**
 * Get the typical booking duration for a user
 */
export function getTypicalDuration(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LAST_DURATION);
    if (stored) {
      const duration = parseInt(stored, 10);
      if (!isNaN(duration) && duration > 0) {
        return duration;
      }
    }
  } catch {
    // Fall through to default
  }
  return 60; // Default: 1 hour
}

/**
 * Save typical booking duration
 */
export function saveTypicalDuration(minutes: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_DURATION, minutes.toString());
  } catch (error) {
    console.warn("Failed to save typical duration:", error);
  }
}

/**
 * Add a booking to history
 */
export function addToBookingHistory(
  facilityId: string,
  duration: number,
): void {
  try {
    const history = getBookingHistory();
    history.push({
      facilityId,
      duration,
      timestamp: Date.now(),
    });

    // Keep only last 20 bookings
    const recentHistory = history.slice(-20);
    localStorage.setItem(
      STORAGE_KEYS.BOOKING_HISTORY,
      JSON.stringify(recentHistory),
    );

    // Update last used facility
    saveLastUsedFacilityId(facilityId);

    // Calculate and save typical duration
    const durations = recentHistory.map((item) => item.duration);
    const avgDuration = Math.round(
      durations.reduce((sum, d) => sum + d, 0) / durations.length,
    );
    saveTypicalDuration(avgDuration);
  } catch (error) {
    console.warn("Failed to add to booking history:", error);
  }
}

/**
 * Get booking history
 */
function getBookingHistory(): BookingHistoryItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.BOOKING_HISTORY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Fall through to empty array
  }
  return [];
}

/**
 * Get smart defaults for a new booking
 */
export function getSmartDefaults(
  availableFacilities: Array<{ id: string }>,
  currentHour: number = new Date().getHours(),
): SmartDefaults {
  const lastFacilityId = getLastUsedFacilityId();
  const typicalDuration = getTypicalDuration();

  // Determine start time based on current hour
  let startHour = 9; // Default: 9 AM
  let startMinute = 0;

  if (currentHour >= 6 && currentHour < 12) {
    // Morning: round up to next hour
    startHour = currentHour + 1;
  } else if (currentHour >= 12 && currentHour < 17) {
    // Afternoon: suggest 2 PM if before that, otherwise next hour
    startHour = currentHour < 14 ? 14 : currentHour + 1;
  } else if (currentHour >= 17 && currentHour < 21) {
    // Evening: next available hour
    startHour = currentHour + 1;
  } else {
    // After hours or early morning: suggest 9 AM
    startHour = 9;
  }

  // Ensure within reasonable bounds (6 AM - 9 PM)
  if (startHour < 6) startHour = 9;
  if (startHour > 21) startHour = 9;

  // Calculate end time
  const totalMinutes = startHour * 60 + startMinute + typicalDuration;
  const endHour = Math.floor(totalMinutes / 60);
  const endMinute = totalMinutes % 60;

  const startTime = `${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}`;
  const endTime = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;

  // Only include facility ID if it's still available
  const facilityId =
    lastFacilityId && availableFacilities.some((f) => f.id === lastFacilityId)
      ? lastFacilityId
      : undefined;

  return {
    facilityId,
    startTime,
    endTime,
    duration: typicalDuration,
  };
}

/**
 * Get most frequently booked facilities
 */
export function getFavoriteFacilities(limit: number = 3): string[] {
  const history = getBookingHistory();

  // Count bookings per facility
  const facilityCounts = new Map<string, number>();
  history.forEach((item) => {
    facilityCounts.set(
      item.facilityId,
      (facilityCounts.get(item.facilityId) || 0) + 1,
    );
  });

  // Sort by count and return top N
  return Array.from(facilityCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([facilityId]) => facilityId);
}

/**
 * Clear all booking preferences (for testing or user request)
 */
export function clearBookingPreferences(): void {
  try {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.warn("Failed to clear booking preferences:", error);
  }
}
