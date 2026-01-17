import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  addDays,
  addWeeks,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
} from "date-fns";
import { sv, enUS } from "date-fns/locale";
import {
  Users,
  Calendar,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
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
import { useAsyncData } from "@/hooks/useAsyncData";
import { useOrganization } from "@/contexts/OrganizationContext";
import { getStaffAvailabilityMatrix } from "@/services/availabilityService";
import { StaffMatrixGrid } from "@/components/availability/StaffMatrixGrid";
import type { StaffAvailabilityMatrix } from "@stall-bokning/shared";
import { cn } from "@/lib/utils";

type DateRangePreset = "thisWeek" | "nextWeek" | "twoWeeks" | "thisMonth";

/**
 * Get date range based on preset
 */
function getDateRange(preset: DateRangePreset): { start: Date; end: Date } {
  const now = new Date();
  const weekStartsOn = 1; // Monday

  switch (preset) {
    case "thisWeek":
      return {
        start: startOfWeek(now, { weekStartsOn }),
        end: endOfWeek(now, { weekStartsOn }),
      };
    case "nextWeek":
      return {
        start: startOfWeek(addWeeks(now, 1), { weekStartsOn }),
        end: endOfWeek(addWeeks(now, 1), { weekStartsOn }),
      };
    case "twoWeeks":
      return {
        start: startOfWeek(now, { weekStartsOn }),
        end: endOfWeek(addWeeks(now, 1), { weekStartsOn }),
      };
    case "thisMonth":
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
    default:
      return {
        start: startOfWeek(now, { weekStartsOn }),
        end: endOfWeek(now, { weekStartsOn }),
      };
  }
}

export default function StaffMatrixPage() {
  const { t, i18n } = useTranslation(["availability", "common"]);
  const { selectedOrganization } = useOrganization();
  const locale = i18n.language === "sv" ? sv : enUS;

  // State
  const [dateRangePreset, setDateRangePreset] =
    useState<DateRangePreset>("twoWeeks");
  const [showDetails, setShowDetails] = useState(false);

  // Calculate date range
  const dateRange = useMemo(
    () => getDateRange(dateRangePreset),
    [dateRangePreset],
  );

  // Data
  const matrixData = useAsyncData<StaffAvailabilityMatrix>({
    loadFn: async () => {
      if (!selectedOrganization?.id) {
        throw new Error("No organization selected");
      }
      return getStaffAvailabilityMatrix(
        selectedOrganization.id,
        dateRange.start,
        dateRange.end,
      );
    },
  });

  // Load data when organization or date range changes
  useEffect(() => {
    if (selectedOrganization?.id) {
      matrixData.load();
    }
  }, [
    selectedOrganization?.id,
    dateRange.start.getTime(),
    dateRange.end.getTime(),
  ]);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!matrixData.data) {
      return {
        totalStaff: 0,
        availableToday: 0,
        onLeaveToday: 0,
        shortageDays: 0,
        averageCoverage: 0,
      };
    }

    const today = format(new Date(), "yyyy-MM-dd");
    const todaySummary = matrixData.data.teamSummary.find(
      (d) => d.date === today,
    );

    return {
      totalStaff: matrixData.data.staffAvailability.length,
      availableToday: todaySummary?.availableStaff || 0,
      onLeaveToday:
        (todaySummary?.totalStaff || 0) - (todaySummary?.availableStaff || 0),
      shortageDays: matrixData.data.shortageCount,
      averageCoverage: matrixData.data.averageDailyAvailability,
    };
  }, [matrixData.data]);

  const handleRefresh = () => {
    matrixData.load();
  };

  if (!selectedOrganization) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">
              {t("common:labels.selectStable")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {t("availability:staffMatrix.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("availability:staffMatrix.pageDescription")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                {t("availability:staffMatrix.hideDetails")}
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                {t("availability:staffMatrix.showDetails")}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={matrixData.isLoading}
          >
            <RefreshCw
              className={cn(
                "mr-2 h-4 w-4",
                matrixData.isLoading && "animate-spin",
              )}
            />
            {t("availability:staffMatrix.refreshData")}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t("availability:staffMatrix.summary.totalStaff")}
            </CardDescription>
            <CardTitle className="text-2xl">
              {matrixData.isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                stats.totalStaff
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              {t("availability:staffMatrix.summary.availableToday")}
            </CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {matrixData.isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                stats.availableToday
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-600" />
              {t("availability:staffMatrix.summary.onLeaveToday")}
            </CardDescription>
            <CardTitle className="text-2xl text-amber-600">
              {matrixData.isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                stats.onLeaveToday
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card
          className={cn(
            stats.shortageDays > 0 &&
              "border-red-200 bg-red-50 dark:bg-red-900/10",
          )}
        >
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle
                className={cn(
                  "h-4 w-4",
                  stats.shortageDays > 0
                    ? "text-red-600"
                    : "text-muted-foreground",
                )}
              />
              {t("availability:staffMatrix.summary.shortagedays")}
            </CardDescription>
            <CardTitle
              className={cn(
                "text-2xl",
                stats.shortageDays > 0 ? "text-red-600" : "",
              )}
            >
              {matrixData.isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                stats.shortageDays
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {t("availability:staffMatrix.summary.averageCoverage")}
            </CardDescription>
            <CardTitle
              className={cn(
                "text-2xl",
                stats.averageCoverage >= 75
                  ? "text-green-600"
                  : stats.averageCoverage >= 50
                    ? "text-amber-600"
                    : "text-red-600",
              )}
            >
              {matrixData.isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                `${stats.averageCoverage}%`
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {t("availability:staffMatrix.dateRange")}:
          </span>
        </div>
        <Select
          value={dateRangePreset}
          onValueChange={(value) =>
            setDateRangePreset(value as DateRangePreset)
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="thisWeek">
              {t("availability:staffMatrix.thisWeek")}
            </SelectItem>
            <SelectItem value="nextWeek">
              {t("availability:staffMatrix.nextWeek")}
            </SelectItem>
            <SelectItem value="twoWeeks">
              {t("availability:staffMatrix.thisTwoWeeks")}
            </SelectItem>
            <SelectItem value="thisMonth">
              {t("availability:staffMatrix.thisMonth")}
            </SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground">
          {format(dateRange.start, "d MMM", { locale })} -{" "}
          {format(dateRange.end, "d MMM yyyy", { locale })}
        </span>
      </div>

      {/* Matrix Grid */}
      <Card>
        <CardContent className="p-4">
          {matrixData.isLoading ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Skeleton className="h-10 w-[200px]" />
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-12" />
                ))}
              </div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-2">
                  <Skeleton className="h-12 w-[200px]" />
                  {Array.from({ length: 7 }).map((_, j) => (
                    <Skeleton key={j} className="h-12 w-12" />
                  ))}
                </div>
              ))}
            </div>
          ) : matrixData.error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium">
                {t("common:errors.generic")}
              </h3>
              <Button
                variant="outline"
                className="mt-4"
                onClick={handleRefresh}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("common:actions.retry")}
              </Button>
            </div>
          ) : matrixData.data ? (
            <StaffMatrixGrid
              matrix={matrixData.data}
              showDetails={showDetails}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
