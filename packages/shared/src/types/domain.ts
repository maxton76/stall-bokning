import type { Timestamp } from "firebase/firestore";
import type {
  VaccinationStatus,
  HorseVaccinationAssignment,
} from "./vaccination.js";
import type { MembershipStatus } from "./organization.js";
import type { SelectionAlgorithm } from "./selectionProcess.js";

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
  memoryHorizonDays: number; // For rolling window (default 90)
  holidayMultiplier: number; // Default 1.5
}

/**
 * Scheduling configuration for a stable
 */
export interface SchedulingConfig {
  scheduleHorizonDays: number; // Default: 14, Range: 7-90
  autoAssignment: boolean; // Default: true
  allowSwaps: boolean; // Default: true
  requireApproval: boolean; // Default: false
  defaultSelectionAlgorithm?: SelectionAlgorithm; // Default algorithm for selection processes
}

/**
 * Notification configuration for a stable
 */
export interface NotificationConfig {
  emailNotifications: boolean; // Master toggle, Default: true
  shiftReminders: boolean; // Default: true
  schedulePublished: boolean; // Default: true
  memberJoined: boolean; // Default: true
  shiftSwapRequests: boolean; // Default: true
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
  facilityNumber?: string; // Anläggningsnummer - Jordbruksverket registration
  ownerId: string; // Must be a user with systemRole='stable_owner'
  ownerEmail?: string; // Cached for display
  organizationId?: string; // Link to parent organization (optional for backward compatibility)

  // Points system configuration
  pointsSystem?: PointsSystemConfig;

  // Scheduling configuration
  schedulingConfig?: SchedulingConfig;

  // Notification configuration
  notificationConfig?: NotificationConfig;

  // Facility registry
  boxes?: string[]; // Box/stall names for this stable
  paddocks?: string[]; // Paddock/pasture names for this stable

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Member availability constraints
 */
export interface MemberAvailability {
  neverAvailable?: {
    dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sunday
    timeSlots: { start: string; end: string }[]; // "HH:MM" format
  }[];
  preferredTimes?: {
    dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    timeSlots: { start: string; end: string }[];
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
  totalPoints: number; // All-time completed shift points
  totalShifts: number; // All-time completed shifts
  currentPeriodPoints: number; // Since last reset
  lastShiftDate?: Timestamp; // Most recent completed shift
  lastPointsReset?: Timestamp; // When points were last reset
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

  // Shift assignment constraints
  availability?: MemberAvailability;
  limits?: MemberLimits;

  // Fairness tracking statistics
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
 * - organization: Owned by the organization itself (e.g., riding school horses)
 */
export type HorseOwnershipType =
  | "member"
  | "contact"
  | "external"
  | "organization";

/**
 * Equipment item for horse special instructions
 */
export interface EquipmentItem {
  id: string; // UUID for React keys
  name: string; // Equipment name (e.g., "Boots", "Täcke")
  location?: string; // Storage location (e.g., "Sadelkammaren", "Hylla 3")
  notes?: string; // Additional notes (e.g., "Endast vid regn")
}

/**
 * Related link for horse (external URLs)
 */
export interface HorseLink {
  id: string; // UUID for React keys
  title: string; // Display title (e.g., "Competition Results", "Breeder Website")
  url: string; // Full URL
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
  color: HorseColor; // REQUIRED
  gender?: HorseGender;

  // Ownership (immutable)
  ownerId: string; // User who owns this horse (can be owner or member)
  ownerName?: string; // Cached for display
  ownerEmail?: string; // Cached for display

  // Enhanced ownership tracking
  ownershipType: HorseOwnershipType; // member | contact | external
  ownerContactId?: string; // Contact ID if ownershipType === 'contact'
  ownerContactName?: string; // Cached contact name for display

  // Owner's organization (for ownership vs placement tracking)
  // This is the owner's personal organization where the horse "lives" conceptually
  ownerOrganizationId?: string; // Owner's personal organization ID (or external org if ownershipType === 'external')

  // Placement tracking (separate from ownership)
  // Where the horse is physically located - can change without changing ownership
  placementOrganizationId?: string; // Business org where horse is placed
  placementStableId?: string; // Specific stable within that org (may differ from currentStableId during transition)
  placementDate?: Timestamp; // When horse was placed (for history visibility cutoff)

  // History visibility for placement organizations
  // Controls what historical data the placement org can see
  historyVisibility?: "full" | "from_placement"; // Default: 'from_placement'

  // External horse flag - if true, horse is not part of the stable
  isExternal: boolean; // Default: false

  // Required for non-external horses only
  dateOfArrival?: Timestamp; // Required if isExternal === false

  // Stable Assignment (optional and mutable) - Only for non-external horses
  currentStableId?: string; // OPTIONAL - horse may be unassigned or assigned to a stable
  currentStableName?: string; // Cached for display
  assignedAt?: Timestamp; // When assigned to current stable
  boxName?: string; // Box/stall name or number
  paddockName?: string; // Paddock/pasture name

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

  // Vaccination Rule Assignments - Multiple rules per horse
  // Each rule tracks its own status independently
  assignedVaccinationRules?: HorseVaccinationAssignment[]; // Array of assigned rules with status
  vaccinationRuleCount?: number; // Quick count for display/filtering

  // Aggregate Vaccination Tracking (denormalized for performance)
  // These represent the "worst" status across all assigned rules
  lastVaccinationDate?: Timestamp; // Most recent vaccination across all rules
  nextVaccinationDue?: Timestamp; // Nearest due date across all rules
  vaccinationStatus?: VaccinationStatus; // Aggregate status (worst status wins)

  // DEPRECATED: Single rule assignment (kept for backward compatibility during migration)
  // @deprecated Use assignedVaccinationRules instead
  vaccinationRuleId?: string; // DEPRECATED - use assignedVaccinationRules
  // @deprecated Use assignedVaccinationRules instead
  vaccinationRuleName?: string; // DEPRECATED - use assignedVaccinationRules

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

  // Special Instructions (for turnout, handling, etc.)
  specialInstructions?: string; // Free text instructions
  equipment?: EquipmentItem[]; // Structured equipment list
  hasSpecialInstructions?: boolean; // Computed flag for quick filtering

  // Team information - See types/team.ts for HorseTeam interface
  // Stored as embedded document for quick access
  hasTeamAssignments?: boolean; // Computed flag for quick filtering

  // Transport instructions - See types/transport.ts for TransportInstructions
  // Stored as embedded document for quick access
  hasTransportInstructions?: boolean; // Computed flag for quick filtering

  // Pedigree - See types/pedigree.ts for HorsePedigree interface
  // Stored as embedded document
  hasPedigreeData?: boolean; // Computed flag for quick filtering

  // Related URLs/Links
  relatedLinks?: HorseLink[];

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
  time: string; // "HH:MM-HH:MM" format
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

  // Cancellation tracking
  cancelledAt?: Timestamp;
  cancelledBy?: string;
  cancellationReason?: string;

  // Missed shift tracking
  markedMissedAt?: Timestamp;
  markedMissedBy?: string;
  missedReason?: string;

  // Legacy fields (for backward compatibility)
  userId?: string;
  startTime?: string;
  endTime?: string;
  role?: string;

  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}
