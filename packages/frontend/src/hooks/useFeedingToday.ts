/**
 * Hook for fetching and aggregating today's feeding sessions from routine instances.
 *
 * Uses routines as the single source of truth for feeding completion.
 * Aggregates feeding steps from routine instances and links them to FeedingTimes.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { getRoutineInstances } from "@/services/routineService";
import { getFeedingTimesByStable } from "@/services/feedingTimeService";
import {
  aggregateFeedingSessions,
  sortFeedingSessionsByTime,
  type FeedingSessionView,
} from "@/utils/feedingAggregation";
import type { RoutineInstance } from "@shared/types";
import type { FeedingTime } from "@shared/types";

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
}

/**
 * Hook for fetching today's feeding sessions from routine instances
 *
 * @param stableId - Stable ID to fetch feeding sessions for
 * @param date - Optional date (defaults to today)
 * @returns Feeding sessions and related data
 *
 * @example
 * ```tsx
 * function FeedingTodayPage() {
 *   const { currentStable } = useOrganizationContext();
 *   const { sessions, loading, stats } = useFeedingToday(currentStable?.id);
 *
 *   if (loading) return <Spinner />;
 *
 *   return (
 *     <div>
 *       <Progress value={stats.progressPercent} />
 *       {sessions.map(session => (
 *         <FeedingSessionCard key={`${session.instanceId}-${session.stepId}`} session={session} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFeedingToday(
  stableId: string | null | undefined,
  date?: Date,
): UseFeedingTodayResult {
  const [instances, setInstances] = useState<RoutineInstance[]>([]);
  const [feedingTimes, setFeedingTimes] = useState<FeedingTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch routine instances and feeding times
  const loadData = useCallback(async () => {
    if (!stableId) {
      setInstances([]);
      setFeedingTimes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch in parallel
      const targetDate = date || new Date();
      const [instancesData, feedingTimesData] = await Promise.all([
        getRoutineInstances(stableId, targetDate),
        getFeedingTimesByStable(stableId, true), // active only
      ]);

      setInstances(instancesData);
      setFeedingTimes(feedingTimesData);
    } catch (err) {
      console.error("Error loading feeding data:", err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [stableId, date]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadData();
  }, [loadData]);

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

  return {
    sessions,
    loading,
    error,
    refetch: loadData,
    instances,
    feedingTimes,
    stats,
  };
}
