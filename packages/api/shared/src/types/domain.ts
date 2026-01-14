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
 * Stable document structure
 * CONSOLIDATED from frontend and API (removed duplicate capacity/price fields from API version)
 */
export interface Stable {
  id: string;
  name: string;
  description?: string;
  address?: string;
  ownerId: string; // Must be a user with systemRole='stable_owner'
  ownerEmail?: string; // Cached for display
  organizationId?: string; // Link to parent organization (optional for backward compatibility)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Stable member document structure
 * Note: Stable owners are NOT in this collection - they're tracked via stables.ownerId
 */
export interface StableMember {
  id: string; // Format: {userId}_{stableId}
  stableId: string;
  userId: string; // Must NOT be the stable owner
  userEmail?: string; // Cached for display
  firstName?: string; // Cached from user doc
  lastName?: string; // Cached from user doc
  role: StableMemberRole; // 'manager' or 'member'
  status: MembershipStatus;
  joinedAt: Timestamp;
  invitedBy?: string; // userId who sent the invite
  inviteAcceptedAt?: Timestamp;
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
 * Horse document structure
 * Horses are user-owned assets that can optionally be assigned to stables
 * Both stable owners AND members can own horses
 */
export interface Horse {
  id: string;
  name: string;
  breed?: string;
  age?: number;
  color: HorseColor; // REQUIRED
  gender?: HorseGender;

  // Ownership (immutable)
  ownerId: string; // User who owns this horse (can be owner or member)
  ownerName?: string; // Cached for display
  ownerEmail?: string; // Cached for display

  // External horse flag - if true, horse is not part of the stable
  isExternal: boolean; // Default: false

  // Required for non-external horses only
  dateOfArrival?: Timestamp; // Required if isExternal === false

  // Stable Assignment (optional and mutable) - Only for non-external horses
  currentStableId?: string; // OPTIONAL - horse may be unassigned or assigned to a stable
  currentStableName?: string; // Cached for display
  assignedAt?: Timestamp; // When assigned to current stable

  // External Location Tracking - For horses moved to external locations
  externalContactId?: string; // Reference to contact document (if contact selected)
  externalLocation?: string; // User-entered location name (e.g., "Veterinary clinic", "Sold to XYZ Farm")
  externalMoveType?: "temporary" | "permanent"; // Type of external move
  externalDepartureDate?: Timestamp; // When horse left for external location
  externalMoveReason?: string; // Reason for permanent moves (e.g., "sold", "deceased", "retired")
  isRemoved?: boolean; // If true, hidden from external horses list

  // Usage - Only for non-external horses
  usage?: HorseUsage[]; // Array of usage types

  // Group Assignment - Only for non-external horses
  horseGroupId?: string; // OPTIONAL - horse may be assigned to a group
  horseGroupName?: string; // Cached for display

  // Vaccination Rule Assignment - Only for non-external horses
  vaccinationRuleId?: string; // OPTIONAL - horse may have vaccination rule
  vaccinationRuleName?: string; // Cached for display

  // Vaccination Tracking (denormalized for performance)
  lastVaccinationDate?: Timestamp; // Most recent vaccination
  nextVaccinationDue?: Timestamp; // When next vaccination is due
  vaccinationStatus?: VaccinationStatus; // Cached status (updated on record changes)

  // Identification
  ueln?: string; // Universal Equine Life Number
  chipNumber?: string; // Microchip number
  federationNumber?: string; // Federation registration number
  feiPassNumber?: string; // FEI passport number
  feiExpiryDate?: Timestamp; // FEI passport expiry date

  // Additional horse details
  sire?: string; // Father
  dam?: string; // Mother
  damsire?: string; // Mother's father
  withersHeight?: number; // Height in cm
  dateOfBirth?: Timestamp; // Birth date
  studbook?: string; // Studbook registration
  breeder?: string; // Breeder name

  // Status
  status: HorseStatus;
  notes?: string;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastModifiedBy: string; // userId who made last change
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
  canAssign: boolean; // Whether user can assign this horse
  canUnassign: boolean; // Whether user can unassign this horse
}

/**
 * Horse Group - Organization-wide resource for organizing horses
 */
export interface HorseGroup {
  id: string;
  organizationId: string; // Group belongs to organization (organization-wide)
  name: string; // e.g., "Competition Horses"
  description?: string;
  color?: string; // Hex color for UI display
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
  horseName: string; // Cached for display

  // Discriminator field - determines location type
  locationType: "stable" | "external";

  // Stable location fields (when locationType === 'stable')
  stableId?: string; // Optional - required for stable locations
  stableName?: string; // Cached for display - required for stable locations

  // External location fields (when locationType === 'external')
  externalContactId?: string; // Contact reference (optional)
  externalLocation?: string; // Location name (from contact or manual entry)
  externalMoveType?: "temporary" | "permanent";
  externalMoveReason?: string; // Reason (for permanent moves)

  // Common fields
  arrivalDate: Timestamp; // When horse arrived
  departureDate?: Timestamp; // When horse left (null = currently here)
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
  isCurrentLocation: boolean; // departureDate === null
  locationType: "stable" | "external"; // Explicitly include for type safety
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
 * Shift document structure (from API types)
 */
export interface Shift {
  id?: string;
  stableId: string;
  userId: string;
  date: Date;
  startTime: string;
  endTime: string;
  role: string;
  status: "scheduled" | "completed" | "cancelled";
  createdAt?: Date;
  updatedAt?: Date;
}
