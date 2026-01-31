/**
 * Tier Service
 *
 * API client for public tier endpoints (no auth required).
 */

import { publicApiClient } from "@/lib/apiClient";
import type { TierDefinitionPublic } from "@equiduty/shared";

/**
 * Fetch all publicly visible tier definitions.
 * Uses the public (unauthenticated) API endpoint.
 */
export async function getPublicTiers(): Promise<TierDefinitionPublic[]> {
  return publicApiClient.get<TierDefinitionPublic[]>("/tiers");
}
