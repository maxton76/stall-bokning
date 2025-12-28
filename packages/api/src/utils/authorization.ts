import { db } from './firebase.js'

/**
 * Stable member role types
 * 'manager' - Can create schedules, invite members
 * 'member' - Can book shifts, view stable data
 */
export type StableMemberRole = 'manager' | 'member'

/**
 * Check if user owns a specific stable
 *
 * @param userId - The user's ID
 * @param stableId - The stable's ID
 * @returns Promise<boolean> - True if user is the stable owner
 */
export async function isStableOwner(
  userId: string,
  stableId: string
): Promise<boolean> {
  try {
    const stableDoc = await db.collection('stables').doc(stableId).get()
    if (!stableDoc.exists) {
      return false
    }
    const stable = stableDoc.data()
    return stable?.ownerId === userId
  } catch (error) {
    console.error('Error checking stable ownership:', error)
    return false
  }
}

/**
 * Get user's role in a specific stable
 * Returns 'owner' if user owns the stable
 * Returns 'manager' or 'member' if user is in stableMembers collection with active status
 * Returns null if user is not a member
 *
 * @param userId - The user's ID
 * @param stableId - The stable's ID
 * @returns Promise<'owner' | StableMemberRole | null>
 */
export async function getStableMemberRole(
  userId: string,
  stableId: string
): Promise<'owner' | StableMemberRole | null> {
  try {
    // Check if user is the owner first
    const isOwner = await isStableOwner(userId, stableId)
    if (isOwner) {
      return 'owner'
    }

    // Check stableMembers collection with composite key: {userId}_{stableId}
    const memberId = `${userId}_${stableId}`
    const memberDoc = await db.collection('stableMembers').doc(memberId).get()

    if (!memberDoc.exists) {
      return null
    }

    const member = memberDoc.data()

    // Only active members have access
    if (member.status !== 'active') {
      return null
    }

    return member.role as StableMemberRole
  } catch (error) {
    console.error('Error getting stable member role:', error)
    return null
  }
}

/**
 * Get full stable member document
 *
 * @param userId - The user's ID
 * @param stableId - The stable's ID
 * @returns Promise<any | null> - The member document data or null
 */
export async function getStableMember(
  userId: string,
  stableId: string
): Promise<any | null> {
  try {
    const memberId = `${userId}_${stableId}`
    const memberDoc = await db.collection('stableMembers').doc(memberId).get()

    if (!memberDoc.exists) {
      return null
    }

    return memberDoc.data()
  } catch (error) {
    console.error('Error getting stable member:', error)
    return null
  }
}

/**
 * Check if user can access stable data (read operations)
 * User must be owner, manager, or member with active status
 *
 * @param userId - The user's ID
 * @param stableId - The stable's ID
 * @returns Promise<boolean> - True if user has any access to the stable
 */
export async function canAccessStable(
  userId: string,
  stableId: string
): Promise<boolean> {
  const role = await getStableMemberRole(userId, stableId)
  return role !== null
}

/**
 * Check if user can manage stable settings
 * Requires: owner or manager role
 *
 * @param userId - The user's ID
 * @param stableId - The stable's ID
 * @returns Promise<boolean> - True if user can manage the stable
 */
export async function canManageStable(
  userId: string,
  stableId: string
): Promise<boolean> {
  const role = await getStableMemberRole(userId, stableId)
  return role === 'owner' || role === 'manager'
}

/**
 * Check if user can manage schedules for a stable
 * Requires: owner or manager role
 *
 * @param userId - The user's ID
 * @param stableId - The stable's ID
 * @returns Promise<boolean> - True if user can manage schedules
 */
export async function canManageSchedules(
  userId: string,
  stableId: string
): Promise<boolean> {
  // Same permissions as canManageStable
  return canManageStable(userId, stableId)
}

/**
 * Check if user can manage members (invite, remove, change roles)
 * Requires: owner or manager role
 *
 * @param userId - The user's ID
 * @param stableId - The stable's ID
 * @returns Promise<boolean> - True if user can manage members
 */
export async function canManageMembers(
  userId: string,
  stableId: string
): Promise<boolean> {
  // Same permissions as canManageStable
  return canManageStable(userId, stableId)
}

/**
 * Check if user is a system administrator
 *
 * @param userRole - The user's system role from JWT token
 * @returns boolean - True if user is system_admin
 */
export function isSystemAdmin(userRole: string): boolean {
  return userRole === 'system_admin'
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
  allowedRoles: string[]
): boolean {
  return allowedRoles.includes(userRole)
}
