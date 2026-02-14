/**
 * Facility Reservation Types
 *
 * Shared types for facility booking system with multi-horse support.
 */

export type ReservationStatus =
  | "pending" // Awaiting confirmation
  | "confirmed" // Approved and active
  | "rejected" // Admin rejected
  | "cancelled" // User cancelled
  | "completed" // Past reservation
  | "no_show"; // User didn't show up

export type FacilityType =
  | "transport"
  | "water_treadmill"
  | "indoor_arena"
  | "outdoor_arena"
  | "galloping_track"
  | "lunging_ring"
  | "paddock"
  | "solarium"
  | "jumping_yard"
  | "treadmill"
  | "vibration_plate"
  | "pasture"
  | "walker"
  | "other";

export interface FacilityReservation {
  id: string;

  // References
  facilityId: string;
  facilityName: string; // Denormalized for display
  facilityType: FacilityType; // Denormalized for filtering
  stableId: string;
  stableName?: string;

  // Reservation details
  userId: string;
  userEmail: string;
  userFullName?: string; // Denormalized for display

  startTime: Date | string; // Date object or ISO string
  endTime: Date | string;
  status: ReservationStatus;

  // Horse details - Multi-horse support with backward compatibility
  /** @deprecated Use horseIds instead for new bookings */
  horseId?: string;
  /** @deprecated Use horseNames instead for new bookings */
  horseName?: string;

  /** Array of horse IDs for multi-horse bookings (preferred for new bookings) */
  horseIds?: string[];
  /** Array of horse names, denormalized for display (preferred for new bookings) */
  horseNames?: string[];

  // Optional details
  contactInfo?: string;
  notes?: string;

  // Conflict detection
  conflictsWith?: string[]; // Array of overlapping reservation IDs

  // Timestamps (managed by API)
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: string;
  lastModifiedBy: string;
}

export interface CreateReservationData extends Omit<
  FacilityReservation,
  | "id"
  | "facilityName"
  | "facilityType"
  | "stableId"
  | "stableName"
  | "userEmail"
  | "userFullName"
  | "horseName"
  | "horseNames"
  | "conflictsWith"
  | "createdAt"
  | "updatedAt"
  | "createdBy"
  | "lastModifiedBy"
> {}

export interface UpdateReservationData extends Partial<CreateReservationData> {}

/**
 * Helper function to get horse IDs from a reservation (handles both legacy and new format)
 */
export function getHorseIds(reservation: FacilityReservation): string[] {
  if (reservation.horseIds && reservation.horseIds.length > 0) {
    return reservation.horseIds;
  }
  if (reservation.horseId) {
    return [reservation.horseId];
  }
  return [];
}

/**
 * Helper function to get horse names from a reservation (handles both legacy and new format)
 */
export function getHorseNames(reservation: FacilityReservation): string[] {
  if (reservation.horseNames && reservation.horseNames.length > 0) {
    return reservation.horseNames;
  }
  if (reservation.horseName) {
    return [reservation.horseName];
  }
  return [];
}

/**
 * Helper function to get horse count from a reservation
 */
export function getHorseCount(reservation: FacilityReservation): number {
  return getHorseIds(reservation).length;
}
