import {
  useQuery,
  UseQueryOptions,
  QueryKey,
  UseQueryResult,
} from "@tanstack/react-query";

/**
 * Extended options for useApiQuery with cold-start awareness
 */
interface ApiQueryOptions<TData, TError = Error> extends Omit<
  UseQueryOptions<TData, TError>,
  "queryKey" | "queryFn"
> {
  /**
   * Threshold in ms for considering a request "slow"
   * Used by QueryBoundary to show slow loading state
   * @default 5000
   */
  slowThreshold?: number;
}

/**
 * Default configuration for API queries
 * Optimized for handling Cloud Run cold starts
 */
const defaultApiQueryOptions = {
  // Retry up to 3 times with exponential backoff
  // This gives cold starts time to complete
  retry: 3,
  retryDelay: (attemptIndex: number) =>
    Math.min(1000 * 2 ** attemptIndex, 15000), // Max 15s between retries

  // Cache data for 5 minutes before considering stale
  staleTime: 5 * 60 * 1000,

  // Keep cached data for 10 minutes before garbage collection
  gcTime: 10 * 60 * 1000,
};

/**
 * API Query hook with cold-start-aware configuration.
 *
 * This hook wraps TanStack Query's useQuery with sensible defaults
 * for handling Cloud Run cold starts:
 * - 3 retries with exponential backoff (up to 15s between retries)
 * - 5 minute stale time for caching
 * - 10 minute garbage collection time
 *
 * Use this hook instead of useQuery directly for all API calls
 * to get consistent error handling and retry behavior.
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { data, isLoading, error } = useApiQuery(
 *   ['users', userId],
 *   () => fetchUser(userId),
 *   { enabled: !!userId }
 * );
 *
 * // With QueryBoundary
 * function UserProfile({ userId }) {
 *   const query = useApiQuery(['users', userId], () => fetchUser(userId));
 *   return (
 *     <QueryBoundary query={query}>
 *       {(user) => <UserCard user={user} />}
 *     </QueryBoundary>
 *   );
 * }
 * ```
 */
export function useApiQuery<TData>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: ApiQueryOptions<TData>,
): UseQueryResult<TData, Error> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { slowThreshold, ...queryOptions } = options ?? {};

  return useQuery<TData, Error>({
    queryKey,
    queryFn,
    ...defaultApiQueryOptions,
    ...queryOptions,
  });
}
