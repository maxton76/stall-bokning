import { useMemo } from 'react'
import type { ActivityEntry, ActivityFilters } from '@/types/activity'

/**
 * Custom hook for filtering and grouping activity entries
 *
 * @param activities - Array of activity entries to filter
 * @param filters - Filter configuration
 * @param userId - Current user ID for "for me" filter
 * @returns Filtered and grouped activities
 */
export function useActivityFilters(
  activities: ActivityEntry[],
  filters: ActivityFilters,
  userId?: string
) {
  const filteredActivities = useMemo(() => {
    return activities.filter(entry => {
      // Filter by "for me" toggle - only show entries assigned to current user
      if (filters.forMe) {
        if (entry.type === 'activity' || entry.type === 'task') {
          if (entry.assignedTo !== userId) return false
        } else {
          // Messages don't have assignedTo, so filter them out when "forMe" is active
          return false
        }
      }

      // Filter by "show finished" toggle - exclude completed entries if not shown
      if (!filters.showFinished && entry.status === 'completed') return false

      // Filter by entry type checkboxes
      if (!filters.entryTypes.includes(entry.type)) return false

      return true
    })
  }, [activities, filters, userId])

  const groupedActivities = useMemo(() => {
    // No grouping - return all in single group
    if (filters.groupBy === 'none') {
      return { 'All': filteredActivities }
    }

    // Group activities based on selected groupBy option
    return filteredActivities.reduce((acc, entry) => {
      let groupKey: string

      switch (filters.groupBy) {
        case 'horse':
          // Group by horse name for activities, "Other" for tasks/messages
          groupKey = entry.type === 'activity' ? entry.horseName : 'Other'
          break

        case 'staff':
          // Group by assignee name, "Unassigned" if no assignee
          if (entry.type === 'activity' || entry.type === 'task') {
            groupKey = entry.assignedToName || 'Unassigned'
          } else {
            groupKey = 'Unassigned'
          }
          break

        case 'type':
          // Group by entry type (Activity, Task, Message)
          groupKey = entry.type.charAt(0).toUpperCase() + entry.type.slice(1)
          break

        default:
          groupKey = 'All'
      }

      // Initialize group array if it doesn't exist
      if (!acc[groupKey]) {
        acc[groupKey] = []
      }

      acc[groupKey]!.push(entry)
      return acc
    }, {} as Record<string, ActivityEntry[]>)
  }, [filteredActivities, filters.groupBy])

  return { filteredActivities, groupedActivities }
}
