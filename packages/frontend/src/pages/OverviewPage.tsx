import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CheckSquare,
  Wheat,
  Calendar,
  ArrowRight,
  Play,
  Circle,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStables } from "@/hooks/useUserStables";
import { useRoutineInstancesForStable } from "@/hooks/useRoutines";
import { useActivitiesForPeriod } from "@/hooks/useActivities";
import { ScheduledRoutinesCard } from "@/components/routines/ScheduledRoutinesCard";
import { ACTIONABLE_ROUTINE_STATUSES } from "@/services/routineService";
import type { ActivityEntry } from "@/types/activity";

/**
 * Overview Page - Today's Dashboard
 *
 * Aggregates:
 * - Today's tasks and their status
 * - Active routines assigned to current user
 * - Quick-complete actions
 */
export default function OverviewPage() {
  const { t } = useTranslation(["common"]);
  const { user } = useAuth();

  // Fetch user's stables
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);

  // Fetch today's routine instances across all stables
  const today = useMemo(() => new Date(), []);
  const { instances: routineInstances, loading: routinesLoading } =
    useRoutineInstancesForStable("all", stables, today);

  // Filter: only my actionable routines
  const myActionableRoutines = useMemo(() => {
    if (!user?.uid) return [];
    return routineInstances.filter(
      (instance) =>
        (instance.assignedTo === user.uid || instance.startedBy === user.uid) &&
        ACTIONABLE_ROUTINE_STATUSES.includes(instance.status),
    );
  }, [routineInstances, user?.uid]);

  // Fetch today's activities across all stables
  const { activities, loading: activitiesLoading } = useActivitiesForPeriod(
    "all",
    stables,
    today,
    "day",
  );

  // Filter: only my non-completed activities/tasks
  const myPendingTasks = useMemo(() => {
    if (!user?.uid) return [];
    return activities.filter((entry: ActivityEntry) => {
      const hasAssignment =
        "assignedTo" in entry && entry.assignedTo === user.uid;
      return (
        hasAssignment &&
        entry.status !== "completed" &&
        entry.status !== "cancelled"
      );
    });
  }, [activities, user?.uid]);

  const isLoading = stablesLoading || routinesLoading;
  const isTasksLoading = stablesLoading || activitiesLoading;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {t("common:overview.title")}
        </h1>
        <p className="text-muted-foreground">{t("common:overview.subtitle")}</p>
      </div>

      {/* My Tasks Today & Active Routines */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* My Tasks Today */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {t("common:overview.sections.myTasks")}
              </CardTitle>
              {myPendingTasks.length > 0 && (
                <Badge variant="secondary" className="font-normal">
                  {myPendingTasks.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isTasksLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : myPendingTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t("common:overview.emptyState.noTasks")}</p>
                <Button asChild variant="link" className="mt-2">
                  <Link to="/activities">
                    {t("common:buttons.viewAll")}{" "}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {myPendingTasks.slice(0, 5).map((entry) => (
                  <Link
                    key={entry.id}
                    to="/activities"
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    {entry.status === "in-progress" ? (
                      <CheckCircle2 className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="text-sm truncate flex-1">
                      {entry.type === "activity" && "horseName" in entry
                        ? entry.horseName
                        : "title" in entry
                          ? entry.title
                          : "—"}
                    </span>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {entry.type === "activity"
                        ? t("common:navigation.activities")
                        : t("common:navigation.tasks")}
                    </Badge>
                  </Link>
                ))}
                {myPendingTasks.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    {t("common:overview.taskCount", {
                      count: myPendingTasks.length - 5,
                    })}{" "}
                    ...
                  </p>
                )}
                <div className="pt-2 border-t">
                  <Button
                    asChild
                    variant="link"
                    className="w-full justify-center"
                    size="sm"
                  >
                    <Link to="/activities">
                      {t("common:buttons.viewAll")}{" "}
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Routines - uses the existing ScheduledRoutinesCard */}
        <ScheduledRoutinesCard
          routineInstances={myActionableRoutines}
          isLoading={isLoading}
          selectedStableId="all"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t("common:overview.sections.quickActions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Button asChild variant="outline" className="h-auto py-4 flex-col">
              <Link to="/activities">
                <Play className="h-6 w-6 mb-2" />
                <span>{t("common:navigation.todaysWork")}</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col">
              <Link to="/feeding/today">
                <Wheat className="h-6 w-6 mb-2" />
                <span>{t("common:navigation.feedingToday")}</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col">
              <Link to="/schedule/week">
                <Calendar className="h-6 w-6 mb-2" />
                <span>{t("common:navigation.schedule")}</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
