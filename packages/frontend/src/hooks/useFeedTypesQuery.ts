import { useApiQuery } from "./useApiQuery";
import { queryKeys } from "../lib/queryClient";
import { getFeedTypesByOrganization } from "../services/feedTypeService";
import type { FeedType } from "@shared/types";

/**
 * Hook for loading feed types for an organization using TanStack Query.
 *
 * Provides automatic caching, background refetching, and proper cache invalidation.
 * Feed types are organization-scoped and shared across all stables.
 *
 * @param organizationId - Organization ID to load feed types for
 * @param includeInactive - Include inactive feed types (default: false for active only)
 *
 * @example
 * ```tsx
 * const { feedTypes, loading, error, refetch } = useFeedTypesQuery(
 *   organizationId,
 *   false // activeOnly
 * );
 * ```
 */
export function useFeedTypesQuery(
  organizationId: string | undefined,
  includeInactive: boolean = false,
) {
  const query = useApiQuery<FeedType[]>(
    queryKeys.feedTypes.byOrganization(organizationId || "", includeInactive),
    () => getFeedTypesByOrganization(organizationId!, !includeInactive),
    {
      enabled: !!organizationId,
      staleTime: 5 * 60 * 1000, // Feed types change infrequently
    },
  );

  return {
    feedTypes: query.data ?? [],
    data: query.data ?? [], // Compatibility with useAsyncData pattern
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    query,
  };
}
