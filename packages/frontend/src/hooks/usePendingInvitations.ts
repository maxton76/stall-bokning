import { useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  getPendingInvitations,
  acceptInvitation,
  declineInvitation,
  type Invitation
} from '@/services/invitationService'

interface UsePendingInvitationsResult {
  invitations: Invitation[]
  loading: boolean
  accept: (inviteId: string, stableId: string) => Promise<void>
  decline: (inviteId: string) => Promise<void>
  refresh: () => Promise<void>
}

/**
 * Hook to manage pending stable invitations
 * Provides accept/decline functionality with toast notifications
 * Auto-loads on mount and when user email changes
 *
 * Uses useAsyncData for consistent loading patterns and error handling
 */
export function usePendingInvitations(): UsePendingInvitationsResult {
  const { user } = useAuth()
  const { toast } = useToast()

  const invitationsData = useAsyncData<Invitation[]>({
    loadFn: async () => {
      if (!user?.email) return []
      return getPendingInvitations(user.email)
    },
    errorMessage: 'Failed to load invitations'
  })

  const accept = async (inviteId: string, stableId: string) => {
    if (!user?.uid || !user?.email) return

    try {
      const invitations = invitationsData.data || []
      const invite = invitations.find(i => i.id === inviteId)

      if (!invite) throw new Error('Invitation not found')

      // ✅ VALIDATE all required fields
      const missing: string[] = []
      if (!invite.role) missing.push('role')
      if (!invite.stableName) missing.push('stableName')
      if (!stableId) missing.push('stableId')

      if (missing.length > 0) {
        throw new Error(
          `Invitation incomplete. Missing: ${missing.join(', ')}. ` +
          `Please contact support or request a new invitation.`
        )
      }

      // ✅ FALLBACK for legacy data (shouldn't happen after migration)
      let stableName = invite.stableName
      if (!stableName) {
        console.warn('Fetching missing stableName from stable document')
        const stableDoc = await getDoc(doc(db, 'stables', stableId))
        if (stableDoc.exists()) {
          stableName = stableDoc.data().name
        } else {
          throw new Error('Stable not found')
        }
      }

      // ✅ VALIDATE user has firstName/lastName from AuthContext
      if (!user.firstName || !user.lastName) {
        throw new Error('Please update your profile with your first and last name.')
      }

      await acceptInvitation(
        inviteId,
        user.uid,
        user.email,
        user.firstName,
        user.lastName,
        stableId,
        stableName,
        invite.role
      )

      toast({
        title: 'Success',
        description: `You are now a ${invite.role} of ${stableName}`
      })

      await invitationsData.reload()
    } catch (error) {
      console.error('Error accepting invitation:', error)
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to accept invitation'

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }

  const decline = async (inviteId: string) => {
    if (!user?.uid) return

    try {
      await declineInvitation(inviteId, user.uid)
      toast({
        title: 'Invitation declined',
        description: 'You have declined the invitation'
      })
      await invitationsData.reload()
    } catch (error) {
      console.error('Error declining invitation:', error)
      toast({
        title: 'Error',
        description: 'Failed to decline invitation',
        variant: 'destructive'
      })
    }
  }

  useEffect(() => {
    invitationsData.load()
  }, [user?.email])

  return {
    invitations: invitationsData.data || [],
    loading: invitationsData.loading,
    accept,
    decline,
    refresh: async () => { await invitationsData.reload() }
  }
}
