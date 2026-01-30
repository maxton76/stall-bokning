import type { Organization } from "../types/organization.js";
import type {
  SubscriptionTier,
  OrganizationSubscription,
} from "../types/admin.js";
import { TIER_LIMITS, TIER_MODULES } from "../constants/tierDefaults.js";

/**
 * Feature gating utilities for organization type-based features
 * Personal organizations have limited features compared to business organizations
 *
 * Functions accept an optional `subscription` parameter to read custom limits
 * from the org's subscription object (set by admin). Falls back to hardcoded
 * tier defaults based on `org.subscriptionTier`.
 */

/**
 * Check if an organization can invite members
 * Personal organizations cannot have additional members
 */
export function canInviteMembers(org: Organization): boolean {
  return org.organizationType === "business";
}

/**
 * Check if an organization can create organization-level contacts
 * Personal organizations can only create user-level (private) contacts
 */
export function canCreateOrgContacts(org: Organization): boolean {
  return org.organizationType === "business";
}

/**
 * Check if an organization can create multiple stables
 * Personal organizations are limited to one implicit stable
 */
export function canCreateMultipleStables(org: Organization): boolean {
  return org.organizationType === "business";
}

/**
 * Get the maximum number of stables allowed for an organization
 * Uses subscription limits if available, otherwise falls back to tier defaults
 */
export function getMaxStables(
  org: Organization,
  subscription?: OrganizationSubscription,
): number {
  if (org.organizationType === "personal") {
    return 1;
  }

  // Use subscription limits if provided
  if (subscription?.limits?.stables !== undefined) {
    return subscription.limits.stables === -1
      ? Infinity
      : subscription.limits.stables;
  }

  // Fall back to tier defaults
  const tierLimits = TIER_LIMITS[org.subscriptionTier];
  if (tierLimits) {
    return tierLimits.stables === -1 ? Infinity : tierLimits.stables;
  }

  return 1; // Default to free tier limits
}

/**
 * Check if an organization can create more stables
 * Considers both organization type and current stable count
 */
export function canCreateStable(
  org: Organization,
  subscription?: OrganizationSubscription,
): boolean {
  if (org.organizationType === "personal") {
    return false; // Personal orgs have implicit stable only
  }

  const currentCount = org.stats?.stableCount ?? 0;
  const maxAllowed = getMaxStables(org, subscription);
  return currentCount < maxAllowed;
}

/**
 * Get feature limitations for display in upgrade prompts
 */
export interface FeatureLimits {
  maxStables: number;
  canInviteMembers: boolean;
  canCreateOrgContacts: boolean;
  canManageRoles: boolean;
  canViewAnalytics: boolean;
}

export function getFeatureLimits(
  org: Organization,
  subscription?: OrganizationSubscription,
): FeatureLimits {
  const isPersonal = org.organizationType === "personal";

  // Check analytics module from subscription or tier defaults
  let hasAnalytics = false;
  if (subscription?.modules?.analytics !== undefined) {
    hasAnalytics = subscription.modules.analytics;
  } else {
    const tierModules = TIER_MODULES[org.subscriptionTier];
    hasAnalytics = tierModules?.analytics ?? false;
  }

  return {
    maxStables: getMaxStables(org, subscription),
    canInviteMembers: !isPersonal,
    canCreateOrgContacts: !isPersonal,
    canManageRoles: !isPersonal,
    canViewAnalytics: !isPersonal && hasAnalytics,
  };
}

/**
 * Get upgrade benefits - what a personal org would gain by upgrading
 */
export interface UpgradeBenefit {
  feature: string;
  description: string;
  icon: string;
}

export function getUpgradeBenefits(): UpgradeBenefit[] {
  return [
    {
      feature: "members",
      description: "Invite team members to help manage your stables",
      icon: "users",
    },
    {
      feature: "stables",
      description: "Create multiple stables to organize your horses",
      icon: "building",
    },
    {
      feature: "contacts",
      description: "Share contacts with your entire organization",
      icon: "contact",
    },
    {
      feature: "roles",
      description: "Assign roles and permissions to team members",
      icon: "shield",
    },
    {
      feature: "analytics",
      description: "View detailed analytics and reports",
      icon: "chart",
    },
  ];
}
