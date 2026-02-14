/**
 * Facility Capacity Validation Utility
 *
 * Implements timeline sweep algorithm to validate concurrent horse capacity
 * for facility reservations.
 */

import { db } from "./firebase.js";
import { Timestamp } from "firebase-admin/firestore";

interface TimelineEvent {
  time: Date;
  type: "START" | "END";
  horses: number;
  reservationId?: string;
}

interface CapacityValidationResult {
  valid: boolean;
  maxConcurrent?: number;
  maxConcurrentTime?: Date;
  message?: string;
}

/**
 * Get horse count from reservation data (handles both legacy and new format)
 */
function getHorseCount(reservation: any): number {
  if (reservation.horseIds && Array.isArray(reservation.horseIds)) {
    return reservation.horseIds.length;
  }
  if (reservation.horseId) {
    return 1;
  }
  return 0;
}

/**
 * Convert Firestore Timestamp to Date
 */
function toDate(timestamp: any): Date {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === "string") {
    return new Date(timestamp);
  }
  throw new Error(`Invalid timestamp type: ${typeof timestamp}`);
}

/**
 * Validate if a new reservation would exceed facility capacity using timeline sweep algorithm
 *
 * @param facilityId - ID of the facility
 * @param newBooking - New reservation data
 * @param maxCapacity - Maximum concurrent horses allowed
 * @param excludeReservationId - Optional reservation ID to exclude (for updates)
 * @returns Validation result with details
 */
export async function validateFacilityCapacity(
  facilityId: string,
  newBooking: {
    startTime: Date | string | Timestamp;
    endTime: Date | string | Timestamp;
    horseCount: number;
  },
  maxCapacity: number,
  excludeReservationId?: string,
): Promise<CapacityValidationResult> {
  try {
    const startTime = toDate(newBooking.startTime);
    const endTime = toDate(newBooking.endTime);

    // Query for overlapping reservations
    // Get reservations that might overlap with the new booking
    const startOfDay = new Date(startTime);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(endTime);
    endOfDay.setHours(23, 59, 59, 999);

    const reservationsSnapshot = await db
      .collection("facilityReservations")
      .where("facilityId", "==", facilityId)
      .where("startTime", "<=", Timestamp.fromDate(endOfDay))
      .where("endTime", ">=", Timestamp.fromDate(startOfDay))
      .where("status", "in", ["pending", "confirmed"])
      .get();

    // Build timeline events
    const events: TimelineEvent[] = [];

    // Add existing reservations
    reservationsSnapshot.forEach((doc) => {
      if (excludeReservationId && doc.id === excludeReservationId) {
        return; // Skip the reservation being updated
      }

      const reservation = doc.data();
      const horseCount = getHorseCount(reservation);

      if (horseCount === 0) return; // Skip reservations without horses

      const resStart = toDate(reservation.startTime);
      const resEnd = toDate(reservation.endTime);

      events.push({
        time: resStart,
        type: "START",
        horses: horseCount,
        reservationId: doc.id,
      });

      events.push({
        time: resEnd,
        type: "END",
        horses: horseCount,
        reservationId: doc.id,
      });
    });

    // Add new booking
    events.push({
      time: startTime,
      type: "START",
      horses: newBooking.horseCount,
    });

    events.push({
      time: endTime,
      type: "END",
      horses: newBooking.horseCount,
    });

    // Sort events chronologically (START before END for same time)
    events.sort((a, b) => {
      const timeDiff = a.time.getTime() - b.time.getTime();
      if (timeDiff !== 0) return timeDiff;
      // For same time, START comes before END
      return a.type === "START" ? -1 : 1;
    });

    // Sweep through timeline to find max concurrent horses
    let currentHorses = 0;
    let maxConcurrent = 0;
    let maxConcurrentTime: Date | undefined;

    for (const event of events) {
      if (event.type === "START") {
        currentHorses += event.horses;
        if (currentHorses > maxConcurrent) {
          maxConcurrent = currentHorses;
          maxConcurrentTime = event.time;
        }
      } else {
        currentHorses -= event.horses;
      }
    }

    // Validate capacity
    if (maxConcurrent > maxCapacity) {
      const timeStr = maxConcurrentTime
        ? maxConcurrentTime.toLocaleTimeString("sv-SE", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "unknown time";

      return {
        valid: false,
        maxConcurrent,
        maxConcurrentTime,
        message: `Facility capacity exceeded: ${maxConcurrent} horses at ${timeStr}, maximum is ${maxCapacity}`,
      };
    }

    return {
      valid: true,
      maxConcurrent,
      maxConcurrentTime,
    };
  } catch (error) {
    console.error("Error validating facility capacity:", error);
    throw new Error("Failed to validate facility capacity");
  }
}

/**
 * Get current capacity usage for a facility at a specific time range
 *
 * @param facilityId - ID of the facility
 * @param startTime - Start of time range
 * @param endTime - End of time range
 * @returns Current number of horses and list of reservation IDs
 */
export async function getCurrentCapacityUsage(
  facilityId: string,
  startTime: Date | string | Timestamp,
  endTime: Date | string | Timestamp,
): Promise<{ horseCount: number; reservationIds: string[] }> {
  try {
    const start = toDate(startTime);
    const end = toDate(endTime);

    const reservationsSnapshot = await db
      .collection("facilityReservations")
      .where("facilityId", "==", facilityId)
      .where("startTime", "<=", Timestamp.fromDate(end))
      .where("endTime", ">=", Timestamp.fromDate(start))
      .where("status", "in", ["pending", "confirmed"])
      .get();

    let totalHorses = 0;
    const reservationIds: string[] = [];

    reservationsSnapshot.forEach((doc) => {
      const reservation = doc.data();
      const horseCount = getHorseCount(reservation);
      totalHorses += horseCount;
      reservationIds.push(doc.id);
    });

    return { horseCount: totalHorses, reservationIds };
  } catch (error) {
    console.error("Error getting current capacity usage:", error);
    throw new Error("Failed to get current capacity usage");
  }
}
