import { Plus, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { Activity } from '@/types/activity'

interface CareMatrixCellProps {
  horseId: string
  horseName: string
  activityTypeId: string
  activityTypeName: string
  activityTypeColor: string
  lastActivity?: Activity
  nextActivity?: Activity
  onClick: (horseId: string, activityTypeId: string) => void
}

export function CareMatrixCell({
  horseId,
  activityTypeId,
  lastActivity,
  nextActivity,
  onClick,
}: CareMatrixCellProps) {
  const hasLastActivity = !!lastActivity
  const hasNextActivity = !!nextActivity

  // Determine if overdue (no next scheduled and no recent last activity)
  const isOverdue = !hasNextActivity && hasLastActivity

  return (
    <button
      onClick={() => onClick(horseId, activityTypeId)}
      className={cn(
        'w-full h-full flex flex-col items-center justify-center p-3 gap-2',
        'hover:bg-accent transition-colors',
        'border-l border-border',
        'min-h-[80px]'
      )}
      aria-label={hasNextActivity ? `View ${activityTypeId} activity` : `Add ${activityTypeId} activity`}
    >
      {/* Next scheduled date in green badge */}
      {hasNextActivity && (
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
        >
          Next {format(nextActivity.date.toDate(), 'M/d/yy')}
        </Badge>
      )}

      {/* Overdue indicator */}
      {isOverdue && (
        <div className="text-red-500">
          <AlertCircle className="h-5 w-5" />
        </div>
      )}

      {/* Add button when no activities */}
      {!hasLastActivity && !hasNextActivity && (
        <div className="text-gray-300 hover:text-gray-400 transition-colors">
          <div className="rounded-full border-2 border-current p-1">
            <Plus className="h-4 w-4" />
          </div>
        </div>
      )}
    </button>
  )
}
