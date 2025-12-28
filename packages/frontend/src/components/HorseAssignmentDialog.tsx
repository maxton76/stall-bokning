import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info, MapPin } from 'lucide-react'
import type { Horse } from '@/types/roles'

interface HorseAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  horse: Horse | null
  availableStables: Array<{ id: string; name: string }>
  onAssign: (horseId: string, stableId: string, stableName: string) => Promise<void>
}

export function HorseAssignmentDialog({
  open,
  onOpenChange,
  horse,
  availableStables,
  onAssign
}: HorseAssignmentDialogProps) {
  const [selectedStableId, setSelectedStableId] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (horse && open) {
      // Reset selection when dialog opens
      setSelectedStableId('')
    }
  }, [horse, open])

  const handleAssign = async () => {
    if (!horse || !selectedStableId) {
      alert('Please select a stable')
      return
    }

    const stable = availableStables.find(s => s.id === selectedStableId)
    if (!stable) {
      alert('Invalid stable selection')
      return
    }

    try {
      setLoading(true)
      await onAssign(horse.id, stable.id, stable.name)
      onOpenChange(false)
    } catch (error) {
      console.error('Error assigning horse:', error)
      alert('Failed to assign horse. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!horse) return null

  const isTransfer = !!horse.currentStableId
  const currentStableName = horse.currentStableName || 'Unknown Stable'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>
            {isTransfer ? 'Transfer Horse to Different Stable' : 'Assign Horse to Stable'}
          </DialogTitle>
          <DialogDescription>
            {isTransfer
              ? `Move ${horse.name} from ${currentStableName} to a different stable.`
              : `Assign ${horse.name} to one of your stables.`}
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 py-4'>
          {/* Current Assignment Info */}
          {isTransfer && (
            <Alert>
              <MapPin className='h-4 w-4' />
              <AlertDescription>
                <strong>Current stable:</strong> {currentStableName}
                {horse.assignedAt && (
                  <span className='text-xs text-muted-foreground ml-2'>
                    (since {new Date(horse.assignedAt.toDate()).toLocaleDateString()})
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Stable Selection */}
          <div className='grid gap-2'>
            <Label htmlFor='stable'>
              {isTransfer ? 'Transfer to Stable' : 'Select Stable'}
            </Label>
            <Select
              value={selectedStableId}
              onValueChange={setSelectedStableId}
            >
              <SelectTrigger id='stable'>
                <SelectValue placeholder='Choose a stable...' />
              </SelectTrigger>
              <SelectContent>
                {availableStables
                  .filter(stable => stable.id !== horse.currentStableId)
                  .map(stable => (
                    <SelectItem key={stable.id} value={stable.id}>
                      {stable.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Info Alert */}
          {availableStables.length === 0 && (
            <Alert>
              <Info className='h-4 w-4' />
              <AlertDescription>
                You are not a member of any stables. Join a stable first to assign your horses.
              </AlertDescription>
            </Alert>
          )}

          {availableStables.length === 1 && horse.currentStableId && (
            <Alert>
              <Info className='h-4 w-4' />
              <AlertDescription>
                You only belong to one stable. To transfer this horse, you need to be a member of multiple stables.
              </AlertDescription>
            </Alert>
          )}

          {selectedStableId && (
            <Alert>
              <Info className='h-4 w-4' />
              <AlertDescription>
                {isTransfer
                  ? `${horse.name} will be moved to the selected stable. This change is reversible.`
                  : `${horse.name} will be assigned to the selected stable and will appear in that stable's horse list.`}
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
            onClick={handleAssign}
            disabled={loading || !selectedStableId || availableStables.length === 0}
          >
            {loading
              ? 'Processing...'
              : isTransfer
              ? 'Transfer Horse'
              : 'Assign Horse'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
