import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  writeBatch,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { updateTimestamps } from '@/utils/firestoreHelpers'
import { validateAndMapDocs, INVITATION_SCHEMA } from '@/utils/firestoreValidation'

export interface Invitation {
  id: string
  stableId: string
  stableName: string
  email: string
  firstName?: string          // For pre-populating invite
  lastName?: string           // For pre-populating invite
  role: 'manager' | 'member'
  status: 'pending' | 'accepted' | 'declined'
  createdAt: Timestamp
  expiresAt: Timestamp
  invitedBy: string
  invitedByName?: string
}

/**
 * Get all pending invitations for a user by email
 * Filters out expired invitations
 */
export async function getPendingInvitations(userEmail: string): Promise<Invitation[]> {
  const q = query(
    collection(db, 'invites'),
    where('email', '==', userEmail),
    where('status', '==', 'pending'),
    where('expiresAt', '>', Timestamp.now())
  )

  const snapshot = await getDocs(q)

  return validateAndMapDocs<Invitation>(snapshot, INVITATION_SCHEMA, {
    strict: false,  // Allow defaults for migration
    throwOnError: false  // Filter invalid invitations
  })
}

/**
 * Accept an invitation - creates stable member and updates invite atomically
 * Uses Firestore batch write to ensure transaction integrity
 * Validates invitation status before accepting
 */
export async function acceptInvitation(
  inviteId: string,
  userId: string,
  userEmail: string,
  firstName: string,
  lastName: string,
  stableId: string,
  stableName: string,
  role: 'manager' | 'member'
): Promise<void> {
  // Validation: Check invitation exists and is valid
  const inviteRef = doc(db, 'invites', inviteId)
  const inviteDoc = await getDoc(inviteRef)

  if (!inviteDoc.exists()) {
    throw new Error('Invitation not found')
  }

  const inviteData = inviteDoc.data()
  if (inviteData.status !== 'pending') {
    throw new Error('Invitation already processed')
  }

  if (inviteData.expiresAt.toDate() < new Date()) {
    throw new Error('Invitation expired')
  }

  // Create batch transaction
  const batch = writeBatch(db)

  // Create stable member document
  const memberRef = doc(db, 'stableMembers', `${userId}_${stableId}`)
  batch.set(memberRef, {
    stableId,
    stableName,
    userId,
    userEmail,
    firstName,
    lastName,
    role,
    status: 'active',
    joinedAt: Timestamp.now(),
    inviteAcceptedAt: Timestamp.now()
  })

  // Update invitation status with audit trail
  batch.update(inviteRef, {
    status: 'accepted',
    acceptedAt: Timestamp.now(),
    acceptedBy: userId,
    ...updateTimestamps(userId)
  })

  await batch.commit()
}

/**
 * Decline an invitation - updates invite status only
 * Includes audit trail with userId for tracking who declined
 */
export async function declineInvitation(
  inviteId: string,
  userId: string
): Promise<void> {
  const inviteRef = doc(db, 'invites', inviteId)
  await updateDoc(inviteRef, {
    status: 'declined',
    declinedAt: Timestamp.now(),
    declinedBy: userId,
    ...updateTimestamps(userId)
  })
}
