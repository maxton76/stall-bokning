import { Timestamp } from 'firebase/firestore'
import { SystemRole } from '@/types/roles'

/**
 * Application user type that combines Firebase Auth and Firestore user data
 * This provides a complete user object with authentication info and profile data
 */
export interface AppUser {
  // Firebase Auth fields
  uid: string
  email: string | null
  displayName: string | null // Firebase Auth displayName (kept for compatibility)

  // Firestore profile fields
  firstName: string | null
  lastName: string | null
  systemRole: SystemRole | null
  createdAt: Timestamp | null
  updatedAt: Timestamp | null

  // Computed convenience fields
  fullName: string // "John Doe" or fallback to email/displayName
  initials: string // "JD" or fallback to email first char
}
