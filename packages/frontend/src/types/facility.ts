import { Timestamp } from "firebase/firestore";
import type { FacilityAvailabilitySchedule } from "@equiduty/shared";

export type { FacilityAvailabilitySchedule } from "@equiduty/shared";
export type {
  TimeBlock,
  DayOfWeek,
  FacilityDaySchedule,
  WeeklySchedule,
  ScheduleException,
} from "@equiduty/shared";

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

export type FacilityStatus = "active" | "inactive" | "maintenance";

export type TimeSlotDuration = 15 | 30 | 60; // minutes

export interface Facility {
  id: string;
  stableId: string;
  stableName?: string; // Denormalized for display

  // Basic info
  name: string;
  type: FacilityType;
  description?: string;
  status: FacilityStatus;

  // Booking rules
  planningWindowOpens: number; // days ahead
  planningWindowCloses: number; // hours before
  maxHorsesPerReservation: number;
  minTimeSlotDuration: TimeSlotDuration; // minimum minutes per reservation
  maxHoursPerReservation: number;

  // New availability schedule
  availabilitySchedule?: FacilityAvailabilitySchedule;

  // Legacy availability fields (kept for backward compatibility)
  availableFrom: string; // HH:mm format (e.g., "08:00")
  availableTo: string; // HH:mm format (e.g., "20:00")
  daysAvailable: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };

  // Timestamps (managed by API)
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  lastModifiedBy: string;
}

export interface CreateFacilityData extends Omit<
  Facility,
  | "id"
  | "stableId"
  | "stableName"
  | "createdAt"
  | "updatedAt"
  | "createdBy"
  | "lastModifiedBy"
> {}

export interface UpdateFacilityData extends Partial<CreateFacilityData> {}
