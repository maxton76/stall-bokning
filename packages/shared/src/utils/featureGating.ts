import type { Organization } from "../types/organization.js";
import type {
  SubscriptionLimits,
  ModuleFlags,
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
 *
 * An optional `tierLimits` / `tierModules` parameter allows callers to pass
 * dynamically-loaded tier data instead of relying on the deprecated constants.
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
  tierLimits?: Record<string, SubscriptionLimits>,
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

  // Fall back to tier defaults (dynamic or static)
  const limitsMap = tierLimits ?? TIER_LIMITS;
  const limits = limitsMap[org.subscriptionTier];
  if (limits) {
    return limits.stables === -1 ? Infinity : limits.stables;
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
  tierLimits?: Record<string, SubscriptionLimits>,
): boolean {
  if (org.organizationType === "personal") {
    return false; // Personal orgs have implicit stable only
  }

  const currentCount = org.stats?.stableCount ?? 0;
  const maxAllowed = getMaxStables(org, subscription, tierLimits);
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
  tierModules?: Record<string, ModuleFlags>,
  tierLimits?: Record<string, SubscriptionLimits>,
): FeatureLimits {
  const isPersonal = org.organizationType === "personal";

  // Check analytics module from subscription or tier defaults
  let hasAnalytics = false;
  if (subscription?.modules?.analytics !== undefined) {
    hasAnalytics = subscription.modules.analytics;
  } else {
    const modulesMap = tierModules ?? TIER_MODULES;
    const modules = modulesMap[org.subscriptionTier];
    hasAnalytics = modules?.analytics ?? false;
  }

  return {
    maxStables: getMaxStables(org, subscription, tierLimits),
    canInviteMembers: !isPersonal,
    canCreateOrgContacts: !isPersonal,
    canManageRoles: !isPersonal,
    canViewAnalytics: !isPersonal && hasAnalytics,
  };
}

/**
 * Get the maximum number of support contacts allowed for an organization.
 * Uses subscription limits if available, otherwise falls back to tier defaults.
 */
export function getMaxSupportContacts(
  org: Organization,
  subscription?: OrganizationSubscription,
  tierLimits?: Record<string, SubscriptionLimits>,
): number {
  // Use subscription limits if provided
  if (subscription?.limits?.supportContacts !== undefined) {
    return subscription.limits.supportContacts === -1
      ? Infinity
      : subscription.limits.supportContacts;
  }

  // Fall back to tier defaults (dynamic or static)
  const limitsMap = tierLimits ?? TIER_LIMITS;
  const limits = limitsMap[org.subscriptionTier];
  if (limits?.supportContacts !== undefined) {
    return limits.supportContacts === -1 ? Infinity : limits.supportContacts;
  }

  return 0; // Default to no support contacts
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
