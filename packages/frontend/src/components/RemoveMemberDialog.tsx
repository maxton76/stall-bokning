import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import type { StableMember } from '@/types/roles'
import { formatDisplayName } from '@/lib/nameUtils'

interface RemoveMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: StableMember | null
  horseCount: number
  onConfirm: (memberId: string) => Promise<void>
}

export function RemoveMemberDialog({
  open,
  onOpenChange,
  member,
  horseCount,
  onConfirm
}: RemoveMemberDialogProps) {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!member) return

    try {
      setLoading(true)
      await onConfirm(member.userId)
      onOpenChange(false)
    } catch (error) {
      console.error('Error removing member:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!member) return null

  const memberName = formatDisplayName({
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.userEmail
  }, {
    fallback: 'Unknown User'
  })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Member from Stable</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className='space-y-4'>
              <p>Are you sure you want to remove <strong>{memberName}</strong> ({member.role})? This action cannot be undone.</p>

              {horseCount > 0 && (
                <Alert variant='destructive'>
                  <AlertTriangle className='h-4 w-4' />
                  <AlertDescription>
                    <strong>Warning:</strong> This member has {horseCount} {horseCount === 1 ? 'horse' : 'horses'} assigned.
                    All horses will be automatically unassigned from the stable.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
            disabled={loading}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
          >
            {loading ? 'Removing...' : 'Remove Member'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
