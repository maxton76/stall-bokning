import { db } from "./firebase.js";

/**
 * Get all stable IDs the user has access to
 * Used for filtering queries to only authorized data
 *
 * @param userId - The user's ID
 * @returns Promise<string[]> - Array of accessible stableIds
 */
export async function getUserAccessibleStableIds(
  userId: string,
): Promise<string[]> {
  const stableIds: Set<string> = new Set();

  // Get stables the user owns
  const ownedStables = await db
    .collection("stables")
    .where("ownerId", "==", userId)
    .get();
  ownedStables.docs.forEach((doc) => stableIds.add(doc.id));

  // Get user's organization memberships
  const memberships = await db
    .collection("organizationMembers")
    .where("userId", "==", userId)
    .where("status", "==", "active")
    .get();

  // For each membership, get accessible stables
  for (const memberDoc of memberships.docs) {
    const member = memberDoc.data();
    const organizationId = member.organizationId;

    if (member.stableAccess === "all") {
      // Get all stables in this organization
      const orgStables = await db
        .collection("stables")
        .where("organizationId", "==", organizationId)
        .get();
      orgStables.docs.forEach((doc) => stableIds.add(doc.id));
    } else if (member.stableAccess === "specific" && member.assignedStableIds) {
      // Add specific assigned stables
      member.assignedStableIds.forEach((id: string) => stableIds.add(id));
    }
  }

  return Array.from(stableIds);
}

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
 * Check if user can manage selection processes for a stable
 * Requires: owner, administrator, or schedule_planner role
 *
 * @param userId - The user's ID
 * @param stableId - The stable's ID
 * @returns Promise<boolean> - True if user can manage selection processes
 */
export async function canManageSelectionProcesses(
  userId: string,
  stableId: string,
): Promise<boolean> {
  try {
    // Check if user is stable owner first
    const isOwner = await isStableOwner(userId, stableId);
    if (isOwner) {
      return true;
    }

    // Get organization member data for stable
    const orgMember = await getOrganizationMemberForStable(userId, stableId);
    if (!orgMember) {
      return false;
    }

    // Check if user has administrator or schedule_planner role
    const roles = orgMember.roles || [];
    return (
      roles.includes("administrator") || roles.includes("schedule_planner")
    );
  } catch (error) {
    console.error("Error checking selection process management access:", error);
    return false;
  }
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

// ============================================
// HORSE-LEVEL AUTHORIZATION
// ============================================

/**
 * Check if user can access a horse
 * User must have access to the stable that owns the horse
 *
 * @param horseId - The horse's ID
 * @param userId - The user's ID
 * @returns Promise<boolean> - True if user has access to the horse
 */
export async function canAccessHorse(
  horseId: string,
  userId: string,
): Promise<boolean> {
  try {
    // Get the horse document to find its stable
    const horseDoc = await db.collection("horses").doc(horseId).get();
    if (!horseDoc.exists) {
      return false;
    }

    const horseData = horseDoc.data();
    const stableId = horseData?.currentStableId; // FIXED: was stableId, should be currentStableId

    // Horse must belong to a stable
    if (!stableId) {
      // If horse has no stable, check if user is the owner
      return horseData?.ownerId === userId;
    }

    // Check if user has access to the stable
    return canAccessStable(userId, stableId);
  } catch (error) {
    console.error("Error checking horse access:", error);
    return false;
  }
}

// ============================================
// HORSE FIELD-LEVEL RBAC
// ============================================

/**
 * Access level for horse data based on user's role
 * - public: Basic public info (name, breed, color)
 * - basic_care: Daily care info (instructions, equipment)
 * - professional: Professional services data (medical, hoof care)
 * - management: Administrative data (owner info, full records)
 * - owner: Full access to all fields
 */
export type HorseAccessLevel =
  | "public"
  | "basic_care"
  | "professional"
  | "management"
  | "owner";

/**
 * Context object containing user's access level and role information for a specific horse
 */
export interface HorseAccessContext {
  userId: string;
  systemRole: string;
  isOwner: boolean;
  organizationRoles: string[];
  stableAccess: "all" | "specific";
  accessLevel: HorseAccessLevel;
  accessSource?: "ownership" | "placement" | "stable"; // How user gained access
  placementDate?: Date; // For history visibility filtering
}

/**
 * Determine access level based on organization roles and system role
 * Higher access levels include all lower-level permissions
 *
 * @param roles - User's organization roles
 * @param systemRole - User's system-level role
 * @param isStableOwner - Whether user owns the stable
 * @returns HorseAccessLevel - Determined access level
 */
export function determineAccessLevel(
  roles: string[],
  systemRole: string,
  isStableOwner: boolean,
): HorseAccessLevel {
  // System admin and stable owners get management level
  if (systemRole === "system_admin" || isStableOwner) {
    return "management";
  }

  // Administrator role gets management level
  if (roles.includes("administrator")) {
    return "management";
  }

  // Professional services roles get professional level
  if (roles.some((r) => ["veterinarian", "dentist", "farrier"].includes(r))) {
    return "professional";
  }

  // Daily care staff get basic_care level
  if (roles.some((r) => ["groom", "rider", "customer"].includes(r))) {
    return "basic_care";
  }

  // Default to public level for all other roles
  return "public";
}

/**
 * Get user's access context for a specific horse
 * Determines what level of data the user can see based on ownership, placement, and role
 *
 * Access hierarchy:
 * 1. Horse owner (ownerId) → full access (Level 5: owner)
 * 2. Owner's organization member → full access based on role
 * 3. Placement organization member → access from placementDate onwards
 * 4. Current stable member → access based on role
 *
 * @param horseId - The horse's ID
 * @param userId - The user's ID
 * @param systemRole - The user's system role
 * @returns Promise<HorseAccessContext | null> - Access context or null if no access
 */
export async function getHorseAccessContext(
  horseId: string,
  userId: string,
  systemRole: string,
): Promise<HorseAccessContext | null> {
  try {
    // Get horse data
    const horseDoc = await db.collection("horses").doc(horseId).get();
    if (!horseDoc.exists) {
      return null;
    }

    const horse = horseDoc.data();
    if (!horse) {
      return null;
    }

    // Check ownership - owners get full access
    const isOwner = horse.ownerId === userId;
    if (isOwner) {
      return {
        userId,
        systemRole,
        isOwner: true,
        organizationRoles: [],
        stableAccess: "all",
        accessLevel: "owner",
        accessSource: "ownership",
      };
    }

    // Check if user is a member of the owner's organization
    if (horse.ownerOrganizationId) {
      const ownerOrgMemberDoc = await db
        .collection("organizationMembers")
        .doc(`${userId}_${horse.ownerOrganizationId}`)
        .get();

      if (ownerOrgMemberDoc.exists) {
        const ownerOrgMember = ownerOrgMemberDoc.data();
        if (ownerOrgMember?.status === "active") {
          // User is member of owner's organization - full access based on role
          const ownerOrgDoc = await db
            .collection("organizations")
            .doc(horse.ownerOrganizationId)
            .get();
          const isOrgOwner =
            ownerOrgDoc.exists && ownerOrgDoc.data()?.ownerId === userId;

          const accessLevel = determineAccessLevel(
            ownerOrgMember.roles || [],
            systemRole,
            isOrgOwner,
          );

          return {
            userId,
            systemRole,
            isOwner: false,
            organizationRoles: ownerOrgMember.roles || [],
            stableAccess: ownerOrgMember.stableAccess || "all",
            accessLevel,
            accessSource: "ownership",
          };
        }
      }
    }

    // Check if user is a member of the placement organization
    if (horse.placementOrganizationId) {
      const placementOrgMemberDoc = await db
        .collection("organizationMembers")
        .doc(`${userId}_${horse.placementOrganizationId}`)
        .get();

      if (placementOrgMemberDoc.exists) {
        const placementOrgMember = placementOrgMemberDoc.data();
        if (placementOrgMember?.status === "active") {
          // User is member of placement organization - access from placementDate
          const placementOrgDoc = await db
            .collection("organizations")
            .doc(horse.placementOrganizationId)
            .get();
          const isOrgOwner =
            placementOrgDoc.exists &&
            placementOrgDoc.data()?.ownerId === userId;

          const accessLevel = determineAccessLevel(
            placementOrgMember.roles || [],
            systemRole,
            isOrgOwner,
          );

          return {
            userId,
            systemRole,
            isOwner: false,
            organizationRoles: placementOrgMember.roles || [],
            stableAccess: placementOrgMember.stableAccess || "all",
            accessLevel,
            accessSource: "placement",
            placementDate: horse.placementDate?.toDate(),
          };
        }
      }
    }

    // Fall back to stable access for non-owners (legacy behavior)
    if (!horse.currentStableId) {
      // Unassigned horses are owner-only (or org member)
      return null;
    }

    // Get organization member data for stable
    const orgMember = await getOrganizationMemberForStable(
      userId,
      horse.currentStableId,
    );

    if (!orgMember) {
      // No access to this stable
      return null;
    }

    // Check if user owns the stable
    const stableDoc = await db
      .collection("stables")
      .doc(horse.currentStableId)
      .get();
    const isStableOwner =
      stableDoc.exists && stableDoc.data()?.ownerId === userId;

    // Determine access level based on roles
    const accessLevel = determineAccessLevel(
      orgMember.roles || [],
      systemRole,
      isStableOwner,
    );

    return {
      userId,
      systemRole,
      isOwner: false,
      organizationRoles: orgMember.roles || [],
      stableAccess: orgMember.stableAccess,
      accessLevel,
      accessSource: "stable",
    };
  } catch (error) {
    console.error("Error getting horse access context:", error);
    return null;
  }
}
