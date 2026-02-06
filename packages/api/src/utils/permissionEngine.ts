/**
 * Permission Engine - Single source of truth for permission checks.
 *
 * Resolves whether a user can perform a given PermissionAction within
 * an organization by combining:
 * 1. Bypass rules (org owner, system_admin)
 * 2. User's OrganizationRole(s)
 * 3. The effective PermissionMatrix (stored or default)
 */

import { db } from "./firebase.js";
import type { OrganizationRole } from "@equiduty/shared";
import {
  DEFAULT_PERMISSION_MATRIX,
  type PermissionAction,
  type PermissionMatrix,
} from "@equiduty/shared";

// ============================================
// TYPES
// ============================================

export interface UserOrgInfo {
  roles: OrganizationRole[];
  isOrgOwner: boolean;
  isActive: boolean;
  stableAccess?: "all" | "specific";
  assignedStableIds?: string[];
}

// ============================================
// CACHE
// ============================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const matrixCache = new Map<string, CacheEntry<PermissionMatrix>>();
const userOrgCache = new Map<string, CacheEntry<UserOrgInfo | null>>();

function getCached<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function setCache<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  value: T,
): void {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Invalidate cached permission data for an organization.
 * Call this when the permission matrix or membership changes.
 */
export function invalidatePermissionCache(organizationId: string): void {
  matrixCache.delete(organizationId);
  // Also clear any user-org entries for this org
  for (const key of userOrgCache.keys()) {
    if (key.endsWith(`_${organizationId}`)) {
      userOrgCache.delete(key);
    }
  }
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Get the effective permission matrix for an organization.
 * Returns the stored matrix if it exists, otherwise the default.
 */
export async function getEffectiveMatrix(
  organizationId: string,
): Promise<PermissionMatrix> {
  const cached = getCached(matrixCache, organizationId);
  if (cached) return cached;

  const orgDoc = await db.collection("organizations").doc(organizationId).get();
  const data = orgDoc.data();
  const stored = data?.permissionMatrix as PermissionMatrix | undefined;

  // Merge stored matrix over defaults so that any new actions added
  // to DEFAULT_PERMISSION_MATRIX are included even if the org has
  // an older stored matrix missing those keys.
  const matrix = stored
    ? { ...DEFAULT_PERMISSION_MATRIX, ...stored }
    : DEFAULT_PERMISSION_MATRIX;

  setCache(matrixCache, organizationId, matrix);
  return matrix;
}

/**
 * Get a user's organization roles and ownership status.
 * Returns null if the user has no relationship with the organization.
 */
export async function getUserOrgRoles(
  userId: string,
  organizationId: string,
): Promise<UserOrgInfo | null> {
  const cacheKey = `${userId}_${organizationId}`;
  const cached = getCached(userOrgCache, cacheKey);
  if (cached !== undefined) return cached;

  // Check organization ownership
  const orgDoc = await db.collection("organizations").doc(organizationId).get();
  if (!orgDoc.exists) {
    setCache(userOrgCache, cacheKey, null);
    return null;
  }

  const orgData = orgDoc.data()!;
  const isOrgOwner = orgData.ownerId === userId;

  // Check membership
  const memberDoc = await db
    .collection("organizationMembers")
    .doc(`${userId}_${organizationId}`)
    .get();

  if (!memberDoc.exists && !isOrgOwner) {
    setCache(userOrgCache, cacheKey, null);
    return null;
  }

  const memberData = memberDoc.exists ? memberDoc.data() : null;
  const roles: OrganizationRole[] = memberData?.roles ?? [];
  const isActive = isOrgOwner || memberData?.status === "active";

  const info: UserOrgInfo = {
    roles,
    isOrgOwner,
    isActive,
    stableAccess: memberData?.stableAccess,
    assignedStableIds: memberData?.assignedStableIds,
  };
  setCache(userOrgCache, cacheKey, info);
  return info;
}

/**
 * Check if a user has a specific permission in an organization.
 *
 * Bypass rules (hardcoded, not overridable):
 * - Organization owner (organizations.ownerId) always gets full access
 * - system_admin always gets full access
 *
 * @param userId - The user's ID
 * @param organizationId - The organization's ID
 * @param action - The permission action to check
 * @param context - Optional context (systemRole for system_admin bypass)
 */
export async function hasPermission(
  userId: string,
  organizationId: string,
  action: PermissionAction,
  context?: { systemRole?: string },
): Promise<boolean> {
  // Bypass: system_admin
  if (context?.systemRole === "system_admin") {
    return true;
  }

  // Get user's org info
  const userInfo = await getUserOrgRoles(userId, organizationId);
  if (!userInfo || !userInfo.isActive) {
    return false;
  }

  // Bypass: org owner
  if (userInfo.isOrgOwner) {
    return true;
  }

  // Matrix check
  const matrix = await getEffectiveMatrix(organizationId);
  const actionPerms = matrix[action];
  if (!actionPerms) {
    return false;
  }

  // Return true if ANY of the user's roles has the action set to true
  return userInfo.roles.some((role) => actionPerms[role] === true);
}

/**
 * Check multiple permissions at once.
 * Returns a record mapping each action to its result.
 */
export async function checkPermissions(
  userId: string,
  organizationId: string,
  actions: PermissionAction[],
  context?: { systemRole?: string },
): Promise<Record<PermissionAction, boolean>> {
  // Bypass: system_admin gets all
  if (context?.systemRole === "system_admin") {
    const result = {} as Record<PermissionAction, boolean>;
    for (const action of actions) {
      result[action] = true;
    }
    return result;
  }

  const userInfo = await getUserOrgRoles(userId, organizationId);
  if (!userInfo || !userInfo.isActive) {
    const result = {} as Record<PermissionAction, boolean>;
    for (const action of actions) {
      result[action] = false;
    }
    return result;
  }

  // Bypass: org owner gets all
  if (userInfo.isOrgOwner) {
    const result = {} as Record<PermissionAction, boolean>;
    for (const action of actions) {
      result[action] = true;
    }
    return result;
  }

  const matrix = await getEffectiveMatrix(organizationId);
  const result = {} as Record<PermissionAction, boolean>;

  for (const action of actions) {
    const actionPerms = matrix[action];
    result[action] = actionPerms
      ? userInfo.roles.some((role) => actionPerms[role] === true)
      : false;
  }

  return result;
}

/**
 * Resolve organizationId from a stableId by looking up the stable document.
 */
export async function resolveOrgIdFromStable(
  stableId: string,
): Promise<string | null> {
  const stableDoc = await db.collection("stables").doc(stableId).get();
  if (!stableDoc.exists) return null;
  return stableDoc.data()?.organizationId ?? null;
}

/**
 * Check if user has permission, resolving orgId from stableId.
 * Also verifies user has stable access (stableAccess: "all" or stable in assignedStableIds).
 */
export async function hasStablePermission(
  userId: string,
  stableId: string,
  action: PermissionAction,
  context?: { systemRole?: string },
): Promise<boolean> {
  // System admin bypass
  if (context?.systemRole === "system_admin") return true;

  const organizationId = await resolveOrgIdFromStable(stableId);
  if (!organizationId) return false;

  // Check org-level permission
  const allowed = await hasPermission(userId, organizationId, action, context);
  if (!allowed) return false;

  // Get user info to verify stable access (uses cache from hasPermission call above)
  const userInfo = await getUserOrgRoles(userId, organizationId);
  if (!userInfo || !userInfo.isActive) return false;

  // Org owner always has access to all stables
  if (userInfo.isOrgOwner) return true;

  // Check stable-level access from cached membership info.
  // Legacy members without stableAccess field default to "all".
  const access = userInfo.stableAccess ?? "all";
  if (access === "all") return true;
  if (access === "specific") {
    return (userInfo.assignedStableIds ?? []).includes(stableId);
  }

  return false;
}
