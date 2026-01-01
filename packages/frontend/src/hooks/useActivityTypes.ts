import { useEffect } from 'react'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getActivityTypesByStable } from '@/services/activityTypeService'
import type { ActivityTypeConfig } from '@/types/activity'

/**
 * Hook for loading activity types for a specific stable
 *
 * Centralizes the pattern of loading activity types with proper loading states
 * and automatic reloading when stable changes.
 *
 * @param stableId - Stable ID to load types for (null if no stable selected)
 * @param activeOnly - Filter to only active types (default: true)
 * @returns Activity types data with loading/error states and control functions
 *
 * @example
 * ```tsx
 * // Before: Manual useAsyncData setup with useEffect
 * const activityTypes = useAsyncData<ActivityTypeConfig[]>({
 *   loadFn: async () => {
 *     if (!selectedStableId) return []
 *     return await getActivityTypesByStable(selectedStableId, true)
 *   },
 * })
 *
 * useEffect(() => {
 *   if (selectedStableId) {
 *     activityTypes.load()
 *   }
 * }, [selectedStableId])
 *
 * // After: Single hook call with automatic reloading
 * const activityTypes = useActivityTypes(selectedStableId, true)
 * ```
 */
export function useActivityTypes(
  stableId: string | null,
  activeOnly: boolean = true
) {
  const activityTypes = useAsyncData<ActivityTypeConfig[]>({
    loadFn: async () => {
      if (!stableId) return []
      return await getActivityTypesByStable(stableId, activeOnly)
    },
    errorMessage: 'Failed to load activity types. Please try again.',
  })

  // Auto-reload when stable or filter changes
  useEffect(() => {
    if (stableId) {
      activityTypes.load()
    } else {
      // Clear data when no stable selected
      activityTypes.reset()
    }
  }, [stableId, activeOnly])

  return activityTypes
}
