import { useTranslation } from "react-i18next";
import { useCallback, useMemo } from "react";
import type { ActivityTypeConfig } from "@/types/activity";

/**
 * Normalize activity type name to translation key (fallback for types without key field)
 * Examples:
 *   "Dentist" -> "dentist"
 *   "Mare Cycle Check" -> "mareCycleCheck"
 *   "Stallion Mount" -> "stallionMount"
 */
function normalizeActivityKey(name: string): string {
  return name
    .split(/\s+/)
    .map((word, i) =>
      i === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join("");
}

/**
 * Hook that returns a function to translate activity type names.
 *
 * For standard activity types:
 * - Uses i18n lookup via the `key` field (or normalized name as fallback)
 * - Falls back to the original name if no translation found
 *
 * For custom activity types:
 * - Returns the user-provided name directly (custom names are not translated)
 *
 * @example
 * ```tsx
 * const translateActivityType = useTranslatedActivityTypes();
 * const displayName = translateActivityType(activityType);
 * ```
 */
export function useTranslatedActivityTypes() {
  const { t } = useTranslation("constants");

  return useCallback(
    (activityType: ActivityTypeConfig | null | undefined): string => {
      if (!activityType) return "";

      // For standard types, use i18n translation
      if (activityType.isStandard) {
        // Use key field if available, otherwise derive from name
        const key = activityType.key || normalizeActivityKey(activityType.name);
        return t(`activityTypes.${key}`, { defaultValue: activityType.name });
      }

      // Custom types use user-provided name directly
      return activityType.name;
    },
    [t],
  );
}

/**
 * Hook that returns activity types with translated labels.
 * Useful for dropdowns and select components.
 *
 * @example
 * ```tsx
 * const activityTypeOptions = useActivityTypeOptions(activityTypes);
 * // Each option has: { ...originalType, label: "Translated Name" }
 * ```
 */
export function useActivityTypeOptions<T extends ActivityTypeConfig>(
  activityTypes: T[],
): (T & { label: string })[] {
  const translate = useTranslatedActivityTypes();

  return useMemo(
    () =>
      activityTypes.map((type) => ({
        ...type,
        label: translate(type),
      })),
    [activityTypes, translate],
  );
}
