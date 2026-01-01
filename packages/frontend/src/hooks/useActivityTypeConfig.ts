import { useMemo } from 'react'
import type { Activity, ActivityTypeConfig } from '@/types/activity'
import { ACTIVITY_TYPES } from '@/types/activity'
import { getActivityTypeColor } from '@/utils/activityTypeMigration'

/**
 * Resolved activity type configuration with display properties
 */
export interface ActivityTypeDisplay {
  /** Activity type config (null for legacy activities) */
  config: ActivityTypeConfig | null
  /** Display icon (emoji) */
  icon: string
  /** Display label */
  label: string
  /** Display color (hex) */
  color: string
}

/**
 * Hook for resolving activity type configuration with legacy fallback
 *
 * Centralizes the logic for getting activity type display properties,
 * supporting both new dynamic activity types and legacy hardcoded types.
 *
 * @param activity - Activity entry to resolve type for
 * @param activityTypes - Available activity type configurations
 * @returns Resolved display properties (icon, label, color)
 *
 * @example
 * ```tsx
 * // Before: Duplicate resolution logic
 * const activityTypeConfig =
 *   entry.type === 'activity' && entry.activityTypeConfigId
 *     ? activityTypes.find((t) => t.id === entry.activityTypeConfigId)
 *     : null
 *
 * const typeIcon =
 *   entry.type === 'activity'
 *     ? activityTypeConfig?.icon ||
 *       ACTIVITY_TYPES.find((t) => t.value === entry.activityType)?.icon ||
 *       '📝'
 *     : '📝'
 *
 * const typeLabel = activityTypeConfig?.name ||
 *   ACTIVITY_TYPES.find((t) => t.value === entry.activityType)?.label ||
 *   'Unknown'
 *
 * const borderColor = getActivityTypeColor(entry)
 *
 * // After: Single hook call
 * const typeDisplay = useActivityTypeConfig(activity, activityTypes.data || [])
 *
 * typeDisplay.icon     // '🦷'
 * typeDisplay.label    // 'Dentist'
 * typeDisplay.color    // '#22c55e'
 * typeDisplay.config   // Full ActivityTypeConfig object or null
 * ```
 */
export function useActivityTypeConfig(
  activity: Activity,
  activityTypes: ActivityTypeConfig[]
): ActivityTypeDisplay {
  return useMemo(() => {
    // Try to find dynamic activity type config
    const config = activity.activityTypeConfigId
      ? activityTypes.find(t => t.id === activity.activityTypeConfigId) || null
      : null

    // Fallback to legacy hardcoded type
    const legacyType = ACTIVITY_TYPES.find(
      t => t.value === activity.activityType
    )

    // Resolve icon: dynamic > legacy > default
    const icon = config?.icon || legacyType?.icon || '📝'

    // Resolve label: dynamic > legacy > type string > unknown
    const label = config?.name || legacyType?.label || activity.activityType || 'Unknown'

    // Resolve color using migration utility (handles both dynamic and legacy)
    const color = getActivityTypeColor(activity)

    return { config, icon, label, color }
  }, [activity.activityTypeConfigId, activity.activityType, activity.activityTypeColor, activityTypes])
}
