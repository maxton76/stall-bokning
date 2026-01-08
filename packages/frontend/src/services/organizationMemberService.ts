import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { authFetchJSON } from '@/utils/authFetch'
import type {
  OrganizationMember,
  InviteOrganizationMemberData,
  OrganizationRole
} from '../../../shared/src/types/organization'
import { mapDocsToObjects, removeUndefined } from '@/utils/firestoreHelpers'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate member document ID from userId and organizationId
 * @param userId - User ID
 * @param organizationId - Organization ID
 * @returns Member document ID in format {userId}_{organizationId}
 */
function generateMemberId(userId: string, organizationId: string): string {
  return `${userId}_${organizationId}`
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Invite a member to an organization
 * Calls backend API which handles both existing and non-existing users
 * @param organizationId - Organization ID
 * @param inviterId - ID of user sending the invite (not used, kept for compatibility)
 * @param memberData - Member invitation data
 * @returns Promise with the API response (type: 'existing_user' | 'new_user')
 */
export async function inviteOrganizationMember(
  organizationId: string,
  inviterId: string,
  memberData: InviteOrganizationMemberData
): Promise<any> {
  return await authFetchJSON(`${import.meta.env.VITE_API_URL}/organizations/${organizationId}/members`, {
    method: 'POST',
    body: JSON.stringify(removeUndefined({
      email: memberData.email,
      firstName: memberData.firstName,
      lastName: memberData.lastName,
      phoneNumber: memberData.phoneNumber,
      roles: memberData.roles,
      primaryRole: memberData.primaryRole,
      showInPlanning: memberData.showInPlanning ?? true,
      stableAccess: memberData.stableAccess || 'all',
      assignedStableIds: memberData.assignedStableIds || []
    }))
  })
}

/**
 * Get a single organization member
 * @param userId - User ID
 * @param organizationId - Organization ID
 * @returns Promise with member data or null if not found
 */
export async function getOrganizationMember(
  userId: string,
  organizationId: string
): Promise<OrganizationMember | null> {
  const memberId = generateMemberId(userId, organizationId)
  const memberRef = doc(db, 'organizationMembers', memberId)
  const memberSnap = await getDoc(memberRef)

  if (!memberSnap.exists()) return null

  return {
    id: memberSnap.id,
    ...memberSnap.data()
  } as OrganizationMember
}

/**
 * Get all members of an organization
 * @param organizationId - Organization ID
 * @returns Promise with array of organization members
 */
export async function getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
  const membersQuery = query(
    collection(db, 'organizationMembers'),
    where('organizationId', '==', organizationId)
  )

  const snapshot = await getDocs(membersQuery)
  return mapDocsToObjects<OrganizationMember>(snapshot)
}

/**
 * Get all active members of an organization
 * @param organizationId - Organization ID
 * @returns Promise with array of active organization members
 */
export async function getActiveOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
  const membersQuery = query(
    collection(db, 'organizationMembers'),
    where('organizationId', '==', organizationId),
    where('status', '==', 'active')
  )

  const snapshot = await getDocs(membersQuery)
  return mapDocsToObjects<OrganizationMember>(snapshot)
}

/**
 * Update organization member roles and settings
 * @param userId - User ID
 * @param organizationId - Organization ID
 * @param updates - Partial member data to update
 * @returns Promise that resolves when update is complete
 */
export async function updateOrganizationMember(
  userId: string,
  organizationId: string,
  updates: Partial<Omit<OrganizationMember, 'id' | 'userId' | 'organizationId' | 'joinedAt' | 'invitedBy'>>
): Promise<void> {
  const memberId = generateMemberId(userId, organizationId)
  const memberRef = doc(db, 'organizationMembers', memberId)

  const dataToUpdate = removeUndefined(updates)
  await updateDoc(memberRef, dataToUpdate)
}

/**
 * Update member roles
 * @param userId - User ID
 * @param organizationId - Organization ID
 * @param roles - Array of roles to assign
 * @param primaryRole - Primary role
 * @param currentUserId - User making the change (for audit logging)
 * @returns Promise that resolves when update is complete
 */
export async function updateMemberRoles(
  userId: string,
  organizationId: string,
  roles: OrganizationRole[],
  primaryRole: OrganizationRole,
  currentUserId?: string
): Promise<void> {
  const memberId = generateMemberId(userId, organizationId)
  const memberRef = doc(db, 'organizationMembers', memberId)

  // Get existing member data for audit logging
  const existingMember = await getOrganizationMember(userId, organizationId)
  const previousRoles = existingMember?.roles || []

  // Update member roles
  await updateDoc(memberRef, {
    roles,
    primaryRole
  })

  // Log role change (non-blocking)
  if (currentUserId && existingMember) {
    const { logRoleChange } = await import('./auditLogService')
    logRoleChange(
      memberId,
      existingMember.email || '',
      organizationId,
      existingMember.organizationName || '',
      {
        memberName: `${existingMember.firstName || ''} ${existingMember.lastName || ''}`.trim(),
        previousRoles,
        newRoles: roles,
        addedRoles: roles.filter(r => !previousRoles.includes(r)),
        removedRoles: previousRoles.filter(r => !roles.includes(r))
      },
      currentUserId
    ).catch(err => {
      console.error('Audit log failed:', err)
    })
  }
}

/**
 * Update member status (pending, active, inactive)
 * @param userId - User ID
 * @param organizationId - Organization ID
 * @param status - New status
 * @returns Promise that resolves when update is complete
 */
export async function updateMemberStatus(
  userId: string,
  organizationId: string,
  status: 'active' | 'inactive' | 'pending'
): Promise<void> {
  const memberId = generateMemberId(userId, organizationId)
  const memberRef = doc(db, 'organizationMembers', memberId)

  const updates: Record<string, unknown> = { status }

  // If activating, add inviteAcceptedAt timestamp
  if (status === 'active') {
    updates.inviteAcceptedAt = Timestamp.now()
  }

  await updateDoc(memberRef, updates)
}

/**
 * Remove a member from an organization
 * @param userId - User ID
 * @param organizationId - Organization ID
 * @returns Promise that resolves when delete is complete
 */
export async function removeOrganizationMember(
  userId: string,
  organizationId: string
): Promise<void> {
  const memberId = generateMemberId(userId, organizationId)
  const memberRef = doc(db, 'organizationMembers', memberId)
  await deleteDoc(memberRef)
}

/**
 * Get all organizations where user is a member
 * @param userId - User ID
 * @returns Promise with array of organization IDs
 */
export async function getUserOrganizationIds(userId: string): Promise<string[]> {
  const membersQuery = query(
    collection(db, 'organizationMembers'),
    where('userId', '==', userId),
    where('status', '==', 'active')
  )

  const snapshot = await getDocs(membersQuery)
  return snapshot.docs.map(doc => doc.data().organizationId)
}
