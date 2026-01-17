import { db } from "./firebase.js";

/**
 * Role types for stable access (derived from organization roles)
 * 'owner' - Stable owner (via stables.ownerId)
 * 'administrator' - Organization administrator with stable access
 * 'member' - Organization member with stable access
 */
export type StableMemberRole = "owner" | "administrator" | "member";

/**
 * Organization roles that grant management permissions
 */
const MANAGEMENT_ROLES = ["administrator"];

/**
 * Check if user owns a specific stable
 *
 * @param userId - The user's ID
 * @param stableId - The stable's ID
 * @returns Promise<boolean> - True if user is the stable owner
 */
export async function isStableOwner(
  userId: string,
  stableId: string,
): Promise<boolean> {
  try {
    const stableDoc = await db.collection("stables").doc(stableId).get();
    if (!stableDoc.exists) {
      return false;
    }
    const stable = stableDoc.data();
    return stable?.ownerId === userId;
  } catch (error) {
    console.error("Error checking stable ownership:", error);
    return false;
  }
}

/**
 * Get user's organization membership for a stable's organization
 * Returns null if user is not an active member or doesn't have access to the stable
 *
 * @param userId - The user's ID
 * @param stableId - The stable's ID
 * @returns Promise<any | null> - Organization member document or null
 */
export async function getOrganizationMemberForStable(
  userId: string,
  stableId: string,
): Promise<any | null> {
  try {
    // Get the stable to find its organization
    const stableDoc = await db.collection("stables").doc(stableId).get();
    if (!stableDoc.exists) {
      return null;
    }

    const stable = stableDoc.data();
    const organizationId = stable?.organizationId;

    // Stable must belong to an organization for membership checks
    if (!organizationId) {
      return null;
    }

    // Check organizationMembers collection
    const memberId = `${userId}_${organizationId}`;
    const memberDoc = await db
      .collection("organizationMembers")
      .doc(memberId)
      .get();

    if (!memberDoc.exists) {
      return null;
    }

    const member = memberDoc.data();

    // Only active members have access
    if (member?.status !== "active") {
      return null;
    }

    // Check stable access permissions
    if (member.stableAccess === "all") {
      return member;
    }

    // For 'specific' access, check if this stable is in assignedStableIds
    if (member.stableAccess === "specific") {
      const assignedStables = member.assignedStableIds || [];
      if (assignedStables.includes(stableId)) {
        return member;
      }
    }

    return null;
  } catch (error) {
    console.error("Error getting organization member for stable:", error);
    return null;
  }
}

/**
 * Get user's role in a specific stable
 * Returns 'owner' if user owns the stable
 * Returns 'administrator' if user is org admin with stable access
 * Returns 'member' if user is org member with stable access
 * Returns null if user has no access
 *
 * @param userId - The user's ID
 * @param stableId - The stable's ID
 * @returns Promise<StableMemberRole | null>
 */
export async function getStableMemberRole(
  userId: string,
  stableId: string,
): Promise<StableMemberRole | null> {
  try {
    // Check if user is the stable owner first
    const isOwner = await isStableOwner(userId, stableId);
    if (isOwner) {
      return "owner";
    }

    // Check organization membership with stable access
    const orgMember = await getOrganizationMemberForStable(userId, stableId);
    if (!orgMember) {
      return null;
    }

    // Check if user has administrator role in the organization
    const roles = orgMember.roles || [];
    const hasManagementRole = roles.some((role: string) =>
      MANAGEMENT_ROLES.includes(role),
    );

    return hasManagementRole ? "administrator" : "member";
  } catch (error) {
    console.error("Error getting stable member role:", error);
    return null;
  }
}

/**
 * Get full organization member document for a stable
 * (For backward compatibility with code expecting stable member data)
 *
 * @param userId - The user's ID
 * @param stableId - The stable's ID
 * @returns Promise<any | null> - The member document data or null
 */
export async function getStableMember(
  userId: string,
  stableId: string,
): Promise<any | null> {
  return getOrganizationMemberForStable(userId, stableId);
}

/**
 * Check if user can access stable data (read operations)
 * User must be owner or organization member with stable access
 *
 * @param userId - The user's ID
 * @param stableId - The stable's ID
 * @returns Promise<boolean> - True if user has any access to the stable
 */
export async function canAccessStable(
  userId: string,
  stableId: string,
): Promise<boolean> {
  const role = await getStableMemberRole(userId, stableId);
  return role !== null;
}

/**
 * Check if user can manage stable settings
 * Requires: owner or administrator role
 *
 * @param userId - The user's ID
 * @param stableId - The stable's ID
 * @returns Promise<boolean> - True if user can manage the stable
 */
export async function canManageStable(
  userId: string,
  stableId: string,
): Promise<boolean> {
  const role = await getStableMemberRole(userId, stableId);
  return role === "owner" || role === "administrator";
}

/**
 * Check if user can manage schedules for a stable
 * Requires: owner or administrator role
 *
 * @param userId - The user's ID
 * @param stableId - The stable's ID
 * @returns Promise<boolean> - True if user can manage schedules
 */
export async function canManageSchedules(
  userId: string,
  stableId: string,
): Promise<boolean> {
  // Same permissions as canManageStable
  return canManageStable(userId, stableId);
}

/**
 * Check if user can manage members (invite, remove, change roles)
 * Requires: owner or administrator role
 *
 * @param userId - The user's ID
 * @param stableId - The stable's ID
 * @returns Promise<boolean> - True if user can manage members
 */
export async function canManageMembers(
  userId: string,
  stableId: string,
): Promise<boolean> {
  // Same permissions as canManageStable
  return canManageStable(userId, stableId);
}

/**
 * Check if user is a system administrator
 *
 * @param userRole - The user's system role from JWT token
 * @returns boolean - True if user is system_admin
 */
export function isSystemAdmin(userRole: string): boolean {
  return userRole === "system_admin";
}

/**
 * Verify user has required system role
 *
 * @param userRole - The user's system role from JWT token
 * @param allowedRoles - Array of allowed system roles
 * @returns boolean - True if user has one of the allowed roles
 */
export function hasSystemRole(
  userRole: string,
  allowedRoles: string[],
): boolean {
  return allowedRoles.includes(userRole);
}

// ============================================
// ORGANIZATION-LEVEL AUTHORIZATION
// ============================================

/**
 * Check if user has active access to an organization
 * User must be either an active member or the organization owner
 *
 * @param userId - The user's ID
 * @param organizationId - The organization's ID
 * @returns Promise<boolean> - True if user has access to the organization
 */
export async function hasOrganizationAccess(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  try {
    // Check organization membership
    const memberDoc = await db
      .collection("organizationMembers")
      .doc(`${userId}_${organizationId}`)
      .get();

    if (memberDoc.exists) {
      const data = memberDoc.data();
      if (data?.status === "active") {
        return true;
      }
    }

    // Also check if user is organization owner
    const orgDoc = await db
      .collection("organizations")
      .doc(organizationId)
      .get();
    return orgDoc.exists && orgDoc.data()?.ownerId === userId;
  } catch (error) {
    console.error("Error checking organization access:", error);
    return false;
  }
}

/**
 * Check if user is an admin of an organization
 * User must be the organization owner or have admin/owner role as a member
 *
 * @param userId - The user's ID
 * @param organizationId - The organization's ID
 * @returns Promise<boolean> - True if user is an organization admin
 */
export async function isOrganizationAdmin(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  try {
    // Check if user is organization owner
    const orgDoc = await db
      .collection("organizations")
      .doc(organizationId)
      .get();
    if (orgDoc.exists && orgDoc.data()?.ownerId === userId) {
      return true;
    }

    // Check if user has admin role in organization
    const memberDoc = await db
      .collection("organizationMembers")
      .doc(`${userId}_${organizationId}`)
      .get();

    if (memberDoc.exists) {
      const data = memberDoc.data();
      const roles = data?.roles || [];
      return (
        data?.status === "active" &&
        (roles.includes("admin") ||
          roles.includes("owner") ||
          roles.includes("administrator"))
      );
    }

    return false;
  } catch (error) {
    console.error("Error checking organization admin status:", error);
    return false;
  }
}

/**
 * Check if user can access organization (read operations)
 * Alias for hasOrganizationAccess for naming consistency with stable functions
 *
 * @param userId - The user's ID
 * @param organizationId - The organization's ID
 * @returns Promise<boolean> - True if user has access to the organization
 */
export async function canAccessOrganization(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  return hasOrganizationAccess(userId, organizationId);
}

/**
 * Check if user can manage organization (admin operations)
 * Alias for isOrganizationAdmin for naming consistency with stable functions
 *
 * @param userId - The user's ID
 * @param organizationId - The organization's ID
 * @returns Promise<boolean> - True if user can manage the organization
 */
export async function canManageOrganization(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  return isOrganizationAdmin(userId, organizationId);
}

// ============================================
// RECURRING ACTIVITY AUTHORIZATION
// ============================================

/**
 * Check if user can manage recurring activities for a stable
 * Requires: system_admin, owner, or manager role in organization
 *
 * @param stableId - The stable's ID
 * @param userId - The user's ID
 * @param userRole - The user's system role from JWT token
 * @returns Promise<boolean> - True if user can manage recurring activities
 */
export async function canManageRecurring(
  stableId: string,
  userId: string,
  userRole: string,
): Promise<boolean> {
  try {
    // System admin can manage everything
    if (userRole === "system_admin") return true;

    // Check if user is stable owner
    const stableDoc = await db.collection("stables").doc(stableId).get();
    if (!stableDoc.exists) return false;

    const stable = stableDoc.data();
    if (stable?.ownerId === userId) return true;

    // Check for manager role in organization membership
    const organizationId = stable?.organizationId;
    if (!organizationId) return false;

    const memberId = `${userId}_${organizationId}`;
    const memberDoc = await db
      .collection("organizationMembers")
      .doc(memberId)
      .get();

    if (!memberDoc.exists) return false;

    const member = memberDoc.data();
    if (member?.status !== "active") return false;

    // Check if user has manager or admin role
    const roles = member.roles || [];
    return (
      roles.includes("manager") ||
      roles.includes("admin") ||
      roles.includes("administrator")
    );
  } catch (error) {
    console.error(
      "Error checking recurring activity management access:",
      error,
    );
    return false;
  }
}

/**
 * Check if user has access to a stable
 * Supports system admin override
 *
 * @param stableId - The stable's ID
 * @param userId - The user's ID
 * @param userRole - The user's system role from JWT token
 * @returns Promise<boolean> - True if user has any access to the stable
 */
export async function hasStableAccess(
  stableId: string,
  userId: string,
  userRole: string,
): Promise<boolean> {
  // System admin can access everything
  if (userRole === "system_admin") return true;

  // Use standard access check
  return canAccessStable(userId, stableId);
}
