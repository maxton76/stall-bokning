import { Timestamp } from "firebase/firestore";
/**
 * Organization roles for multi-role permission system
 * Users can have multiple roles within an organization
 */
export type OrganizationRole =
  | "administrator"
  | "veterinarian"
  | "dentist"
  | "farrier"
  | "customer"
  | "groom"
  | "saddle_maker"
  | "horse_owner"
  | "rider"
  | "inseminator";
/**
 * Contact type for organizations and members
 */
export type ContactType = "Personal" | "Business";
/**
 * Subscription tiers for organizations
 */
export type SubscriptionTier = "free" | "professional" | "enterprise";
/**
 * Membership status
 */
export type MembershipStatus = "active" | "inactive" | "pending";
/**
 * Stable access level for organization members
 */
export type StableAccessLevel = "all" | "specific";
/**
 * Organization entity - contains multiple stables
 * Represents the top-level organizational unit
 */
export interface Organization {
  id: string;
  name: string;
  description?: string;
  contactType: ContactType;
  primaryEmail: string;
  phoneNumber?: string;
  timezone: string;
  ownerId: string;
  ownerEmail: string;
  subscriptionTier: SubscriptionTier;
  stats: {
    stableCount: number;
    totalMemberCount: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
/**
 * Organization member with multi-role support
 * Links users to organizations with specific roles and permissions
 */
export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  userEmail: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  roles: OrganizationRole[];
  primaryRole: OrganizationRole;
  status: MembershipStatus;
  showInPlanning: boolean;
  stableAccess: StableAccessLevel;
  assignedStableIds?: string[];
  joinedAt: Timestamp;
  invitedBy: string;
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
  id: string;
  organizationId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  roles: OrganizationRole[];
  primaryRole: OrganizationRole;
  showInPlanning: boolean;
  stableAccess: StableAccessLevel;
  assignedStableIds?: string[];
  token: string;
  status: InviteStatus;
  expiresAt: Timestamp;
  invitedBy: string;
  invitedAt: Timestamp;
  respondedAt?: Timestamp;
  organizationName: string;
  inviterName: string;
}
/**
 * Display data for organization member list
 */
export interface OrganizationMemberDisplay extends OrganizationMember {
  fullName: string;
  initials: string;
  assignedStableNames?: string[];
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
  scope: VaccinationRuleScope;
  systemWide?: boolean;
  organizationId?: string;
  userId?: string;
  name: string;
  description?: string;
  periodMonths: number;
  periodDays: number;
  daysNotCompeting: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  /** @deprecated Use scope and organizationId instead */
  stableId?: string;
}
//# sourceMappingURL=organization.d.ts.map
