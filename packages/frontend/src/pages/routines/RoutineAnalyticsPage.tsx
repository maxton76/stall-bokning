import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { subDays, startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Calendar,
  ArrowLeft,
  Settings2,
} from "lucide-react";
import {
  ROUTINE_TYPE_ICONS,
  ROUTINE_TYPE_SOLID_COLORS,
} from "@/constants/routineStyles";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStables } from "@/hooks/useUserStables";
import { useRoutineAnalytics } from "@/hooks/useRoutines";
import type { RoutineType } from "@shared/types";
import { cn } from "@/lib/utils";

type DateRangePreset = "thisMonth" | "lastMonth" | "lastThreeMonths" | "custom";

export default function RoutineAnalyticsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation(["routines", "common"]);
  const { user } = useAuth();

  const [selectedStableId, setSelectedStableId] = useState<string>("all");
  const [dateRangePreset, setDateRangePreset] =
    useState<DateRangePreset>("thisMonth");

  // Load user's stables
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);

  // Calculate date range based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (dateRangePreset) {
      case "thisMonth":
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
        };
      case "lastMonth":
        const lastMonth = subMonths(now, 1);
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth),
        };
      case "lastThreeMonths":
        return {
          start: startOfMonth(subMonths(now, 2)),
          end: endOfMonth(now),
        };
      default:
        return {
          start: subDays(now, 30),
          end: now,
        };
    }
  }, [dateRangePreset]);

  // Get active stable ID
  const activeStableId =
    selectedStableId === "all" ? stables[0]?.id : selectedStableId;

  // Load analytics
  const { analytics, loading: analyticsLoading } = useRoutineAnalytics(
    activeStableId,
    dateRange,
  );

  const loading = stablesLoading || analyticsLoading;

  if (stablesLoading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">{t("common:loading")}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("routines:analytics.title")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("routines:analytics.description")}
            </p>
          </div>
        </div>

        <Button variant="outline" onClick={() => navigate("/activities")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("common:buttons.back")}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Stable Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">
                {t("common:labels.stable")}
              </label>
              <Select
                value={selectedStableId}
                onValueChange={setSelectedStableId}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t("common:labels.selectStable")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common:labels.all")}</SelectItem>
                  {stables.map((stable) => (
                    <SelectItem key={stable.id} value={stable.id}>
                      {stable.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">
                <Calendar className="h-4 w-4 inline mr-1" />
                {t("routines:analytics.selectDateRange")}
              </label>
              <Select
                value={dateRangePreset}
                onValueChange={(v) => setDateRangePreset(v as DateRangePreset)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thisMonth">
                    {t("routines:analytics.thisMonth")}
                  </SelectItem>
                  <SelectItem value="lastMonth">
                    {t("routines:analytics.lastMonth")}
                  </SelectItem>
                  <SelectItem value="lastThreeMonths">
                    {t("routines:analytics.lastThreeMonths")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-muted-foreground self-center">
              {format(dateRange.start, "d MMM")} -{" "}
              {format(dateRange.end, "d MMM yyyy")}
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">{t("common:loading")}</p>
        </div>
      ) : !analytics ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {t("routines:analytics.noData")}
            </h3>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("routines:analytics.completionRate")}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.completionRate}%
                </div>
                <Progress value={analytics.completionRate} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("routines:analytics.averageDuration")}
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.averageDuration} {t("routines:flow.minutes")}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("routines:analytics.completed")}:{" "}
                  {analytics.totalCompleted}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("routines:analytics.totalCompleted")}
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {analytics.totalCompleted}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("routines:analytics.scheduled")}:{" "}
                  {analytics.totalScheduled}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("routines:analytics.totalMissed")}
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {analytics.totalMissed}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.totalScheduled > 0
                    ? `${Math.round((analytics.totalMissed / analytics.totalScheduled) * 100)}%`
                    : "0%"}{" "}
                  {t("routines:status.missed").toLowerCase()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* By Type and By User */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* By Routine Type */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {t("routines:analytics.byType")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(analytics.byType).length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    {t("routines:analytics.noData")}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(analytics.byType).map(([type, data]) => {
                      const TypeIcon =
                        ROUTINE_TYPE_ICONS[type as RoutineType] ?? Settings2;
                      const completionRate =
                        data.scheduled > 0
                          ? Math.round((data.completed / data.scheduled) * 100)
                          : 0;

                      return (
                        <div key={type} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center text-white",
                                  ROUTINE_TYPE_SOLID_COLORS[
                                    type as RoutineType
                                  ] ?? "bg-gray-500",
                                )}
                              >
                                <TypeIcon className="h-4 w-4" />
                              </div>
                              <span className="font-medium">
                                {t(`routines:types.${type}`)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {data.completed}/{data.scheduled}
                              </Badge>
                              <span className="text-sm font-medium">
                                {completionRate}%
                              </span>
                            </div>
                          </div>
                          <Progress value={completionRate} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* By User */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t("routines:analytics.byUser")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(analytics.byUser).length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    {t("routines:analytics.noData")}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(analytics.byUser)
                      .sort(([, a], [, b]) => b.points - a.points)
                      .map(([userId, data]) => {
                        const completionRate =
                          data.assigned > 0
                            ? Math.round((data.completed / data.assigned) * 100)
                            : 0;

                        return (
                          <div
                            key={userId}
                            className="flex items-center justify-between p-3 rounded-lg border"
                          >
                            <div>
                              <p className="font-medium text-sm">
                                {userId.substring(0, 8)}...
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {data.completed}/{data.assigned}{" "}
                                {t(
                                  "routines:analytics.completed",
                                ).toLowerCase()}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge
                                variant={
                                  completionRate >= 80 ? "default" : "secondary"
                                }
                              >
                                {completionRate}%
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                {data.points} {t("common:labels.points")}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
