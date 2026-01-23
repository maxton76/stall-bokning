import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CheckSquare,
  AlertTriangle,
  Wheat,
  Calendar,
  ArrowRight,
  ListChecks,
  Play,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

/**
 * Overview Page - Today's Dashboard
 *
 * Aggregates:
 * - Today's tasks and their status
 * - Upcoming feedings
 * - Overdue items
 * - Active routines
 * - Quick-complete actions
 */
export default function OverviewPage() {
  const { t } = useTranslation(["common"]);
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();

  // Placeholder data - will be replaced with actual data fetching
  const overviewData = useMemo(
    () => ({
      overdueTasks: 2,
      tasksToday: 5,
      tasksCompleted: 3,
      nextFeeding: "14:00",
      activeRoutines: 1,
      upcomingRoutines: 2,
    }),
    [],
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {t("common:overview.title")}
        </h1>
        <p className="text-muted-foreground">{t("common:overview.subtitle")}</p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Overdue Tasks */}
        {overviewData.overdueTasks > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-destructive">
                {t("common:overview.sections.overdue")}
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {overviewData.overdueTasks}
              </div>
              <Link
                to="/activities"
                className="text-xs text-muted-foreground hover:underline"
              >
                {t("common:buttons.viewDetails")} →
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Today's Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("common:overview.sections.myTasks")}
            </CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overviewData.tasksCompleted}/{overviewData.tasksToday}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("common:status.completed")}
            </p>
          </CardContent>
        </Card>

        {/* Next Feeding */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("common:overview.sections.nextFeeding")}
            </CardTitle>
            <Wheat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewData.nextFeeding}</div>
            <Link
              to="/feeding/today"
              className="text-xs text-muted-foreground hover:underline"
            >
              {t("common:buttons.viewDetails")} →
            </Link>
          </CardContent>
        </Card>

        {/* Active Routines */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("common:overview.sections.activeRoutines")}
            </CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overviewData.activeRoutines}
            </div>
            <p className="text-xs text-muted-foreground">
              +{overviewData.upcomingRoutines}{" "}
              {t("common:overview.sections.upcomingRoutines").toLowerCase()}
            </p>
          </CardContent>
        </Card>
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

      {/* Placeholder for future widgets */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t("common:overview.sections.myTasks")}
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t("common:overview.sections.activeRoutines")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <ListChecks className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("common:overview.emptyState.allDone")}</p>
              <Button asChild variant="link" className="mt-2">
                <Link to="/activities">
                  {t("common:buttons.viewAll")}{" "}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
