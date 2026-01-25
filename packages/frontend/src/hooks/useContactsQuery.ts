import { useApiQuery } from "./useApiQuery";
import { queryKeys } from "../lib/queryClient";
import {
  getOrganizationContacts,
  getMyContacts,
} from "../services/contactService";
import type { Contact } from "@shared/types/contact";

/**
 * Hook for loading organization contacts using TanStack Query.
 *
 * Provides automatic caching, background refetching, and proper cache invalidation.
 *
 * @param organizationId - Organization ID to load contacts for
 *
 * @example
 * ```tsx
 * const { contacts, loading, error, refetch } = useOrganizationContactsQuery(
 *   organizationId
 * );
 * ```
 */
export function useOrganizationContactsQuery(
  organizationId: string | undefined,
) {
  const query = useApiQuery<Contact[]>(
    queryKeys.contacts.byOrganization(organizationId || ""),
    () => getOrganizationContacts(organizationId!),
    {
      enabled: !!organizationId,
      staleTime: 5 * 60 * 1000,
    },
  );

  return {
    contacts: query.data ?? [],
    data: query.data ?? [], // Compatibility with useAsyncData pattern
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    query,
  };
}

/**
 * Hook for loading all contacts accessible to a user (personal + organization).
 *
 * @param userId - User ID
 * @param organizationId - Optional organization ID to include org contacts
 *
 * @example
 * ```tsx
 * const { contacts, loading, error } = useMyContactsQuery(userId, organizationId);
 * ```
 */
export function useMyContactsQuery(
  userId: string | undefined,
  organizationId: string | undefined,
) {
  const query = useApiQuery<Contact[]>(
    queryKeys.contacts.list({ userId, organizationId }),
    () => getMyContacts(userId!, organizationId),
    {
      enabled: !!userId,
      staleTime: 5 * 60 * 1000,
    },
  );

  return {
    contacts: query.data ?? [],
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    query,
  };
}
