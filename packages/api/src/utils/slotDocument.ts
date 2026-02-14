/**
 * Facility Day Slot Document Utility
 *
 * Implements a semaphore pattern for facility booking concurrency control.
 * Each facility+date combination has a slot document that tracks current bookings.
 * By reading and writing this document inside a Firestore transaction, we force
 * concurrent booking attempts to be serialized — preventing capacity violations.
 *
 * Collection: facilityDaySlots
 * Document ID: {facilityId}_{YYYY-MM-DD}
 */

import { db } from "./firebase.js";
import {
  Timestamp,
  type Transaction,
  type DocumentReference,
} from "firebase-admin/firestore";

export interface SlotBookingEntry {
  reservationId: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  horseCount: number;
  userId: string;
  status: string;
}

export interface FacilityDaySlot {
  facilityId: string;
  date: string; // YYYY-MM-DD
  currentBookings: SlotBookingEntry[];
  lastModified: Timestamp;
}

/**
 * Build the document ID for a facility+date slot
 */
export function getSlotDocId(facilityId: string, date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${facilityId}_${yyyy}-${mm}-${dd}`;
}

/**
 * Get the slot document reference
 */
export function getSlotDocRef(
  facilityId: string,
  date: Date,
): DocumentReference {
  const docId = getSlotDocId(facilityId, date);
  return db.collection("facilityDaySlots").doc(docId);
}

/**
 * Read slot document inside a transaction. Creates a default if it doesn't exist.
 */
export async function readSlotDocument(
  transaction: Transaction,
  facilityId: string,
  date: Date,
): Promise<{ ref: DocumentReference; data: FacilityDaySlot }> {
  const ref = getSlotDocRef(facilityId, date);
  const doc = await transaction.get(ref);

  if (doc.exists) {
    return { ref, data: doc.data() as FacilityDaySlot };
  }

  // Default empty slot document
  const dateStr = getSlotDocId(facilityId, date).split("_").slice(1).join("_");
  const defaultData: FacilityDaySlot = {
    facilityId,
    date: dateStr,
    currentBookings: [],
    lastModified: Timestamp.now(),
  };

  return { ref, data: defaultData };
}

/**
 * Validate capacity using the slot document data (no separate query needed).
 * Returns remaining capacity or throws with details.
 */
export function validateCapacityFromSlot(
  slotData: FacilityDaySlot,
  newStartTime: Date,
  newEndTime: Date,
  newHorseCount: number,
  maxCapacity: number,
  excludeReservationId?: string,
): {
  valid: boolean;
  peakConcurrent: number;
  peakTime: Date | null;
  remainingCapacity: number;
} {
  // Filter to active bookings that overlap with the new time range
  const activeBookings = slotData.currentBookings.filter((b) => {
    if (excludeReservationId && b.reservationId === excludeReservationId)
      return false;
    if (b.status === "cancelled" || b.status === "rejected") return false;

    const bStart = new Date(b.startTime).getTime();
    const bEnd = new Date(b.endTime).getTime();
    const nStart = newStartTime.getTime();
    const nEnd = newEndTime.getTime();

    // Overlap check: two ranges overlap if one starts before the other ends
    return nStart < bEnd && nEnd > bStart;
  });

  // Timeline sweep to find peak concurrent horses
  interface SweepEvent {
    time: number;
    type: "START" | "END";
    horses: number;
  }

  const events: SweepEvent[] = [];

  for (const b of activeBookings) {
    if (b.horseCount === 0) continue;
    events.push({
      time: new Date(b.startTime).getTime(),
      type: "START",
      horses: b.horseCount,
    });
    events.push({
      time: new Date(b.endTime).getTime(),
      type: "END",
      horses: b.horseCount,
    });
  }

  // Add the new booking
  events.push({
    time: newStartTime.getTime(),
    type: "START",
    horses: newHorseCount,
  });
  events.push({
    time: newEndTime.getTime(),
    type: "END",
    horses: newHorseCount,
  });

  // Sort: by time, then START before END at same time
  events.sort((a, b) => {
    const diff = a.time - b.time;
    if (diff !== 0) return diff;
    return a.type === "START" ? -1 : 1;
  });

  let current = 0;
  let peakConcurrent = 0;
  let peakTime: number | null = null;

  for (const ev of events) {
    if (ev.type === "START") {
      current += ev.horses;
      if (current > peakConcurrent) {
        peakConcurrent = current;
        peakTime = ev.time;
      }
    } else {
      current -= ev.horses;
    }
  }

  const remainingCapacity = Math.max(0, maxCapacity - peakConcurrent);

  return {
    valid: peakConcurrent <= maxCapacity,
    peakConcurrent,
    peakTime: peakTime !== null ? new Date(peakTime) : null,
    remainingCapacity,
  };
}

/**
 * Add a booking entry to the slot document within a transaction.
 */
export function addBookingToSlot(
  transaction: Transaction,
  slotRef: DocumentReference,
  slotData: FacilityDaySlot,
  entry: SlotBookingEntry,
): void {
  const updatedBookings = [...slotData.currentBookings, entry];
  transaction.set(
    slotRef,
    {
      facilityId: slotData.facilityId,
      date: slotData.date,
      currentBookings: updatedBookings,
      lastModified: Timestamp.now(),
    },
    { merge: true },
  );
}

/**
 * Update a booking entry in the slot document within a transaction.
 */
export function updateBookingInSlot(
  transaction: Transaction,
  slotRef: DocumentReference,
  slotData: FacilityDaySlot,
  reservationId: string,
  updates: Partial<SlotBookingEntry>,
): void {
  const updatedBookings = slotData.currentBookings.map((b) => {
    if (b.reservationId === reservationId) {
      return { ...b, ...updates };
    }
    return b;
  });

  transaction.set(
    slotRef,
    {
      currentBookings: updatedBookings,
      lastModified: Timestamp.now(),
    },
    { merge: true },
  );
}

/**
 * Remove a booking entry from the slot document within a transaction.
 */
export function removeBookingFromSlot(
  transaction: Transaction,
  slotRef: DocumentReference,
  slotData: FacilityDaySlot,
  reservationId: string,
): void {
  const updatedBookings = slotData.currentBookings.filter(
    (b) => b.reservationId !== reservationId,
  );

  transaction.set(
    slotRef,
    {
      currentBookings: updatedBookings,
      lastModified: Timestamp.now(),
    },
    { merge: true },
  );
}

/**
 * Find suggested alternative time slots when a booking is rejected.
 * Searches forward from the requested time in 30-minute increments.
 */
export function findSuggestedSlots(
  slotData: FacilityDaySlot,
  requestedStart: Date,
  requestedEnd: Date,
  horseCount: number,
  maxCapacity: number,
  maxSuggestions: number = 3,
): Array<{
  startTime: string;
  endTime: string;
  remainingCapacity: number;
}> {
  const duration = requestedEnd.getTime() - requestedStart.getTime();
  const suggestions: Array<{
    startTime: string;
    endTime: string;
    remainingCapacity: number;
  }> = [];

  // Search forward from the requested start in 30-min increments
  // Up to 8 hours ahead (16 increments)
  for (
    let offset = 1;
    offset <= 16 && suggestions.length < maxSuggestions;
    offset++
  ) {
    const candidateStart = new Date(
      requestedStart.getTime() + offset * 30 * 60 * 1000,
    );
    const candidateEnd = new Date(candidateStart.getTime() + duration);

    // Don't suggest slots past 22:00
    if (candidateStart.getHours() >= 22) break;

    const result = validateCapacityFromSlot(
      slotData,
      candidateStart,
      candidateEnd,
      horseCount,
      maxCapacity,
    );

    if (result.valid) {
      suggestions.push({
        startTime: candidateStart.toISOString(),
        endTime: candidateEnd.toISOString(),
        remainingCapacity: result.remainingCapacity,
      });
    }
  }

  // Also search backwards (up to 4 hours = 8 increments)
  for (
    let offset = 1;
    offset <= 8 && suggestions.length < maxSuggestions;
    offset++
  ) {
    const candidateStart = new Date(
      requestedStart.getTime() - offset * 30 * 60 * 1000,
    );
    const candidateEnd = new Date(candidateStart.getTime() + duration);

    // Don't suggest slots before 06:00
    if (candidateStart.getHours() < 6) break;

    const result = validateCapacityFromSlot(
      slotData,
      candidateStart,
      candidateEnd,
      horseCount,
      maxCapacity,
    );

    if (result.valid) {
      suggestions.push({
        startTime: candidateStart.toISOString(),
        endTime: candidateEnd.toISOString(),
        remainingCapacity: result.remainingCapacity,
      });
    }
  }

  // Sort by proximity to the original requested time
  suggestions.sort((a, b) => {
    const aDist = Math.abs(
      new Date(a.startTime).getTime() - requestedStart.getTime(),
    );
    const bDist = Math.abs(
      new Date(b.startTime).getTime() - requestedStart.getTime(),
    );
    return aDist - bDist;
  });

  return suggestions.slice(0, maxSuggestions);
}
