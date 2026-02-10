import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckSquare,
  Wheat,
  Heart,
  Flame,
  Star,
  TrendingUp,
} from "lucide-react";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { StatisticCard } from "./components/StatisticCard";
import { calculateStatistics } from "@/utils/statisticsCalculations";
import {
  getMyRoutineStats,
  getMyFeedingStats,
  getTeamRoutineStats,
} from "@/services/statisticsService";

/**
 * My Statistics Page - Personal activity overview with real data
 *
 * Shows user's statistics over the last 30 days:
 * - Completed routines with weekly trend
 * - Feedings given with weekly trend
 * - Unique horses cared for
 * - Completion streak (consecutive days)
 * - Favorite routine (most frequently completed)
 * - Team contribution percentage
 */
export default function MyStatisticsPage() {
  const { t } = useTranslation(["common"]);
  const { currentOrganizationId } = useOrganizationContext();
  const { user } = useAuth();

  // Fetch user's routine completions (last 30 days)
  const { data: myRoutines, isLoading: loadingRoutines } = useApiQuery(
    ["statistics", "my-routines", currentOrganizationId, user?.uid],
    () => getMyRoutineStats(currentOrganizationId!, user!.uid),
    {
      enabled: !!currentOrganizationId && !!user,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  );

  // Fetch user's feeding activities (last 30 days)
  const { data: myFeedings, isLoading: loadingFeedings } = useApiQuery(
    ["statistics", "my-feedings", currentOrganizationId, user?.uid],
    () => getMyFeedingStats(currentOrganizationId!, user!.uid),
    {
      enabled: !!currentOrganizationId && !!user,
      staleTime: 5 * 60 * 1000,
    },
  );

  // Fetch team routine completions (for contribution %)
  const { data: teamRoutines, isLoading: loadingTeam } = useApiQuery(
    ["statistics", "team-routines", currentOrganizationId],
    () => getTeamRoutineStats(currentOrganizationId!),
    {
      enabled: !!currentOrganizationId,
      staleTime: 5 * 60 * 1000,
    },
  );

  // Calculate all statistics
  const stats = useMemo(() => {
    if (!myRoutines || !myFeedings || !teamRoutines) return null;
    return calculateStatistics(myRoutines, myFeedings, teamRoutines);
  }, [myRoutines, myFeedings, teamRoutines]);

  const isLoading = loadingRoutines || loadingFeedings || loadingTeam;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("common:myPage.statistics.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("common:myPage.statistics.subtitle")}
        </p>
      </div>

      {!isLoading && (!stats || stats.completedRoutines.total === 0) && (
        <div className="text-center py-12 text-muted-foreground">
          {t("common:myPage.statistics.noData")}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatisticCard
          title={t("common:myPage.statistics.completedRoutines")}
          value={stats?.completedRoutines.total || 0}
          icon={CheckSquare}
          trend={{
            value: `+${stats?.completedRoutines.thisWeek || 0}`,
            label: t("common:myPage.statistics.thisWeek"),
            isPositive: true,
          }}
          isLoading={isLoading}
        />

        <StatisticCard
          title={t("common:myPage.statistics.feedingsGiven")}
          value={stats?.feedingsGiven.total || 0}
          icon={Wheat}
          trend={{
            value: `+${stats?.feedingsGiven.thisWeek || 0}`,
            label: t("common:myPage.statistics.thisWeek"),
            isPositive: true,
          }}
          isLoading={isLoading}
        />

        <StatisticCard
          title={t("common:myPage.statistics.horsesCaredFor")}
          value={stats?.horsesCaredFor || 0}
          icon={Heart}
          subtitle={t("common:myPage.statistics.lastMonth")}
          isLoading={isLoading}
        />

        <StatisticCard
          title={t("common:myPage.statistics.completionStreak")}
          value={`🔥 ${stats?.completionStreak || 0}`}
          icon={Flame}
          subtitle={t("common:myPage.statistics.days")}
          isLoading={isLoading}
        />

        <StatisticCard
          title={t("common:myPage.statistics.favoriteRoutine")}
          value={
            stats?.favoriteRoutine?.templateName ||
            t("common:myPage.statistics.noFavorite")
          }
          icon={Star}
          subtitle={
            stats?.favoriteRoutine
              ? `${stats.favoriteRoutine.count} ${t("common:myPage.statistics.times")}`
              : undefined
          }
          isLoading={isLoading}
        />

        <StatisticCard
          title={t("common:myPage.statistics.teamContribution")}
          value={`${stats?.teamContribution || 0}%`}
          icon={TrendingUp}
          subtitle={t("common:myPage.statistics.ofTotal")}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
