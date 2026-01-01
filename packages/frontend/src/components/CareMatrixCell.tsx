import { Plus, Check, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Activity } from '@/types/activity'

interface CareMatrixCellProps {
  horseId: string
  horseName: string
  activityTypeId: string
  activityTypeName: string
  activityTypeColor: string
  lastActivity?: Activity
  onClick: (horseId: string, activityTypeId: string) => void
}

export function CareMatrixCell({
  horseId,
  activityTypeId,
  activityTypeColor,
  lastActivity,
  onClick,
}: CareMatrixCellProps) {
  // Calculate cell status
  // For MVP: Show + if no activity, ✓ if has activity
  // Future: Add overdue logic based on interval calculation
  const hasActivity = !!lastActivity

  const statusIcon = hasActivity ? (
    <Check className="h-6 w-6" />
  ) : (
    <Plus className="h-6 w-6" />
  )

  const statusColorClass = hasActivity
    ? 'text-green-600 hover:text-green-700'
    : 'text-muted-foreground hover:text-foreground'

  return (
    <button
      onClick={() => onClick(horseId, activityTypeId)}
      className={cn(
        'w-full h-full flex flex-col items-center justify-center p-3',
        'hover:bg-accent transition-colors',
        'border-l border-border',
        'min-h-[80px]'
      )}
      aria-label={`Add ${activityTypeId} activity`}
    >
      <div className={cn('transition-colors', statusColorClass)}>
        {statusIcon}
      </div>
    </button>
  )
}
