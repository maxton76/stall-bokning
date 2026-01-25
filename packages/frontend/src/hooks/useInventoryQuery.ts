import { useApiQuery } from "./useApiQuery";
import { queryKeys } from "../lib/queryClient";
import {
  getStableInventory,
  getInventoryTransactions,
  getInventoryAlerts,
} from "../services/inventoryService";
import type {
  FeedInventory,
  InventoryTransaction,
  InventoryAlert,
  InventoryStatus,
} from "@stall-bokning/shared";

/**
 * Hook for loading inventory items for a stable using TanStack Query.
 *
 * Provides automatic caching, background refetching, and proper cache invalidation.
 *
 * @param stableId - Stable ID to load inventory for
 * @param status - Optional status filter
 *
 * @example
 * ```tsx
 * const { inventory, loading, error, refetch } = useInventoryQuery(stableId);
 * ```
 */
export function useInventoryQuery(
  stableId: string | undefined,
  status?: InventoryStatus,
) {
  const query = useApiQuery<FeedInventory[]>(
    queryKeys.inventory.byStable(stableId || ""),
    () => getStableInventory(stableId!, status),
    {
      enabled: !!stableId,
      staleTime: 2 * 60 * 1000, // Inventory changes moderately
    },
  );

  return {
    inventory: query.data ?? [],
    data: query.data ?? [], // Compatibility with useAsyncData pattern
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    query,
  };
}

/**
 * Hook for loading inventory transactions for an item.
 *
 * @param inventoryId - Inventory item ID
 * @param options - Query options (limit, type filter)
 *
 * @example
 * ```tsx
 * const { transactions, loading } = useInventoryTransactionsQuery(inventoryId);
 * ```
 */
export function useInventoryTransactionsQuery(
  inventoryId: string | undefined,
  options?: { limit?: number; type?: string },
) {
  const query = useApiQuery<InventoryTransaction[]>(
    queryKeys.inventory.transactions(inventoryId || ""),
    () => getInventoryTransactions(inventoryId!, options),
    {
      enabled: !!inventoryId,
      staleTime: 1 * 60 * 1000, // Transactions change more frequently
    },
  );

  return {
    transactions: query.data ?? [],
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    query,
  };
}

/**
 * Hook for loading inventory alerts for a stable.
 *
 * @param stableId - Stable ID
 * @param includeResolved - Include resolved alerts
 *
 * @example
 * ```tsx
 * const { alerts, loading } = useInventoryAlertsQuery(stableId);
 * ```
 */
export function useInventoryAlertsQuery(
  stableId: string | undefined,
  includeResolved: boolean = false,
) {
  const query = useApiQuery<InventoryAlert[]>(
    [
      ...queryKeys.inventory.byStable(stableId || ""),
      "alerts",
      { includeResolved },
    ],
    () => getInventoryAlerts(stableId!, includeResolved),
    {
      enabled: !!stableId,
      staleTime: 1 * 60 * 1000,
    },
  );

  return {
    alerts: query.data ?? [],
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    query,
  };
}
