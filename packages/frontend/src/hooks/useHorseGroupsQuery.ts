import { useApiQuery } from "./useApiQuery";
import { queryKeys } from "../lib/queryClient";
import { getOrganizationHorseGroups } from "../services/horseGroupService";
import type { HorseGroup } from "@/types/roles";

/**
 * Hook for loading horse groups for an organization using TanStack Query.
 *
 * Note: Horse groups are now organization-scoped, not stable-scoped.
 * The queryKeys still use stable naming for compatibility, but fetch organization groups.
 *
 * @param organizationId - Organization ID to load horse groups for
 *
 * @example
 * ```tsx
 * const { horseGroups, loading, error, refetch } = useHorseGroupsQuery(organizationId);
 * ```
 */
export function useHorseGroupsQuery(organizationId: string | undefined) {
  const query = useApiQuery<HorseGroup[]>(
    queryKeys.horseGroups.list(organizationId || ""),
    () => getOrganizationHorseGroups(organizationId!),
    {
      enabled: !!organizationId,
      staleTime: 5 * 60 * 1000, // Horse groups change infrequently
    },
  );

  return {
    horseGroups: query.data ?? [],
    data: query.data ?? [], // Compatibility with useAsyncData pattern
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    query,
  };
}
