import { useCallback, useMemo } from "react";
import { useOrganization } from "../contexts/OrganizationContext";
import { useSubscription } from "../contexts/SubscriptionContext";

/**
 * Hook to check if a feature is enabled considering:
 * 1. Global feature toggle (checked server-side via org.betaFeatures)
 * 2. Organization beta access (org.betaFeatures array)
 * 3. Subscription tier module/addon (existing subscription system)
 *
 * Resolution order (server-side):
 * - If globally disabled AND org has beta access → org.betaFeatures includes it → ENABLED
 * - If globally disabled AND no beta access → NOT in org.betaFeatures → Check tier
 * - If globally enabled → Check subscription tier
 *
 * Frontend simplification:
 * - Check if feature is in org.betaFeatures (means globally disabled but beta enabled)
 * - Otherwise check subscription tier (handles both globally enabled and fallback cases)
 *
 * @example
 * ```tsx
 * const { isFeatureEnabled } = useFeatureToggle();
 *
 * if (isFeatureEnabled('lessons')) {
 *   // Show lessons menu item
 * }
 * ```
 */
export function useFeatureToggle() {
  const { currentOrganization } = useOrganization();
  const { isFeatureAvailable: isInTier } = useSubscription();

  // Get beta features from current organization
  const betaFeatures = useMemo(
    () => currentOrganization?.betaFeatures || [],
    [currentOrganization],
  );

  /**
   * Check if a feature is enabled for the current organization
   * Combines beta access and subscription tier checks
   */
  const isFeatureEnabled = useCallback(
    (featureKey: string): boolean => {
      // First check if org has beta access (overrides global disable + tier restrictions)
      if (betaFeatures.includes(featureKey)) {
        return true;
      }

      // Otherwise check subscription tier (handles globally enabled features)
      return isInTier(featureKey);
    },
    [betaFeatures, isInTier],
  );

  /**
   * Get the reason why a feature is enabled or disabled
   * Useful for debugging and admin UI
   */
  const getFeatureStatus = useCallback(
    (
      featureKey: string,
    ): {
      enabled: boolean;
      reason: "beta-access" | "tier-enabled" | "tier-disabled";
    } => {
      // Check beta access first
      if (betaFeatures.includes(featureKey)) {
        return { enabled: true, reason: "beta-access" };
      }

      // Check tier
      const tierEnabled = isInTier(featureKey);
      return {
        enabled: tierEnabled,
        reason: tierEnabled ? "tier-enabled" : "tier-disabled",
      };
    },
    [betaFeatures, isInTier],
  );

  return {
    isFeatureEnabled,
    getFeatureStatus,
    betaFeatures,
  };
}
