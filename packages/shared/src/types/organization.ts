import { Timestamp } from "firebase/firestore";
import type {
  MemberAvailability,
  MemberLimits,
  MemberStats,
} from "./domain.js";
import type { HolidayCalendarSettings } from "../data/holidays/schema.js";

/**
 * Organization roles for multi-role permission system
 * Users can have multiple roles within an organization
 */
export type OrganizationRole =
  | "administrator" // Full organization access
  | "schedule_planner" // Can manage routine selection processes
  | "veterinarian" // Animal health services
  | "dentist" // Equine dental services
  | "farrier" // Hoof care services
  | "customer" // Horse owner/client
  | "groom" // Daily care staff
  | "saddle_maker" // Tack and saddle services
  | "horse_owner" // External horse owner
  | "rider" // Professional rider
  | "inseminator" // Breeding services
  | "trainer" // Riding instructor / lesson trainer
  | "training_admin" // Manages lesson schedules and training program
  | "support_contact"; // Delegated access to support tickets

/**
 * Contact type for organizations and members
 */
export type ContactType = "Personal" | "Business";

// SubscriptionTier moved to admin.ts: "free" | "standard" | "pro" | "enterprise"
import type { SubscriptionTier } from "./admin.js";
import type { OrganizationStripeSubscription } from "./subscription.js";

/**
 * Organization type - determines feature availability and behavior
 * - personal: Auto-created for each user, single owner, limited features (free tier)
 * - business: Created by stable_owner users, multiple members, full features
 */
export type OrganizationType = "personal" | "business";

/**
 * Membership status
 */
export type MembershipStatus = "active" | "inactive" | "pending" | "expired";

/**
 * Stable access level for organization members
 */
export type StableAccessLevel = "all" | "specific";

/**
 * Organization-level settings
 * Groups configurable organization preferences
 */
export interface OrganizationSettings {
  /** Holiday calendar settings for the organization */
  holidayCalendar?: HolidayCalendarSettings;
  // Future settings can be added here (e.g., notification preferences, theme settings)
}

/**
 * Organization entity - contains multiple stables
 * Represents the top-level organizational unit
 *
 * Two types:
 * - personal: Auto-created for each user, 1 implicit stable, limited features
 * - business: Created by stable_owner users, multiple stables, full features
 */
export interface Organization {
  id: string;
  name: string;
  description?: string;

  // Display customization
  displayName?: string; // User-facing name (e.g., "Privat" for personal orgs)
  hideWhenEmpty?: boolean; // Hide in org switcher when no horses and user has other orgs

  // Organization Type (determines feature availability)
  // Defaults to 'personal' for auto-created orgs, 'business' for orgs with multiple stables
  organizationType?: OrganizationType;

  // Contact Information
  contactType: ContactType;
  primaryEmail: string;
  phoneNumber?: string;

  // Timezone for scheduling
  timezone: string;

  // Ownership
  ownerId: string; // Organization owner (must be stable_owner systemRole)
  ownerEmail: string; // Cached for display

  // Contact Integration
  stableContactId?: string; // Contact representing the stable/organization itself (badge: 'stable')

  // Implicit Stable (for personal organizations)
  // Auto-created "My Horses" stable that is always present
  implicitStableId?: string;

  // Subscription
  subscriptionTier: SubscriptionTier;
  /** Stripe subscription data for platform billing */
  stripeSubscription?: OrganizationStripeSubscription;

  // Statistics (denormalized for performance)
  stats: {
    stableCount: number;
    totalMemberCount: number;
  };

  // Organization Settings (optional for backward compatibility)
  settings?: OrganizationSettings;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Organization member with multi-role support
 * Links users to organizations with specific roles and permissions
 */
export interface OrganizationMember {
  id: string; // Format: {userId}_{organizationId}
  organizationId: string;
  userId: string;

  // Cached user information
  userEmail: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;

  // Multi-role support - users can have multiple roles
  roles: OrganizationRole[];
  primaryRole: OrganizationRole; // Main role for display purposes

  // Status
  status: MembershipStatus;

  // Planning visibility toggle
  showInPlanning: boolean; // Controls visibility in staff activity planning

  // Stable access control
  stableAccess: StableAccessLevel;
  assignedStableIds?: string[]; // Only populated if stableAccess === 'specific'

  // Shift assignment constraints (moved from stableMembers)
  availability?: MemberAvailability;
  limits?: MemberLimits;

  // Fairness tracking statistics (moved from stableMembers)
  stats?: MemberStats;

  // Invitation expiry
  expiresAt?: Timestamp; // 7 days after invite creation
  expiredAt?: Timestamp; // When it was actually expired
  expiredReason?: "declined" | "timeout"; // Why it expired

  // Metadata
  joinedAt: Timestamp;
  invitedBy: string; // User ID of inviter
  inviteAcceptedAt?: Timestamp;
}

/**
 * Data required to create a new organization
 */
export interface CreateOrganizationData {
  name: string;
  description?: string;
  contactType: ContactType;
  primaryEmail: string;
  phoneNumber?: string;
  timezone: string;
}

/**
 * Contact address for invite (imported from contact.ts for self-containment)
 */
export interface InviteContactAddress {
  street: string;
  houseNumber: string;
  addressLine2?: string;
  postcode: string;
  city: string;
  stateProvince?: string;
  country: string;
}

/**
 * Data required to invite a new organization member
 */
export interface InviteOrganizationMemberData {
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  roles: OrganizationRole[];
  primaryRole: OrganizationRole;
  showInPlanning: boolean;
  stableAccess: StableAccessLevel;
  assignedStableIds?: string[];
  // Contact creation fields
  contactType: ContactType; // Required for auto-creating contact
  businessName?: string; // For Business contacts
  address?: InviteContactAddress; // Optional address
}

/**
 * Invite status for organization invitations
 */
export type InviteStatus = "pending" | "accepted" | "declined" | "expired";

/**
 * Organization invite for non-existing users
 * Temporary storage until user creates account
 */
export interface OrganizationInvite {
  id: string; // Auto-generated invite ID
  organizationId: string;
  email: string; // Invitee email (lowercase)

  // User info (for future member creation)
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;

  // Contact type for auto-created contact
  contactType: ContactType; // Personal | Business
  businessName?: string; // For Business contacts
  address?: InviteContactAddress; // Optional address

  // Role assignment
  roles: OrganizationRole[];
  primaryRole: OrganizationRole;
  showInPlanning: boolean;
  stableAccess: StableAccessLevel;
  assignedStableIds?: string[];

  // Contact integration
  linkedContactId?: string; // Auto-created contact ID

  // Invite metadata
  token: string; // Unique invite token (UUID)
  status: InviteStatus;
  expiresAt: Timestamp; // 7 days from creation

  // Email tracking
  sentAt?: Timestamp; // When email first sent
  lastResentAt?: Timestamp; // When last resent
  resentCount: number; // Number of resends (starts at 0)

  // Audit trail
  invitedBy: string; // Inviter user ID
  invitedAt: Timestamp;
  respondedAt?: Timestamp;

  // Organization cache (for email template)
  organizationName: string;
  inviterName: string;
}

/**
 * Display data for organization member list
 */
export interface OrganizationMemberDisplay extends OrganizationMember {
  fullName: string;
  initials: string;
  assignedStableNames?: string[]; // Resolved stable names for display
}

/**
 * Vaccination rule scope types
 */
export type VaccinationRuleScope = "system" | "organization" | "user";

/**
 * Vaccination Rule - Multi-scope vaccination requirements
 * Supports three scopes:
 * - system: Standard rules (FEI, KNHS) available to all users
 * - organization: Organization-level rules created by org admins
 * - user: Personal rules created by individual users
 */
export interface VaccinationRule {
  id: string;

  // Scope Identification (EXACTLY ONE will be set)
  scope: VaccinationRuleScope;
  systemWide?: boolean; // true for FEI/KNHS system rules
  organizationId?: string; // set if scope='organization'
  userId?: string; // set if scope='user'

  // Core Fields
  name: string; // e.g., "FEI rules", "KNHS rules"
  description?: string; // Full description of the rule
  periodMonths: number; // Months between vaccinations
  periodDays: number; // Additional days
  daysNotCompeting: number; // Days cannot compete after vaccination

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // userId or 'system' for system rules

  // Deprecated (backward compatibility during migration)
  /** @deprecated Use scope and organizationId instead */
  stableId?: string;
}
