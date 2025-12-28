import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { AppUser } from '@/types/auth'
import {
  fetchUserProfile,
  createAppUser,
  invalidateProfileCache
} from '@/services/profileService'

interface AuthContextType {
  user: AppUser | null
  loading: boolean
  profileLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Set persistence to local storage
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.error('Error setting persistence:', err)
    })

    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User signed in - fetch profile
        setProfileLoading(true)
        try {
          const profile = await fetchUserProfile(firebaseUser.uid)
          const appUser = createAppUser(firebaseUser, profile)
          setUser(appUser)

          if (!profile) {
            console.warn('User profile not found in Firestore, using Firebase data only')
          }
        } catch (error) {
          console.error('Profile fetch error:', error)
          // Still create user with Firebase data only
          setUser(createAppUser(firebaseUser, null))
        } finally {
          setProfileLoading(false)
        }
      } else {
        // User signed out
        setUser(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      setError(null)
      setLoading(true)
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err: any) {
      console.error('Sign in error:', err)

      // User-friendly error messages
      let errorMessage = 'Failed to sign in. Please try again.'

      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password.'
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.'
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection.'
      }

      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setError(null)
      // Invalidate cache on sign out
      if (user?.uid) {
        invalidateProfileCache(user.uid)
      }
      await firebaseSignOut(auth)
    } catch (err: any) {
      console.error('Sign out error:', err)
      setError('Failed to sign out. Please try again.')
      throw err
    }
  }

  const refreshProfile = useCallback(async () => {
    if (!user?.uid) return

    const firebaseUser = auth.currentUser
    if (!firebaseUser) return

    setProfileLoading(true)
    try {
      // Force refresh bypasses cache
      const profile = await fetchUserProfile(user.uid, true)
      const appUser = createAppUser(firebaseUser, profile)
      setUser(appUser)
    } catch (error) {
      console.error('Profile refresh error:', error)
    } finally {
      setProfileLoading(false)
    }
  }, [user?.uid])

  const value = {
    user,
    loading,
    profileLoading,
    signIn,
    signOut,
    refreshProfile,
    error
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
