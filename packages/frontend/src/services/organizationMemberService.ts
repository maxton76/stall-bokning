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
 * @param organizationId - Organization ID
 * @param inviterId - ID of user sending the invite
 * @param memberData - Member invitation data
 * @returns Promise with the created member ID
 */
export async function inviteOrganizationMember(
  organizationId: string,
  inviterId: string,
  memberData: InviteOrganizationMemberData & { userId: string }
): Promise<string> {
  const memberId = generateMemberId(memberData.userId, organizationId)

  const dataToSave = removeUndefined({
    organizationId,
    userId: memberData.userId,
    userEmail: memberData.email,
    firstName: memberData.firstName || '',
    lastName: memberData.lastName || '',
    phoneNumber: memberData.phoneNumber,
    roles: memberData.roles,
    primaryRole: memberData.primaryRole,
    status: 'pending' as const,
    showInPlanning: memberData.showInPlanning ?? true,
    stableAccess: memberData.stableAccess || 'all',
    assignedStableIds: memberData.assignedStableIds || [],
    joinedAt: Timestamp.now(),
    invitedBy: inviterId
  })

  const memberRef = doc(db, 'organizationMembers', memberId)
  await setDoc(memberRef, dataToSave)

  return memberId
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
 * @returns Promise that resolves when update is complete
 */
export async function updateMemberRoles(
  userId: string,
  organizationId: string,
  roles: OrganizationRole[],
  primaryRole: OrganizationRole
): Promise<void> {
  const memberId = generateMemberId(userId, organizationId)
  const memberRef = doc(db, 'organizationMembers', memberId)

  await updateDoc(memberRef, {
    roles,
    primaryRole
  })
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
