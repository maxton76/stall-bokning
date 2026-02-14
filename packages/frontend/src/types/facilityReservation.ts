import { Timestamp } from "firebase/firestore";
import type { FacilityType } from "./facility";

export type ReservationStatus =
  | "pending" // Awaiting confirmation
  | "confirmed" // Approved and active
  | "rejected" // Admin rejected
  | "cancelled" // User cancelled
  | "completed" // Past reservation
  | "no_show"; // User didn't show up

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

  startTime: Timestamp;
  endTime: Timestamp;
  status: ReservationStatus;

  // Horse details - Multi-horse support with backward compatibility
  /** @deprecated Use horseIds instead for new bookings */
  horseId?: string;
  /** @deprecated Use horseNames instead for new bookings */
  horseName?: string; // Denormalized for display

  /** Array of horse IDs for multi-horse bookings (preferred for new bookings) */
  horseIds?: string[];
  /** Array of horse names, denormalized for display (preferred for new bookings) */
  horseNames?: string[];

  /** Number of external horses (not registered in the stable) */
  externalHorseCount?: number;

  // Optional details
  contactInfo?: string;
  notes?: string;

  // Conflict detection
  conflictsWith?: string[]; // Array of overlapping reservation IDs

  // Timestamps (managed by API)
  createdAt: Timestamp;
  updatedAt: Timestamp;
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
  | "conflictsWith"
  | "createdAt"
  | "updatedAt"
  | "createdBy"
  | "lastModifiedBy"
> {}

export interface UpdateReservationData extends Partial<CreateReservationData> {}
