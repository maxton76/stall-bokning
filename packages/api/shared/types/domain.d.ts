import type { Timestamp } from "firebase/firestore";
import type { VaccinationStatus } from "./vaccination.js";
import type { MembershipStatus } from "./organization.js";
/**
 * System-level roles (platform-wide)
 * Applied to users at the system level via Firebase custom claims
 */
export type SystemRole = "system_admin" | "stable_owner" | "member";
/**
 * Stable-level roles (per-stable basis for members)
 * Users can have different roles in different stables
 */
export type StableMemberRole = "manager" | "member";
/**
 * User document structure
 * Represents a registered user in the system
 */
export interface User {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  systemRole: SystemRole;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
/**
 * Points system configuration for a stable
 */
export interface PointsSystemConfig {
  resetPeriod: "monthly" | "quarterly" | "yearly" | "rolling" | "never";
  memoryHorizonDays: number;
  holidayMultiplier: number;
}
/**
 * Stable document structure
 * CONSOLIDATED from frontend and API (removed duplicate capacity/price fields from API version)
 */
export interface Stable {
  id: string;
  name: string;
  description?: string;
  address?: string;
  facilityNumber?: string;
  ownerId: string;
  ownerEmail?: string;
  organizationId?: string;
  pointsSystem?: PointsSystemConfig;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
/**
 * Member availability constraints
 */
export interface MemberAvailability {
  neverAvailable?: {
    dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    timeSlots: {
      start: string;
      end: string;
    }[];
  }[];
  preferredTimes?: {
    dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    timeSlots: {
      start: string;
      end: string;
    }[];
  }[];
}
/**
 * Member shift limits
 */
export interface MemberLimits {
  maxShiftsPerWeek?: number;
  minShiftsPerWeek?: number;
  maxShiftsPerMonth?: number;
  minShiftsPerMonth?: number;
}
/**
 * Member statistics for fairness tracking
 */
export interface MemberStats {
  totalPoints: number;
  totalShifts: number;
  currentPeriodPoints: number;
  lastShiftDate?: Timestamp;
  lastPointsReset?: Timestamp;
}
/**
 * Stable member document structure
 * Note: Stable owners are NOT in this collection - they're tracked via stables.ownerId
 */
export interface StableMember {
  id: string;
  stableId: string;
  userId: string;
  userEmail?: string;
  firstName?: string;
  lastName?: string;
  role: StableMemberRole;
  status: MembershipStatus;
  joinedAt: Timestamp;
  invitedBy?: string;
  inviteAcceptedAt?: Timestamp;
  availability?: MemberAvailability;
  limits?: MemberLimits;
  stats?: MemberStats;
}
/**
 * Horse color options
 */
export type HorseColor =
  | "black"
  | "brown"
  | "bay_brown"
  | "dark_brown"
  | "chestnut"
  | "grey"
  | "strawberry"
  | "piebald"
  | "skewbald"
  | "dun"
  | "cream"
  | "palomino"
  | "appaloosa";
/**
 * Horse gender options
 */
export type HorseGender = "stallion" | "mare" | "gelding";
/**
 * Horse usage types
 */
export type HorseUsage = "care" | "sport" | "breeding";
/**
 * Horse status
 */
export type HorseStatus = "active" | "inactive";
/**
 * Horse ownership type - who owns the horse
 * - member: Owned by an organization member (linked to OrganizationMember)
 * - contact: Owned by a contact in the system (linked to Contact)
 * - external: Owned by someone from another organization
 */
export type HorseOwnershipType = "member" | "contact" | "external";
/**
 * Equipment item for horse special instructions
 */
export interface EquipmentItem {
  id: string;
  name: string;
  location?: string;
  notes?: string;
}
/**
 * Related link for horse (external URLs)
 */
export interface HorseLink {
  id: string;
  title: string;
  url: string;
  category?:
    | "competition"
    | "breeder"
    | "registry"
    | "video"
    | "social"
    | "other";
}
/**
 * Horse document structure
 * Horses are user-owned assets that can optionally be assigned to stables
 * Both stable owners AND members can own horses
 */
export interface Horse {
  id: string;
  name: string;
  breed?: string;
  age?: number;
  color: HorseColor;
  gender?: HorseGender;
  ownerId: string;
  ownerName?: string;
  ownerEmail?: string;
  ownershipType: HorseOwnershipType;
  ownerContactId?: string;
  ownerContactName?: string;
  ownerOrganizationId?: string;
  isExternal: boolean;
  dateOfArrival?: Timestamp;
  currentStableId?: string;
  currentStableName?: string;
  assignedAt?: Timestamp;
  externalContactId?: string;
  externalLocation?: string;
  externalMoveType?: "temporary" | "permanent";
  externalDepartureDate?: Timestamp;
  externalMoveReason?: string;
  isRemoved?: boolean;
  usage?: HorseUsage[];
  horseGroupId?: string;
  horseGroupName?: string;
  vaccinationRuleId?: string;
  vaccinationRuleName?: string;
  lastVaccinationDate?: Timestamp;
  nextVaccinationDue?: Timestamp;
  vaccinationStatus?: VaccinationStatus;
  ueln?: string;
  chipNumber?: string;
  federationNumber?: string;
  feiPassNumber?: string;
  feiExpiryDate?: Timestamp;
  sire?: string;
  dam?: string;
  damsire?: string;
  withersHeight?: number;
  dateOfBirth?: Timestamp;
  studbook?: string;
  breeder?: string;
  status: HorseStatus;
  notes?: string;
  specialInstructions?: string;
  equipment?: EquipmentItem[];
  hasSpecialInstructions?: boolean;
  hasTeamAssignments?: boolean;
  hasTransportInstructions?: boolean;
  hasPedigreeData?: boolean;
  relatedLinks?: HorseLink[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastModifiedBy: string;
}
/**
 * Horse assignment status
 */
export type HorseAssignmentStatus = "assigned" | "unassigned";
/**
 * Horse with additional status information for UI
 */
export interface HorseWithStatus extends Horse {
  assignmentStatus: HorseAssignmentStatus;
  canAssign: boolean;
  canUnassign: boolean;
}
/**
 * Horse Group - Organization-wide resource for organizing horses
 */
export interface HorseGroup {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
/**
 * Location History - Tracks horse movements between stables
 * Stored as subcollection: horses/{horseId}/locationHistory/{historyId}
 */
export interface LocationHistory {
  id: string;
  horseId: string;
  horseName: string;
  locationType: "stable" | "external";
  stableId?: string;
  stableName?: string;
  externalContactId?: string;
  externalLocation?: string;
  externalMoveType?: "temporary" | "permanent";
  externalMoveReason?: string;
  arrivalDate: Timestamp;
  departureDate?: Timestamp;
  createdAt: Timestamp;
  createdBy: string;
  lastModifiedBy: string;
}
/**
 * UI-friendly version with computed fields
 */
export interface LocationHistoryDisplay extends Omit<
  LocationHistory,
  "arrivalDate" | "departureDate" | "createdAt"
> {
  arrivalDate: Date;
  departureDate?: Date;
  createdAt: Date;
  isCurrentLocation: boolean;
  locationType: "stable" | "external";
}
/**
 * Schedule document structure (from API types)
 */
export interface Schedule {
  id?: string;
  stableId: string;
  stallNumber: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  status: "pending" | "confirmed" | "cancelled";
  pricePerMonth: number;
  createdAt?: Date;
  updatedAt?: Date;
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
/**
 * Shift document structure (enhanced for fairness system)
 */
export interface Shift {
  id?: string;
  scheduleId: string;
  stableId: string;
  stableName?: string;
  date: Date | Timestamp;
  shiftTypeId?: string;
  shiftTypeName?: string;
  time: string;
  points: number;
  status: ShiftStatus;
  assignedTo: string | null;
  assignedToName: string | null;
  assignedToEmail: string | null;
  assignedAt?: Timestamp;
  assignedBy?: string;
  pointsAwarded?: number;
  isHolidayShift?: boolean;
  completedAt?: Timestamp;
  completedBy?: string;
  cancelledAt?: Timestamp;
  cancelledBy?: string;
  cancellationReason?: string;
  markedMissedAt?: Timestamp;
  markedMissedBy?: string;
  missedReason?: string;
  userId?: string;
  startTime?: string;
  endTime?: string;
  role?: string;
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}
//# sourceMappingURL=domain.d.ts.map
