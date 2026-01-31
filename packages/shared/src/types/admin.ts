import type { Timestamp } from "firebase/firestore";

/**
 * Subscription tier levels.
 * Widened to `string` to support dynamic/custom tiers created via admin.
 * Built-in tiers: "free", "standard", "pro", "enterprise".
 */
export type SubscriptionTier = string;

/**
 * Numeric limits for organization subscriptions
 * -1 = unlimited
 */
export interface SubscriptionLimits {
  members: number;
  stables: number;
  horses: number;
  routineTemplates: number;
  routineSchedules: number;
  feedingPlans: number;
  facilities: number;
  contacts: number;
  supportContacts: number;
}

/**
 * Module flags - each enables/disables an entire section or capability
 */
export interface ModuleFlags {
  // Standard+ modules
  analytics: boolean;
  selectionProcess: boolean;
  locationHistory: boolean;
  photoEvidence: boolean;
  // Pro+ modules
  leaveManagement: boolean;
  inventory: boolean;
  lessons: boolean;
  staffMatrix: boolean;
  advancedPermissions: boolean;
  integrations: boolean;
  manure: boolean;
  aiAssistant: boolean;
  supportAccess: boolean;
}

/**
 * Business add-ons (purchasable by any tier)
 */
export interface SubscriptionAddons {
  portal: boolean;
  invoicing: boolean;
}

/**
 * Organization subscription configuration
 * Stored on the organization document
 */
export interface OrganizationSubscription {
  tier: SubscriptionTier;
  limits: SubscriptionLimits;
  modules: ModuleFlags;
  addons: SubscriptionAddons;
  /** For enterprise custom deals or trials */
  overrides?: Record<string, boolean | number>;
}

/**
 * Tier definition - what each tier includes by default
 * Stored in tierDefinitions Firestore collection
 */
export interface TierDefinition {
  tier: SubscriptionTier;
  name: string;
  description: string;
  /** Monthly price in SEK (0 for free) */
  price: number;
  limits: SubscriptionLimits;
  modules: ModuleFlags;
  addons: SubscriptionAddons;
  /** Whether tier is active for new subscriptions */
  enabled?: boolean;
  /** Whether tier requires Stripe billing */
  isBillable?: boolean;
  /** Display order (lower = first) */
  sortOrder?: number;
  /** Hidden tiers are admin-only assignment */
  visibility?: "public" | "hidden";
  /** Feature bullet points for pricing display (i18n keys or raw strings) */
  features?: string[];
  /** Mark as "popular" for pricing page highlight */
  popular?: boolean;
  /** Whether this is the system default tier assigned to new organizations */
  isDefault?: boolean;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

/**
 * Public tier definition — stripped of admin metadata.
 * Returned by the public GET /tiers endpoint.
 */
export interface TierDefinitionPublic {
  tier: string;
  name: string;
  description: string;
  price: number;
  limits: SubscriptionLimits;
  modules: ModuleFlags;
  addons: SubscriptionAddons;
  sortOrder: number;
  features?: string[];
  popular?: boolean;
  isBillable?: boolean;
  isDefault?: boolean;
}

/**
 * Admin dashboard metrics (initially mocked)
 */
export interface AdminDashboardMetrics {
  totalOrganizations: number;
  totalUsers: number;
  totalHorses: number;
  activeSubscriptions: Record<string, number>;
  mrr: number;
  newSignups30d: number;
  activeUsers7d: number;
  openSupportTickets: number;
}

/**
 * Organization summary for admin list view
 */
export interface AdminOrganizationSummary {
  id: string;
  name: string;
  tier: SubscriptionTier;
  memberCount: number;
  horseCount: number;
  stableCount: number;
  createdAt: Timestamp;
  ownerEmail?: string;
}

/**
 * Organization detail for admin view (extends summary)
 */
export interface AdminOrganizationDetail extends AdminOrganizationSummary {
  subscription: OrganizationSubscription;
  ownerId: string;
  ownerName?: string;
}

/**
 * User summary for admin list view
 */
export interface AdminUserSummary {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  systemRole: string;
  organizationCount: number;
  lastActive?: Timestamp;
  createdAt: Timestamp;
  disabled?: boolean;
}

/**
 * User detail for admin view
 */
export interface AdminUserDetail extends AdminUserSummary {
  organizations: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

/**
 * Paginated response wrapper for admin list endpoints
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
