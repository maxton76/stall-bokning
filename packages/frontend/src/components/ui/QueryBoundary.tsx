import { useState, useEffect, ReactNode } from "react";
import { UseQueryResult } from "@tanstack/react-query";
import { DefaultLoadingState } from "./DefaultLoadingState";
import { SlowLoadingState } from "./SlowLoadingState";
import { ErrorState } from "./ErrorState";

interface QueryBoundaryProps<T> {
  /** The TanStack Query result object */
  query: UseQueryResult<T, Error>;
  /** Render function for successful data */
  children: (data: T) => ReactNode;

  // Customization options
  /** Custom loading fallback component */
  loadingFallback?: ReactNode;
  /** Custom error fallback component */
  errorFallback?: ReactNode;
  /** Milliseconds before showing "slow" state (default: 5000) */
  slowThreshold?: number;
  /** Whether to show retry button when loading is slow (default: true) */
  showRetryOnSlow?: boolean;
}

/**
 * Query Boundary component for handling TanStack Query loading/error states.
 *
 * This component provides a consistent way to handle all query states:
 * - Loading: Shows default loading spinner
 * - Slow Loading: After threshold, shows "taking longer" message with retry
 * - Error: Shows error message with retry button
 * - Success: Renders children with data
 *
 * Designed to handle Cloud Run cold starts gracefully by showing appropriate
 * feedback when requests take longer than expected.
 *
 * @example
 * ```tsx
 * function MyPage() {
 *   const query = useApiQuery(['my-data'], fetchMyData);
 *
 *   return (
 *     <QueryBoundary query={query}>
 *       {(data) => <MyDataDisplay data={data} />}
 *     </QueryBoundary>
 *   );
 * }
 * ```
 *
 * @example
 * // With custom loading state
 * ```tsx
 * <QueryBoundary
 *   query={query}
 *   loadingFallback={<MySkeleton />}
 *   slowThreshold={3000}
 * >
 *   {(data) => <DataDisplay data={data} />}
 * </QueryBoundary>
 * ```
 */
export function QueryBoundary<T>({
  query,
  children,
  loadingFallback,
  errorFallback,
  slowThreshold = 5000,
  showRetryOnSlow = true,
}: QueryBoundaryProps<T>) {
  const [isSlow, setIsSlow] = useState(false);

  // Track if loading is taking too long
  useEffect(() => {
    if (query.isLoading || query.isFetching) {
      const timer = setTimeout(() => setIsSlow(true), slowThreshold);
      return () => clearTimeout(timer);
    }
    setIsSlow(false);
  }, [query.isLoading, query.isFetching, slowThreshold]);

  // Error state
  if (query.isError) {
    if (errorFallback) return <>{errorFallback}</>;

    return (
      <ErrorState
        message={query.error?.message}
        onRetry={() => query.refetch()}
      />
    );
  }

  // Loading state
  if (query.isLoading) {
    // Show slow loading state if threshold exceeded
    if (isSlow && showRetryOnSlow) {
      return <SlowLoadingState onRetry={() => query.refetch()} />;
    }

    // Custom loading fallback
    if (loadingFallback) return <>{loadingFallback}</>;

    // Default loading state
    return <DefaultLoadingState />;
  }

  // Success state - render children with data
  return <>{children(query.data as T)}</>;
}
