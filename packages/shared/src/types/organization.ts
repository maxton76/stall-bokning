import { Timestamp } from 'firebase/firestore'

/**
 * Organization roles for multi-role permission system
 * Users can have multiple roles within an organization
 */
export type OrganizationRole =
  | 'administrator'    // Full organization access
  | 'veterinarian'     // Animal health services
  | 'dentist'          // Equine dental services
  | 'farrier'          // Hoof care services
  | 'customer'         // Horse owner/client
  | 'groom'            // Daily care staff
  | 'saddle_maker'     // Tack and saddle services
  | 'horse_owner'      // External horse owner
  | 'rider'            // Professional rider
  | 'inseminator'      // Breeding services

/**
 * Contact type for organizations and members
 */
export type ContactType = 'Personal' | 'Business'

/**
 * Subscription tiers for organizations
 */
export type SubscriptionTier = 'free' | 'professional' | 'enterprise'

/**
 * Membership status
 */
export type MembershipStatus = 'active' | 'inactive' | 'pending'

/**
 * Stable access level for organization members
 */
export type StableAccessLevel = 'all' | 'specific'

/**
 * Organization entity - contains multiple stables
 * Represents the top-level organizational unit
 */
export interface Organization {
  id: string
  name: string
  description?: string

  // Contact Information
  contactType: ContactType
  primaryEmail: string
  phoneNumber?: string

  // Timezone for scheduling
  timezone: string

  // Ownership
  ownerId: string               // Organization owner (must be stable_owner systemRole)
  ownerEmail: string            // Cached for display

  // Subscription
  subscriptionTier: SubscriptionTier

  // Statistics (denormalized for performance)
  stats: {
    stableCount: number
    totalMemberCount: number
  }

  // Metadata
  createdAt: Timestamp
  updatedAt: Timestamp
}

/**
 * Organization member with multi-role support
 * Links users to organizations with specific roles and permissions
 */
export interface OrganizationMember {
  id: string                    // Format: {userId}_{organizationId}
  organizationId: string
  userId: string

  // Cached user information
  userEmail: string
  firstName: string
  lastName: string
  phoneNumber?: string

  // Multi-role support - users can have multiple roles
  roles: OrganizationRole[]
  primaryRole: OrganizationRole  // Main role for display purposes

  // Status
  status: MembershipStatus

  // Planning visibility toggle
  showInPlanning: boolean        // Controls visibility in staff activity planning

  // Stable access control
  stableAccess: StableAccessLevel
  assignedStableIds?: string[]   // Only populated if stableAccess === 'specific'

  // Metadata
  joinedAt: Timestamp
  invitedBy: string              // User ID of inviter
  inviteAcceptedAt?: Timestamp
}

/**
 * Data required to create a new organization
 */
export interface CreateOrganizationData {
  name: string
  description?: string
  contactType: ContactType
  primaryEmail: string
  phoneNumber?: string
  timezone: string
}

/**
 * Data required to invite a new organization member
 */
export interface InviteOrganizationMemberData {
  email: string
  firstName?: string
  lastName?: string
  phoneNumber?: string
  roles: OrganizationRole[]
  primaryRole: OrganizationRole
  showInPlanning: boolean
  stableAccess: StableAccessLevel
  assignedStableIds?: string[]
}

/**
 * Display data for organization member list
 */
export interface OrganizationMemberDisplay extends OrganizationMember {
  fullName: string
  initials: string
  assignedStableNames?: string[] // Resolved stable names for display
}
