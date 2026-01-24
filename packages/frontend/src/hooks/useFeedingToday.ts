/**
 * Hook for fetching and aggregating today's feeding sessions from routine instances.
 *
 * Uses routines as the single source of truth for feeding completion.
 * Aggregates feeding steps from routine instances and links them to FeedingTimes.
 */

import { useMemo } from "react";
import { useApiQuery } from "./useApiQuery";
import { queryKeys } from "@/lib/queryClient";
import { getRoutineInstances } from "@/services/routineService";
import { getFeedingTimesByStable } from "@/services/feedingTimeService";
import {
  aggregateFeedingSessions,
  sortFeedingSessionsByTime,
  type FeedingSessionView,
} from "@/utils/feedingAggregation";
import type { RoutineInstance } from "@shared/types";
import type { FeedingTime } from "@shared/types";
import type { UseQueryResult } from "@tanstack/react-query";

interface FeedingTodayData {
  instances: RoutineInstance[];
  feedingTimes: FeedingTime[];
}

interface UseFeedingTodayResult {
  /** Feeding sessions aggregated from routine instances */
  sessions: FeedingSessionView[];
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Refresh data */
  refetch: () => Promise<void>;
  /** Raw routine instances (for advanced use cases) */
  instances: RoutineInstance[];
  /** Available feeding times for the stable */
  feedingTimes: FeedingTime[];
  /** Summary statistics */
  stats: {
    totalSessions: number;
    completedSessions: number;
    progressPercent: number;
    totalHorses: number;
    horsesCompleted: number;
  };
  /** Query object for QueryBoundary */
  query: UseQueryResult<FeedingTodayData, Error>;
}

/**
 * Hook for fetching today's feeding sessions from routine instances.
 *
 * Uses TanStack Query for automatic caching, retries, and cold-start handling.
 * Pair with QueryBoundary for consistent loading/error states.
 *
 * @param stableId - Stable ID to fetch feeding sessions for
 * @param date - Optional date (defaults to today)
 * @returns Feeding sessions and related data
 *
 * @example
 * ```tsx
 * function FeedingTodayPage() {
 *   const { currentStable } = useOrganizationContext();
 *   const { sessions, stats, query } = useFeedingToday(currentStable?.id);
 *
 *   return (
 *     <QueryBoundary query={query} loadingFallback={<FeedingSkeleton />}>
 *       {() => (
 *         <div>
 *           <Progress value={stats.progressPercent} />
 *           {sessions.map(session => (
 *             <FeedingSessionCard key={`${session.instanceId}-${session.stepId}`} session={session} />
 *           ))}
 *         </div>
 *       )}
 *     </QueryBoundary>
 *   );
 * }
 * ```
 */
export function useFeedingToday(
  stableId: string | null | undefined,
  date?: Date,
): UseFeedingTodayResult {
  // Format date for query key (YYYY-MM-DD or undefined for today)
  const dateString = date?.toISOString().split("T")[0];

  // Fetch routine instances and feeding times with useApiQuery
  const query = useApiQuery<FeedingTodayData>(
    queryKeys.feeding.today(stableId || "", dateString),
    async () => {
      if (!stableId) {
        return { instances: [], feedingTimes: [] };
      }

      // Fetch in parallel
      const targetDate = date || new Date();
      const [instances, feedingTimes] = await Promise.all([
        getRoutineInstances(stableId, targetDate),
        getFeedingTimesByStable(stableId, true), // active only
      ]);

      return { instances, feedingTimes };
    },
    { enabled: !!stableId },
  );

  // Extract raw data from query
  const instances = query.data?.instances ?? [];
  const feedingTimes = query.data?.feedingTimes ?? [];

  // Aggregate feeding sessions from instances
  const sessions = useMemo(() => {
    if (instances.length === 0) return [];

    const aggregated = aggregateFeedingSessions(instances, feedingTimes);
    return sortFeedingSessionsByTime(aggregated);
  }, [instances, feedingTimes]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(
      (s) => s.status === "completed",
    ).length;
    const progressPercent =
      totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

    const totalHorses = sessions.reduce((sum, s) => sum + s.horsesTotal, 0);
    const horsesCompleted = sessions.reduce(
      (sum, s) => sum + s.horsesCompleted,
      0,
    );

    return {
      totalSessions,
      completedSessions,
      progressPercent: Math.round(progressPercent),
      totalHorses,
      horsesCompleted,
    };
  }, [sessions]);

  // Wrap refetch to return void for legacy compatibility
  const refetch = async () => {
    await query.refetch();
  };

  return {
    sessions,
    loading: query.isLoading,
    error: query.error,
    refetch,
    instances,
    feedingTimes,
    stats,
    query,
  };
}
