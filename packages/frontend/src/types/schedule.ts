import { Timestamp } from "firebase/firestore";

export interface Schedule {
  id: string;
  name: string;
  stableId: string;
  stableName: string;
  startDate: Timestamp;
  endDate: Timestamp;
  useAutoAssignment: boolean;
  notifyMembers: boolean;
  status: "draft" | "published" | "archived";
  publishedAt?: Timestamp;
  publishedBy?: string;
  createdAt: Timestamp;
  createdBy: string;
}

/**
 * Shift status - expanded lifecycle
 */
export type ShiftStatus =
  | "unassigned"
  | "assigned"
  | "completed"
  | "cancelled"
  | "missed";

export interface Shift {
  id: string;
  scheduleId: string;
  stableId: string;
  stableName: string;
  date: Timestamp;
  shiftTypeId: string;
  shiftTypeName: string;
  time: string;
  points: number;
  status: ShiftStatus;

  // Assignment tracking
  assignedTo: string | null;
  assignedToName: string | null;
  assignedToEmail: string | null;
  assignedAt?: Timestamp;
  assignedBy?: string;

  // Points tracking
  pointsAwarded?: number; // Actual points awarded (may include holiday multiplier)
  isHolidayShift?: boolean;

  // Completion tracking
  completedAt?: Timestamp;
  completedBy?: string;
  completionNotes?: string;

  // Cancellation tracking
  cancelledAt?: Timestamp;
  cancelledBy?: string;
  cancellationReason?: string;

  // Missed shift tracking
  markedMissedAt?: Timestamp;
  markedMissedBy?: string;
  missedReason?: string;
}

export interface ShiftType {
  id: string;
  stableId: string;
  name: string;
  time: string;
  points: number;
  daysOfWeek: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CreateScheduleData {
  name: string;
  stableId: string;
  stableName: string;
  startDate: Date;
  endDate: Date;
  selectedShiftTypes: string[];
  useAutoAssignment: boolean;
  notifyMembers: boolean;
}

export interface MemberAvailability {
  neverAvailable?: {
    dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sunday
    timeSlots: { start: string; end: string }[]; // "HH:MM"
  }[];
  preferredTimes?: {
    dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    timeSlots: { start: string; end: string }[];
  }[];
}

export interface MemberLimits {
  maxShiftsPerWeek?: number;
  minShiftsPerWeek?: number;
  maxShiftsPerMonth?: number;
  minShiftsPerMonth?: number;
}

export interface StableMember {
  userId: string;
  stableId: string;
  firstName?: string;
  lastName?: string;
  displayName: string; // Deprecated: Use firstName/lastName and compute display name in UI
  email: string;
  avatarUrl?: string;
  role: "owner" | "admin" | "coAdmin" | "scheduleManager" | "guest";
  status: "active" | "vacation" | "temporaryAbsent" | "inactive";
  availability?: MemberAvailability;
  limits?: MemberLimits;
  stats: {
    totalPoints: number;
    totalShifts: number;
    lastShiftDate?: Date;
    currentPeriodPoints: number;
  };
  joinedAt: Date;
}
