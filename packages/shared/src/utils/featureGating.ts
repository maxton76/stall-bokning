import type { Organization, SubscriptionTier } from "../types/organization.js";

/**
 * Feature gating utilities for organization type-based features
 * Personal organizations have limited features compared to business organizations
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
 * Based on organization type and subscription tier
 */
export function getMaxStables(org: Organization): number {
  if (org.organizationType === "personal") {
    return 1;
  }

  switch (org.subscriptionTier) {
    case "free":
      return 2;
    case "professional":
      return 10;
    case "enterprise":
      return Infinity;
    default:
      return 2; // Default to free tier limits
  }
}

/**
 * Check if an organization can create more stables
 * Considers both organization type and current stable count
 */
export function canCreateStable(org: Organization): boolean {
  if (org.organizationType === "personal") {
    return false; // Personal orgs have implicit stable only
  }

  const currentCount = org.stats?.stableCount ?? 0;
  const maxAllowed = getMaxStables(org);
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

export function getFeatureLimits(org: Organization): FeatureLimits {
  const isPersonal = org.organizationType === "personal";

  return {
    maxStables: getMaxStables(org),
    canInviteMembers: !isPersonal,
    canCreateOrgContacts: !isPersonal,
    canManageRoles: !isPersonal,
    canViewAnalytics: !isPersonal && org.subscriptionTier !== "free",
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
