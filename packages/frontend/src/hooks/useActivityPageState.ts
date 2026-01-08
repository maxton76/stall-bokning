import { useState, useEffect } from 'react'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getCareActivities } from '@/services/activityService'
import { getUserHorsesAtStable, getUserHorsesAtStables } from '@/services/horseService'
import { getActivityTypesByStable } from '@/services/activityTypeService'
import { getOrganizationHorseGroups } from '@/services/horseGroupService'
import type { Activity, ActivityTypeConfig } from '@/types/activity'
import type { Horse, HorseGroup } from '@/types/roles'
interface UseActivityPageStateProps {
  user: { uid: string } | null
  stables: Array<{ id: string; name: string }>
  organizationId?: string
  activityLoader?: (stableIds: string | string[]) => Promise<Activity[]>
  includeGroups?: boolean
}

export function useActivityPageState({
  user,
  stables,
  organizationId,
  activityLoader = getCareActivities,
  includeGroups = true,
}: UseActivityPageStateProps) {
  const [selectedStableId, setSelectedStableId] = useState<string>('all')

  // Load activities for selected stable(s)
  const activities = useAsyncData<Activity[]>({
    loadFn: async () => {
      if (!selectedStableId) return []

      // If "all" is selected, get activities from all stables
      if (selectedStableId === 'all') {
        const stableIds = stables.map(s => s.id)
        return await activityLoader(stableIds)
      }

      // Otherwise get activities for specific stable
      return await activityLoader(selectedStableId)
    },
  })

  // Load activity types for selected stable(s)
  const activityTypes = useAsyncData<ActivityTypeConfig[]>({
    loadFn: async () => {
      if (!selectedStableId) return []

      // If "all" is selected, get activity types from all stables and merge them
      if (selectedStableId === 'all') {
        const allTypes: ActivityTypeConfig[] = []
        const seenIds = new Set<string>()

        for (const stable of stables) {
          const types = await getActivityTypesByStable(stable.id, true)
          // Add unique types (by ID to avoid duplicates)
          types.forEach(type => {
            if (!seenIds.has(type.id)) {
              seenIds.add(type.id)
              allTypes.push(type)
            }
          })
        }

        return allTypes
      }

      // Otherwise get activity types for specific stable
      return await getActivityTypesByStable(selectedStableId, true)
    },
  })

  // Load horses for selected stable(s)
  const horses = useAsyncData<Horse[]>({
    loadFn: async () => {
      if (!selectedStableId || !user) return []

      // If "all" is selected, get horses from all stables
      if (selectedStableId === 'all') {
        const stableIds = stables.map(s => s.id)
        return await getUserHorsesAtStables(user.uid, stableIds)
      }

      // Otherwise get horses for specific stable
      return await getUserHorsesAtStable(user.uid, selectedStableId)
    },
  })

  // Load horse groups for filtering (optional) - now organization-wide
  const horseGroups = useAsyncData<HorseGroup[]>({
    loadFn: async () => {
      if (!includeGroups || !organizationId) return []
      return await getOrganizationHorseGroups(organizationId)
    },
  })

  // Reload data when stable changes or stables list loads
  useEffect(() => {
    if (selectedStableId && stables.length > 0) {
      activities.load()
      horses.load()
      activityTypes.load()
    }
  }, [selectedStableId, stables])

  // Reload horse groups when organizationId changes
  useEffect(() => {
    if (includeGroups && organizationId) {
      horseGroups.load()
    }
  }, [organizationId, includeGroups])

  return {
    selectedStableId,
    setSelectedStableId,
    activities,
    activityTypes,
    horses,
    horseGroups,
  }
}
