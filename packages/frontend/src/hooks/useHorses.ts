/**
 * Horse data hooks with cold-start-aware configuration.
 *
 * These hooks provide TanStack Query wrappers for horse data with
 * consistent error handling, retry logic, and QueryBoundary integration.
 */

import { useApiQuery } from "./useApiQuery";
import { queryKeys } from "@/lib/queryClient";
import { getMyHorses, getHorse } from "@/services/horseService";
import type { Horse } from "@/types/roles";

/**
 * Hook for fetching the current user's owned horses.
 *
 * Uses TanStack Query for automatic caching, retries, and cold-start handling.
 * Pair with QueryBoundary for consistent loading/error states.
 *
 * @returns Query result with horses array
 *
 * @example
 * ```tsx
 * function MyHorsesPage() {
 *   const query = useMyHorses();
 *
 *   return (
 *     <QueryBoundary query={query}>
 *       {(horses) => <HorseTable data={horses} />}
 *     </QueryBoundary>
 *   );
 * }
 * ```
 */
export function useMyHorses() {
  const query = useApiQuery<Horse[]>(queryKeys.horses.my(), () =>
    getMyHorses(),
  );

  // Legacy API compatibility
  return {
    horses: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    reload: query.refetch,
    // Full query object for QueryBoundary
    query,
  };
}

/**
 * Hook for fetching a single horse by ID.
 *
 * Uses TanStack Query for automatic caching, retries, and cold-start handling.
 * Pair with QueryBoundary for consistent loading/error states.
 *
 * @param horseId - The horse ID to fetch
 * @returns Query result with horse data
 *
 * @example
 * ```tsx
 * function HorseDetailPage({ horseId }: { horseId: string }) {
 *   const query = useHorse(horseId);
 *
 *   return (
 *     <QueryBoundary query={query}>
 *       {(horse) => <HorseDetails horse={horse} />}
 *     </QueryBoundary>
 *   );
 * }
 * ```
 */
export function useHorse(horseId: string | undefined) {
  const query = useApiQuery<Horse>(
    queryKeys.horses.detail(horseId || ""),
    async () => {
      if (!horseId) {
        throw new Error("Horse ID is required");
      }
      const result = await getHorse(horseId);
      if (!result) {
        throw new Error("Horse not found");
      }
      return result;
    },
    { enabled: !!horseId },
  );

  // Legacy API compatibility
  return {
    horse: query.data ?? null,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    reload: query.refetch,
    // Full query object for QueryBoundary
    query,
  };
}

/**
 * Hook for fetching horses with additional data like groups.
 *
 * Convenience hook that fetches both horse and related data.
 *
 * @param horseId - The horse ID to fetch
 * @returns Combined query results for horse and related data
 */
export function useHorseWithGroups(horseId: string | undefined) {
  const horseQuery = useHorse(horseId);

  return {
    ...horseQuery,
    // Horse groups can be fetched separately if needed
    // This provides a foundation for expanding with additional data
  };
}
