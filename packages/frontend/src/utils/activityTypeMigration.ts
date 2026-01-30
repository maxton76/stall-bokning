import type { ActivityType } from "@/types/activity";
import { getStandardTypeByName } from "@/constants/standardActivityTypes";

/**
 * Activity Type Migration Utility
 *
 * Provides backward compatibility mapping between legacy hardcoded activity types
 * and new configurable ActivityTypeConfig system.
 */

/**
 * Map legacy ActivityType enum values to standard activity type names
 *
 * This maintains backward compatibility with existing activities that use
 * the old ActivityType enum. Maps to the new standardized naming.
 */
const LEGACY_TO_STANDARD_MAP: Record<ActivityType, string> = {
  // Care category
  dentist: "Dentist",
  farrier: "Farrier",
  vet: "Vet",
  deworm: "Vet", // Deworm removed, map to general Vet category
  vaccination: "Vet", // Influenza removed, map to general Vet category
  chiropractic: "Vet", // Map to general Vet category
  massage: "Vet", // Map to general Vet category

  // Sport category
  training: "Riding", // Map to Riding
  competition: "Show", // Map to Show

  // Other
  other: "Riding", // Default fallback to Riding
};

/**
 * Get standard activity type name from legacy activity type
 *
 * @param legacyType - Legacy ActivityType enum value
 * @returns Standardized activity type name
 *
 * @example
 * ```ts
 * const standardName = getLegacyTypeMapping('dentist')
 * // Returns: 'Dentist'
 *
 * const standardName = getLegacyTypeMapping('vaccination')
 * // Returns: 'Influenza'
 * ```
 */
export function getLegacyTypeMapping(legacyType: ActivityType): string {
  return LEGACY_TO_STANDARD_MAP[legacyType] || "Riding";
}

/**
 * Get standard activity type configuration from legacy type
 *
 * Useful for migration scripts and displaying legacy activities
 * with new color/category information.
 *
 * @param legacyType - Legacy ActivityType enum value
 * @returns Standard activity type configuration or undefined if not found
 *
 * @example
 * ```ts
 * const standardType = getStandardTypeForLegacy('dentist')
 * // Returns: { name: 'Dentist', color: '#22c55e', category: 'Care', ... }
 * ```
 */
export function getStandardTypeForLegacy(legacyType: ActivityType) {
  const standardName = getLegacyTypeMapping(legacyType);
  return getStandardTypeByName(standardName);
}

/**
 * Migration helper: Check if an activity uses legacy type system
 *
 * Activities using new system will have activityTypeConfigId set.
 * Legacy activities only have activityType field.
 *
 * @param activity - Activity object to check
 * @returns True if activity uses legacy type system
 */
export function isLegacyActivity(activity: {
  activityType: ActivityType;
  activityTypeConfigId?: string;
}): boolean {
  return !activity.activityTypeConfigId;
}

/**
 * Get display name for activity type (legacy or new)
 *
 * Handles both legacy activities and new configurable activities.
 * For legacy activities, returns the mapped standard type name.
 *
 * @param activity - Activity object
 * @returns Display name for the activity type
 *
 * @example
 * ```ts
 * // Legacy activity
 * const name = getActivityTypeDisplayName({ activityType: 'dentist' })
 * // Returns: 'Dentist'
 *
 * // New activity (would need to look up from activityTypeConfigId)
 * const name = getActivityTypeDisplayName({
 *   activityType: 'dentist',
 *   activityTypeConfigId: 'abc123'
 * })
 * // Returns: name from ActivityTypeConfig
 * ```
 */
export function getActivityTypeDisplayName(activity: {
  activityType: ActivityType;
  activityTypeConfigId?: string;
}): string {
  if (isLegacyActivity(activity)) {
    return getLegacyTypeMapping(activity.activityType);
  }

  // For new activities, name should be fetched from ActivityTypeConfig
  // This is a fallback for when config isn't available
  return getLegacyTypeMapping(activity.activityType);
}

/**
 * Get color for activity type (legacy or new)
 *
 * For legacy activities, returns the standard type's color.
 * For new activities, uses denormalized activityTypeColor if available.
 *
 * @param activity - Activity object
 * @returns Hex color code for the activity type
 *
 * @example
 * ```ts
 * // Legacy activity
 * const color = getActivityTypeColor({ activityType: 'dentist' })
 * // Returns: '#22c55e' (green)
 *
 * // New activity with denormalized color
 * const color = getActivityTypeColor({
 *   activityType: 'dentist',
 *   activityTypeConfigId: 'abc123',
 *   activityTypeColor: '#ef4444'
 * })
 * // Returns: '#ef4444' (custom red)
 * ```
 */
export function getActivityTypeColor(activity: {
  activityType: ActivityType;
  activityTypeConfigId?: string;
  activityTypeColor?: string;
}): string {
  // Use denormalized color if available (new system)
  if (activity.activityTypeColor) {
    return activity.activityTypeColor;
  }

  // Fallback to standard type color for legacy activities
  const standardType = getStandardTypeForLegacy(activity.activityType);
  return standardType?.color || "#6366f1"; // Default to indigo
}

/**
 * Migration script helper: Generate mapping report
 *
 * Useful for understanding how legacy types will be migrated.
 *
 * @returns Array of mapping information
 */
export function getLegacyMappingReport(): Array<{
  legacy: ActivityType;
  standard: string;
  color: string;
  category: string;
}> {
  return (Object.keys(LEGACY_TO_STANDARD_MAP) as ActivityType[]).map(
    (legacyType) => {
      const standardName = LEGACY_TO_STANDARD_MAP[legacyType];
      const standardType = getStandardTypeByName(standardName);

      return {
        legacy: legacyType,
        standard: standardName,
        color: standardType?.color || "#000000",
        category: standardType?.category || "Unknown",
      };
    },
  );
}
