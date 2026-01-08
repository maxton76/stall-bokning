import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc, Timestamp, updateDoc, increment } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { formatFullName } from '@/lib/nameUtils'
import { createOrganization } from './organizationService'

export interface RegisterUserData {
  email: string
  password: string
  firstName: string
  lastName: string
}

/**
 * Register a new user with firstName and lastName
 * Creates both Firebase Auth user and Firestore user document
 * Automatically creates a default organization for the user
 *
 * @param data - User registration data
 * @throws Error if registration fails
 */
export async function registerUser(data: RegisterUserData): Promise<string> {
  // 1. Create Firebase Auth user
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    data.email,
    data.password
  )
  const user = userCredential.user

  try {
    // 2. Update Firebase Auth profile with full name
    await updateProfile(user, {
      displayName: formatFullName({ firstName: data.firstName, lastName: data.lastName })
    })

    // 3. Create Firestore user document
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      systemRole: 'member',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    })

    // 4. Auto-create default organization for the user
    const fullName = formatFullName({ firstName: data.firstName, lastName: data.lastName })
    const organizationId = await createOrganization(user.uid, {
      name: `${fullName}'s Organization`,
      description: 'My stable organization',
      contactType: 'Business',
      primaryEmail: data.email,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    })

    // 5. Add user as owner/administrator of the organization
    const memberId = `${user.uid}_${organizationId}`
    await setDoc(doc(db, 'organizationMembers', memberId), {
      userId: user.uid,
      userEmail: data.email,
      userName: fullName,
      organizationId: organizationId,
      roles: ['owner', 'administrator'],
      primaryRole: 'owner',
      status: 'active',
      showInPlanning: true,
      stableAccess: 'all',
      assignedStableIds: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: user.uid
    })

    // 6. Update organization member count
    await updateDoc(doc(db, 'organizations', organizationId), {
      'stats.totalMemberCount': increment(1)
    })

    // 7. Return organization ID for the UI to set in context
    return organizationId
  } catch (error) {
    // If Firestore fails, delete the Auth user to maintain consistency
    await user.delete()
    throw error
  }
}
