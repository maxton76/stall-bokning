import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { sv, enUS } from "date-fns/locale";
import {
  TrendingUp,
  Package,
  Users,
  DollarSign,
  Calendar,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useUserStables } from "@/hooks/useUserStables";
import { queryKeys } from "@/lib/queryClient";
import {
  getFeedAnalytics,
  type AnalyticsPeriod,
} from "@/services/feedAnalyticsService";
import { FeedingCostChart } from "@/components/feeding/FeedingCostChart";
import { FeedConsumptionTable } from "@/components/feeding/FeedConsumptionTable";
import type { FeedAnalytics } from "@stall-bokning/shared";
import { cn } from "@/lib/utils";

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
  isLoading = false,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  variant?: "default" | "success" | "warning";
  isLoading?: boolean;
}) {
  const variantStyles = {
    default: "text-primary",
    success: "text-green-600 dark:text-green-400",
    warning: "text-amber-600 dark:text-amber-400",
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div
            className={cn("rounded-lg bg-muted p-2", variantStyles[variant])}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-7 w-24" />
            ) : (
              <>
                <p className="text-2xl font-bold">{value}</p>
                {subtitle && (
                  <p className="text-xs text-muted-foreground">{subtitle}</p>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FeedingOverviewPage() {
  const { t, i18n } = useTranslation(["feeding", "common"]);
  const { user } = useAuth();
  const locale = i18n.language === "sv" ? sv : enUS;
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);

  // State
  const [selectedStableId, setSelectedStableId] = useState<string | null>(null);
  const [period, setPeriod] = useState<AnalyticsPeriod>("monthly");
  const [referenceDate, setReferenceDate] = useState(new Date());

  // Get organization ID from selected stable
  const selectedStable = stables.find((s) => s.id === selectedStableId);
  const organizationId = selectedStable?.organizationId;

  // Reference date string for query key
  const referenceDateString = referenceDate.toISOString().split("T")[0] ?? "";

  // Analytics data
  const analyticsQuery = useApiQuery<FeedAnalytics>(
    queryKeys.feedAnalytics.byStable(
      selectedStableId || "",
      period,
      referenceDateString,
    ),
    () =>
      getFeedAnalytics(
        selectedStableId!,
        organizationId!,
        period,
        referenceDate,
      ),
    {
      enabled: !!selectedStableId && !!organizationId,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  );

  // Auto-select first stable
  useEffect(() => {
    if (stables.length > 0 && !selectedStableId && stables[0]) {
      setSelectedStableId(stables[0].id);
    }
  }, [stables, selectedStableId]);

  // Calculate date range for display
  const dateRange = useMemo(() => {
    let start: Date;
    let end: Date;

    if (period === "weekly") {
      start = startOfWeek(referenceDate, { weekStartsOn: 1 });
      end = endOfWeek(referenceDate, { weekStartsOn: 1 });
    } else {
      start = startOfMonth(referenceDate);
      end = endOfMonth(referenceDate);
    }

    return { start, end };
  }, [period, referenceDate]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(i18n.language === "sv" ? "sv-SE" : "en-US", {
      style: "currency",
      currency: "SEK",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Navigate months/weeks
  const navigatePeriod = (direction: "prev" | "next") => {
    const newDate = new Date(referenceDate);
    if (period === "monthly") {
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
    } else {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    }
    setReferenceDate(newDate);
  };

  // Go to current period
  const goToCurrentPeriod = () => {
    setReferenceDate(new Date());
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("feeding:analytics.title")}
        description={t("feeding:analytics.description")}
      />

      {/* Stable Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">
                {t("common:labels.stable")}
              </label>
              <Select
                value={selectedStableId || ""}
                onValueChange={setSelectedStableId}
                disabled={stablesLoading}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t("common:labels.selectStable")} />
                </SelectTrigger>
                <SelectContent>
                  {stables.map((stable) => (
                    <SelectItem key={stable.id} value={stable.id}>
                      {stable.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={period}
                onValueChange={(value) => setPeriod(value as AnalyticsPeriod)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">
                    {t("feeding:analytics.weekly")}
                  </SelectItem>
                  <SelectItem value="monthly">
                    {t("feeding:analytics.monthly")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigatePeriod("prev")}
              >
                <span className="sr-only">{t("common:buttons.back")}</span>
                &larr;
              </Button>
              <Button variant="outline" size="sm" onClick={goToCurrentPeriod}>
                {period === "monthly"
                  ? format(referenceDate, "MMMM yyyy", { locale })
                  : `${format(dateRange.start, "d MMM", { locale })} - ${format(dateRange.end, "d MMM", { locale })}`}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigatePeriod("next")}
              >
                <span className="sr-only">{t("common:buttons.next")}</span>
                &rarr;
              </Button>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => analyticsQuery.refetch()}
              disabled={analyticsQuery.isLoading}
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4",
                  analyticsQuery.isLoading && "animate-spin",
                )}
              />
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedStableId && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              title={t("feeding:analytics.totalCost")}
              value={
                analyticsQuery.data
                  ? formatCurrency(analyticsQuery.data.totalCost)
                  : "-"
              }
              subtitle={t("feeding:analytics.forPeriod")}
              icon={DollarSign}
              variant="default"
              isLoading={analyticsQuery.isLoading}
            />
            <SummaryCard
              title={t("feeding:analytics.dailyAverage")}
              value={
                analyticsQuery.data
                  ? formatCurrency(analyticsQuery.data.averageDailyCost)
                  : "-"
              }
              subtitle={t("feeding:analytics.perDay")}
              icon={TrendingUp}
              variant="success"
              isLoading={analyticsQuery.isLoading}
            />
            <SummaryCard
              title={t("feeding:analytics.feedTypesUsed")}
              value={analyticsQuery.data?.feedTypeBreakdown.length ?? "-"}
              subtitle={t("feeding:analytics.activeFeedTypes")}
              icon={Package}
              isLoading={analyticsQuery.isLoading}
            />
            <SummaryCard
              title={t("feeding:analytics.horsesTracked")}
              value={analyticsQuery.data?.horseBreakdown.length ?? "-"}
              subtitle={t("feeding:analytics.withFeedings")}
              icon={Users}
              isLoading={analyticsQuery.isLoading}
            />
          </div>

          {/* Charts and Tables */}
          {analyticsQuery.isLoading ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-80 w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-80 w-full" />
                </CardContent>
              </Card>
            </div>
          ) : analyticsQuery.error ? (
            <Card>
              <CardContent className="flex h-64 flex-col items-center justify-center">
                <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-center text-muted-foreground">
                  {t("common:errors.generic")}
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => analyticsQuery.refetch()}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t("common:actions.retry")}
                </Button>
              </CardContent>
            </Card>
          ) : analyticsQuery.data ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <FeedingCostChart analytics={analyticsQuery.data} />
              <FeedConsumptionTable analytics={analyticsQuery.data} />
            </div>
          ) : null}

          {/* Period Info */}
          {analyticsQuery.data && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("feeding:analytics.periodSummary")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("feeding:analytics.period")}
                    </p>
                    <p className="font-medium">
                      {format(dateRange.start, "d MMMM", { locale })} -{" "}
                      {format(dateRange.end, "d MMMM yyyy", { locale })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("feeding:analytics.totalFeedings")}
                    </p>
                    <p className="font-medium">
                      {analyticsQuery.data.horseBreakdown.reduce(
                        (sum, h) => sum + h.totalFeedings,
                        0,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("feeding:analytics.completionRate")}
                    </p>
                    <p className="font-medium">
                      {analyticsQuery.data.feedingCompletionRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("feeding:analytics.wasteAmount")}
                    </p>
                    <p className="font-medium">
                      {formatCurrency(analyticsQuery.data.wasteCost)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
