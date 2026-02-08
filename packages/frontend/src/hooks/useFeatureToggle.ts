import { useCallback, useMemo } from "react";
import { useOrganizationContext } from "../contexts/OrganizationContext";
import { useApiQuery } from "./useApiQuery";
import { authFetchJSON } from "@/utils/authFetch";
import { apiV1 } from "@/lib/apiClient";

/**
 * All feature toggle keys that exist in the system (Firestore featureToggles/global).
 * These map 1:1 with the keys in the admin feature toggles UI.
 */
const FEATURE_KEYS = [
  "rideLessons",
  "invoicing",
  "leaveManagement",
  "integrations",
  "manure",
  "chargeableItems",
  "billingGroups",
] as const;

interface FeatureCheckResponse {
  success: boolean;
  data: {
    features: Record<string, { enabled: boolean; reason: string }>;
  };
}

/**
 * Hook to check if a feature is enabled using the global feature toggle system.
 *
 * Calls POST /api/v1/feature-toggles/check which handles:
 * - Global toggle enabled → return true
 * - Global toggle disabled + org has beta access → return true
 * - Global toggle disabled + no beta → return false
 * - No toggle exists → return true (backward compat)
 *
 * @example
 * ```tsx
 * const { isFeatureEnabled } = useFeatureToggle();
 *
 * if (isFeatureEnabled('rideLessons')) {
 *   // Show lessons menu item
 * }
 * ```
 */
export function useFeatureToggle() {
  const { currentOrganizationId } = useOrganizationContext();

  const { data } = useApiQuery<FeatureCheckResponse>(
    ["feature-toggles", "check", currentOrganizationId],
    () =>
      authFetchJSON<FeatureCheckResponse>(apiV1("/feature-toggles/check"), {
        method: "POST",
        body: JSON.stringify({ features: [...FEATURE_KEYS] }),
        headers: { "x-organization-id": currentOrganizationId! },
      }),
    {
      enabled: !!currentOrganizationId,
      staleTime: 60 * 1000, // 1 minute cache
    },
  );

  const featureStates = useMemo(() => {
    if (!data?.data?.features) return {};
    const map: Record<string, boolean> = {};
    for (const [key, val] of Object.entries(data.data.features)) {
      map[key] = val.enabled;
    }
    return map;
  }, [data]);

  /**
   * Check if a feature is enabled for the current organization.
   * Returns true while loading (show items during initial load).
   * Returns true for unknown keys (backward compat).
   */
  const isFeatureEnabled = useCallback(
    (featureKey: string): boolean => {
      // If we haven't loaded yet, default to true (show items while loading)
      if (Object.keys(featureStates).length === 0) return true;
      // If key not in results, default to true (backward compat)
      return featureStates[featureKey] ?? true;
    },
    [featureStates],
  );

  return {
    isFeatureEnabled,
  };
}
