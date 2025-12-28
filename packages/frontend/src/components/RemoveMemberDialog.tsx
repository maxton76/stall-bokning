import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Remove Member from Stable</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove this member? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          {/* Member Info */}
          <div className='rounded-lg border p-4'>
            <p className='font-medium'>
              {formatDisplayName({
                firstName: member.firstName,
                lastName: member.lastName,
                email: member.userEmail
              }, {
                fallback: 'Unknown User'
              })}
            </p>
            <p className='text-sm text-muted-foreground capitalize'>
              Role: {member.role}
            </p>
          </div>

          {/* Horse Warning */}
          {horseCount > 0 && (
            <Alert variant='destructive'>
              <AlertTriangle className='h-4 w-4' />
              <AlertDescription>
                <strong>Warning:</strong> This member has {horseCount} {horseCount === 1 ? 'horse' : 'horses'} assigned to this stable.
                All their horses will be automatically unassigned from the stable.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant='destructive'
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Removing...' : 'Remove Member'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
