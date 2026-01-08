import { CareMatrixCell } from './CareMatrixCell'
import type { ActivityTypeConfig, Activity } from '@/types/activity'

interface CareMatrixViewProps {
  horses: Array<{ id: string; name: string; feiRules?: string }>
  activityTypes: ActivityTypeConfig[]
  activities: Activity[]
  onCellClick: (horseId: string, activityTypeId: string) => void
}

// Helper function to find the last (most recent past) activity
function findLastActivity(
  activities: Activity[],
  horseId: string,
  activityTypeId: string
): Activity | undefined {
  const now = new Date()
  return activities
    .filter(a => {
      const isPast = a.date.toDate() < now
      const isMatch = a.horseId === horseId && a.activityTypeConfigId === activityTypeId
      return isPast && isMatch
    })
    .sort((a, b) => b.date.toMillis() - a.date.toMillis())[0] // Sort descending to get most recent
}

// Helper function to find the next upcoming activity
function findNextActivity(
  activities: Activity[],
  horseId: string,
  activityTypeId: string
): Activity | undefined {
  const now = new Date()
  return activities
    .filter(a => {
      const isFuture = a.date.toDate() >= now
      const isMatch = a.horseId === horseId && a.activityTypeConfigId === activityTypeId
      return isFuture && isMatch
    })
    .sort((a, b) => a.date.toMillis() - b.date.toMillis())[0] // Sort ascending to get earliest future date
}

export function CareMatrixView({
  horses,
  activityTypes,
  activities,
  onCellClick,
}: CareMatrixViewProps) {
  // Filter to only show Care category activity types
  const careActivityTypes = activityTypes.filter(t => t.category === 'Care')

  // Sort activity types by sortOrder
  const sortedActivityTypes = [...careActivityTypes].sort((a, b) => a.sortOrder - b.sortOrder)

  if (horses.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">No horses found for this stable</p>
      </div>
    )
  }

  if (sortedActivityTypes.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">No care activity types configured</p>
      </div>
    )
  }

  // Calculate grid columns based on number of activity types
  const gridCols = `grid-cols-[200px_repeat(${sortedActivityTypes.length},1fr)]`

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header Row */}
      <div
        className={`grid ${gridCols} bg-muted border-b`}
        style={{ gridTemplateColumns: `200px repeat(${sortedActivityTypes.length}, 1fr)` }}
      >
        <div className="p-4 font-semibold border-r border-border">Horse</div>
        {sortedActivityTypes.map((type) => (
          <div
            key={type.id}
            className="p-4 text-center border-l border-border"
          >
            <div className="text-xs text-muted-foreground mb-1">Last done</div>
            <div className="text-sm font-medium">{type.name}</div>
          </div>
        ))}
      </div>

      {/* Data Rows */}
      {horses.map((horse) => (
        <div
          key={horse.id}
          className="grid border-b last:border-b-0"
          style={{ gridTemplateColumns: `200px repeat(${sortedActivityTypes.length}, 1fr)` }}
        >
          {/* Horse Name Cell */}
          <div className="p-4 flex items-center gap-2 border-r border-border bg-background">
            <span className="font-medium">{horse.name}</span>
            {/* TODO: Add FEI rules indicators */}
          </div>

          {/* Activity Type Cells */}
          {sortedActivityTypes.map((type) => {
            const lastActivity = findLastActivity(activities, horse.id, type.id)
            const nextActivity = findNextActivity(activities, horse.id, type.id)
            return (
              <CareMatrixCell
                key={type.id}
                horseId={horse.id}
                horseName={horse.name}
                activityTypeId={type.id}
                activityTypeName={type.name}
                activityTypeColor={type.color}
                lastActivity={lastActivity}
                nextActivity={nextActivity}
                onClick={onCellClick}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
