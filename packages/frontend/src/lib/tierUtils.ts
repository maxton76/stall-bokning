/**
 * Tier Utility Functions
 *
 * Derive tier requirements from shared constants instead of hardcoding.
 */

import { TIER_MODULES, SUBSCRIPTION_TIERS } from "@equiduty/shared";
import type { ModuleFlags, SubscriptionTier } from "@equiduty/shared";

/**
 * Determine the minimum subscription tier required for a given module.
 * Returns the lowest tier where the module is enabled.
 */
export function getMinimumTierForModule(
  module: keyof ModuleFlags,
): SubscriptionTier {
  for (const tier of SUBSCRIPTION_TIERS) {
    if (TIER_MODULES[tier][module]) {
      return tier;
    }
  }
  // If no tier enables the module, default to enterprise
  return "enterprise";
}
