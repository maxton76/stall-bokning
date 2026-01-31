/**
 * Tier Definitions Hooks
 *
 * Provides tier data for both public consumers (PricingTable, SubscriptionContext)
 * and admin consumers (AdminTierManagementPage, AdminOrganizationDetailPage).
 */

import { useMemo } from "react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { getPublicTiers } from "@/services/tierService";
import { getTierDefinitions } from "@/services/adminService";
import type { TierDefinitionPublic, TierDefinition } from "@equiduty/shared";

/**
 * Hook for public tier data (enabled + visible tiers only).
 * Used by PricingTable, SubscriptionContext, and other non-admin consumers.
 */
export function useTierDefinitions() {
  const { data: tiers, isLoading } = useApiQuery<TierDefinitionPublic[]>(
    ["public-tiers"],
    getPublicTiers,
    { staleTime: 10 * 60 * 1000 }, // Cache for 10 min
  );

  const getTier = useMemo(() => {
    const tierMap = new Map<string, TierDefinitionPublic>();
    if (tiers) {
      for (const t of tiers) {
        tierMap.set(t.tier, t);
      }
    }
    return (tierKey: string): TierDefinitionPublic | undefined =>
      tierMap.get(tierKey);
  }, [tiers]);

  return {
    tiers: tiers ?? [],
    isLoading,
    getTier,
  };
}

/**
 * Hook for admin tier data (ALL tiers including hidden/disabled).
 * Used by AdminTierManagementPage, AdminOrganizationDetailPage, AdminDashboardPage.
 */
export function useAdminTierDefinitions() {
  const {
    data: tiers,
    isLoading,
    refetch,
  } = useApiQuery<TierDefinition[]>(["admin-tiers"], getTierDefinitions);

  const getTier = useMemo(() => {
    const tierMap = new Map<string, TierDefinition>();
    if (tiers) {
      for (const t of tiers) {
        tierMap.set(t.tier, t);
      }
    }
    return (tierKey: string): TierDefinition | undefined =>
      tierMap.get(tierKey);
  }, [tiers]);

  return {
    tiers: tiers ?? [],
    isLoading,
    getTier,
    refetch,
  };
}
