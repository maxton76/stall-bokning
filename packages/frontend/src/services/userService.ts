import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc, Timestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { formatFullName } from '@/lib/nameUtils'

export interface RegisterUserData {
  email: string
  password: string
  firstName: string
  lastName: string
}

/**
 * Register a new user with firstName and lastName
 * Creates both Firebase Auth user and Firestore user document
 *
 * @param data - User registration data
 * @throws Error if registration fails
 */
export async function registerUser(data: RegisterUserData): Promise<void> {
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
  } catch (error) {
    // If Firestore fails, delete the Auth user to maintain consistency
    await user.delete()
    throw error
  }
}
