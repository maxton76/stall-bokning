import { Plus, Check } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { ActivityTypeConfig, Activity } from '@/types/activity'

interface CareTableCellProps {
  horseId: string
  horseName: string
  activityTypeId: string
  activityType: ActivityTypeConfig
  lastActivity?: Activity
  onClick: (horseId: string, activityTypeId: string) => void
}

export function CareTableCell({
  horseId,
  horseName,
  activityTypeId,
  activityType,
  lastActivity,
  onClick,
}: CareTableCellProps) {
  const handleClick = () => onClick(horseId, activityTypeId)

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full h-full flex flex-col items-center justify-center p-3',
        'hover:bg-accent transition-colors',
        'border-l border-border',
        'min-h-[80px]'
      )}
      aria-label={`${lastActivity ? 'View' : 'Add'} ${activityType.name} activity for ${horseName}`}
    >
      {lastActivity ? (
        <div className="flex flex-col items-center gap-1">
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-xs text-muted-foreground">
            {format(lastActivity.date.toDate(), 'MMM d')}
          </span>
        </div>
      ) : (
        <Plus className="h-5 w-5 text-muted-foreground" />
      )}
    </button>
  )
}
