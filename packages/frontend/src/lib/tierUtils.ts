/**
 * Tier Utility Functions
 *
 * Derive tier requirements from tier definitions (fetched from API)
 * instead of hardcoded constants.
 */

import type { ModuleFlags, TierDefinitionPublic } from "@equiduty/shared";

/**
 * Determine the minimum subscription tier required for a given module.
 * Returns the lowest tier (by sortOrder) where the module is enabled.
 *
 * @param module - The module flag to check
 * @param tiers - Tier definitions sorted by sortOrder (from useTierDefinitions)
 */
export function getMinimumTierForModule(
  module: keyof ModuleFlags,
  tiers: TierDefinitionPublic[],
): string {
  for (const tier of tiers) {
    if (tier.modules[module]) {
      return tier.tier;
    }
  }
  // If no tier enables the module, return the last tier or "enterprise"
  return tiers[tiers.length - 1]?.tier ?? "enterprise";
}
