import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { ActivityTypeConfig, Activity } from '@/types/activity'

interface QuickAddDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  horse?: { id: string; name: string; feiRules?: string }
  activityType?: ActivityTypeConfig
  lastActivity?: Activity
  onAdd: () => void
}

export function QuickAddDialog({
  open,
  onOpenChange,
  horse,
  activityType,
  lastActivity,
  onAdd,
}: QuickAddDialogProps) {
  // Don't render if missing data
  if (!horse || !activityType) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{activityType.name}</DialogTitle>
          <DialogDescription>
            Quick add {activityType.name.toLowerCase()} activity for {horse.name}
          </DialogDescription>
        </DialogHeader>

        {/* Horse Info */}
        <div className="mb-4">
          <div className="font-medium text-base">{horse.name}</div>
          {horse.feiRules && (
            <div className="text-sm text-muted-foreground">{horse.feiRules}</div>
          )}
        </div>

        {/* Last Done Status */}
        <div className="mb-2">
          <div className="text-sm font-medium">
            Last done {activityType.name.toLowerCase()}
          </div>
          <div className="text-sm text-muted-foreground">
            {lastActivity
              ? format(lastActivity.date.toDate(), 'PPP')
              : 'Never/Unknown'}
          </div>
        </div>

        {/* Interval */}
        <div className="mb-4">
          <div className="text-sm font-medium">Interval</div>
          <div className="text-sm text-muted-foreground">26 weeks</div>
        </div>

        {/* Add Button */}
        <Button onClick={onAdd} className="w-full">
          Add
        </Button>
      </DialogContent>
    </Dialog>
  )
}
