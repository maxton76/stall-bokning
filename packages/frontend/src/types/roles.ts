import { Timestamp } from "firebase/firestore";
import type { VaccinationStatus } from "@shared/types/vaccination";
import type { EquipmentItem, HorseOwnershipType } from "@shared/types/domain";
import type { RoutineCategory } from "@shared/types/routine";

/**
 * System-level roles (platform-wide)
 */
export type SystemRole = "system_admin" | "stable_owner" | "member";

/**
 * Stable-level roles (per-stable basis for members)
 */
export type StableMemberRole = "manager" | "member";

/**
 * Membership status
 */
export type MembershipStatus = "active" | "inactive" | "pending";

/**
 * User document structure
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
 */
export interface Stable {
  id: string;
  name: string;
  description?: string;
  address?: string;
  facilityNumber?: string; // Anläggningsnummer - Jordbruksverket registration
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
 * Horse usage types
 */
export type HorseUsage = "care" | "sport" | "breeding";

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
  gender?: "stallion" | "mare" | "gelding";

  // Ownership (immutable)
  ownerId: string; // User who owns this horse (can be owner or member)
  ownerName?: string; // Cached for display
  ownerEmail?: string; // Cached for display
  // Enhanced ownership tracking
  ownershipType: HorseOwnershipType; // 'member' | 'contact' | 'external'
  ownerContactId?: string; // Contact ID if owned by contact
  ownerContactName?: string; // Contact name for display
  ownerOrganizationId?: string; // Organization ID for external ownership

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
  status: "active" | "inactive";
  notes?: string;

  // Special Instructions (for turnout, handling, etc.)
  specialInstructions?: string; // General fallback instructions
  categoryInstructions?: Record<RoutineCategory, string>; // Category-specific instructions
  equipment?: EquipmentItem[]; // Structured equipment list
  hasSpecialInstructions?: boolean; // Computed flag for quick filtering

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
 * User's complete horse inventory across all stables
 */
export interface UserHorseInventory {
  userId: string;
  totalHorses: number;
  assignedHorses: number;
  unassignedHorses: number;
  stableAssignments: Array<{
    stableId: string;
    stableName: string;
    horseCount: number;
    horses: Horse[];
  }>;
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
 * Vaccination Rule - Re-exported from shared package
 * @see {@link import('@shared/types/organization').VaccinationRule}
 */
export type {
  VaccinationRule,
  VaccinationRuleScope,
} from "@shared/types/organization";

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
 * Permission check result
 */
export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
}

/**
 * User's stable access info (for UI display)
 */
export interface UserStableAccess {
  stableId: string;
  stableName: string;
  accessType: "owner" | "manager" | "member";
  horseCount: number;
}

/**
 * Permissions by action
 */
export type StableAction =
  | "view_stable"
  | "update_settings"
  | "delete_stable"
  | "view_members"
  | "invite_members"
  | "remove_members"
  | "change_roles"
  | "create_schedules"
  | "edit_schedules"
  | "delete_schedules"
  | "view_schedules"
  | "book_shifts"
  | "cancel_own_bookings"
  | "cancel_others_bookings";

export type HorseAction =
  | "add_horse"
  | "view_horses"
  | "edit_own_horse"
  | "edit_any_horse"
  | "delete_own_horse"
  | "delete_any_horse"
  | "assign_to_shift";

/**
 * Permission matrix for stable operations
 */
export const STABLE_PERMISSIONS: Record<
  StableAction,
  { owner: boolean; manager: boolean; member: boolean }
> = {
  view_stable: { owner: true, manager: true, member: true },
  update_settings: { owner: true, manager: false, member: false },
  delete_stable: { owner: true, manager: false, member: false },
  view_members: { owner: true, manager: true, member: true },
  invite_members: { owner: true, manager: true, member: false },
  remove_members: { owner: true, manager: false, member: false },
  change_roles: { owner: true, manager: false, member: false },
  create_schedules: { owner: true, manager: true, member: false },
  edit_schedules: { owner: true, manager: true, member: false },
  delete_schedules: { owner: true, manager: false, member: false },
  view_schedules: { owner: true, manager: true, member: true },
  book_shifts: { owner: true, manager: true, member: true },
  cancel_own_bookings: { owner: true, manager: true, member: true },
  cancel_others_bookings: { owner: true, manager: true, member: false },
};

/**
 * Permission matrix for horse operations
 */
export const HORSE_PERMISSIONS: Record<
  HorseAction,
  { owner: boolean; manager: boolean; member: boolean }
> = {
  add_horse: { owner: true, manager: true, member: true },
  view_horses: { owner: true, manager: true, member: true },
  edit_own_horse: { owner: true, manager: true, member: true },
  edit_any_horse: { owner: false, manager: false, member: false },
  delete_own_horse: { owner: true, manager: true, member: true },
  delete_any_horse: { owner: false, manager: false, member: false },
  assign_to_shift: { owner: true, manager: true, member: true },
};
