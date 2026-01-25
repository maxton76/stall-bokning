import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, AlertTriangle, Plus, Utensils } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import type { RoutineInstance } from "@shared/types";
import { format } from "date-fns";

// Types for feeding times
interface FeedingTime {
  id: string;
  name: string;
  time: string; // "HH:MM"
  organizationId: string;
  stableId?: string;
  isActive: boolean;
}

interface CoverageStatus {
  feedingTime: FeedingTime;
  isCovered: boolean;
  coveredBy?: {
    routineId: string;
    routineName: string;
    scheduledTime: string;
  };
}

interface FeedingCoverageCardProps {
  stableId: string;
  date?: Date;
  compact?: boolean;
}

// Query keys
const feedingCoverageKeys = {
  all: ["feedingCoverage"] as const,
  byStableDate: (stableId: string, date: string) =>
    [...feedingCoverageKeys.all, stableId, date] as const,
};

// Check if a routine covers a feeding time
function checkTimeOverlap(
  routineTime: string,
  feedingTime: string,
  toleranceMinutes: number = 60,
): boolean {
  const routineParts = routineTime.split(":");
  const feedParts = feedingTime.split(":");

  const routineHour = Number(routineParts[0]) || 0;
  const routineMin = Number(routineParts[1]) || 0;
  const feedHour = Number(feedParts[0]) || 0;
  const feedMin = Number(feedParts[1]) || 0;

  const routineMinutes = routineHour * 60 + routineMin;
  const feedMinutes = feedHour * 60 + feedMin;

  // Check if routine time is within tolerance of feeding time
  return Math.abs(routineMinutes - feedMinutes) <= toleranceMinutes;
}

export function FeedingCoverageCard({
  stableId,
  date = new Date(),
  compact = false,
}: FeedingCoverageCardProps) {
  const dateStr = format(date, "yyyy-MM-dd");

  // Fetch feeding times for the stable
  const { data: feedingTimes, isLoading: feedingTimesLoading } = useQuery({
    queryKey: ["feedingTimes", stableId],
    queryFn: async (): Promise<FeedingTime[]> => {
      const response = await apiClient.get<{ feedingTimes: FeedingTime[] }>(
        `/feeding-times/stable/${stableId}`,
      );
      return response.feedingTimes.filter((ft) => ft.isActive);
    },
    enabled: !!stableId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch routine instances for the date
  const { data: routineInstances, isLoading: routinesLoading } = useQuery({
    queryKey: ["routineInstances", stableId, dateStr],
    queryFn: async (): Promise<RoutineInstance[]> => {
      const response = await apiClient.get<{
        routineInstances: RoutineInstance[];
      }>(`/routines/instances/stable/${stableId}`, {
        startDate: dateStr,
        endDate: dateStr,
        limit: "50",
      });
      return response.routineInstances;
    },
    enabled: !!stableId,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Calculate coverage status
  const coverageStatus = useMemo<CoverageStatus[]>(() => {
    if (!feedingTimes || !routineInstances) return [];

    return feedingTimes
      .map((ft) => {
        // Find a routine that covers this feeding time
        // A routine covers a feeding time if:
        // 1. It has a step with matching feedingTimeId, OR
        // 2. It has a feeding category step with similar time
        const coveringRoutine = routineInstances.find((ri) => {
          // Check if routine time is close to feeding time
          if (
            ri.scheduledStartTime &&
            checkTimeOverlap(ri.scheduledStartTime, ft.time)
          ) {
            return true;
          }
          return false;
        });

        return {
          feedingTime: ft,
          isCovered: !!coveringRoutine,
          coveredBy: coveringRoutine
            ? {
                routineId: coveringRoutine.id,
                routineName: coveringRoutine.templateName,
                scheduledTime: coveringRoutine.scheduledStartTime,
              }
            : undefined,
        };
      })
      .sort((a, b) => a.feedingTime.time.localeCompare(b.feedingTime.time));
  }, [feedingTimes, routineInstances]);

  const coveredCount = coverageStatus.filter((s) => s.isCovered).length;
  const totalCount = coverageStatus.length;
  const uncoveredFeedings = coverageStatus.filter((s) => !s.isCovered);
  const allCovered = uncoveredFeedings.length === 0 && totalCount > 0;

  // Loading state
  if (feedingTimesLoading || routinesLoading) {
    return (
      <Card>
        <CardHeader className={compact ? "pb-2" : ""}>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // No feeding times configured
  if (!feedingTimes || feedingTimes.length === 0) {
    return (
      <Card>
        <CardHeader className={compact ? "pb-2" : ""}>
          <CardTitle
            className={`flex items-center gap-2 ${compact ? "text-sm" : ""}`}
          >
            <Utensils className="h-4 w-4" />
            Fodertider
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Inga fodertider konfigurerade.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-2">
            <Link to="/settings/feeding">Konfigurera fodertider</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={allCovered ? "" : "border-amber-200 dark:border-amber-800"}
    >
      <CardHeader className={compact ? "pb-2" : ""}>
        <div className="flex items-center justify-between">
          <CardTitle
            className={`flex items-center gap-2 ${compact ? "text-sm" : ""}`}
          >
            <Utensils className="h-4 w-4" />
            Fodertäckning
          </CardTitle>
          <Badge
            variant={allCovered ? "default" : "secondary"}
            className={
              allCovered
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                : ""
            }
          >
            {coveredCount}/{totalCount}
          </Badge>
        </div>
        {!compact && (
          <CardDescription>{format(date, "d MMMM yyyy")}</CardDescription>
        )}
      </CardHeader>
      <CardContent className={compact ? "pt-0" : ""}>
        <div className="space-y-2">
          {coverageStatus.map((status) => (
            <div
              key={status.feedingTime.id}
              className={`flex items-center justify-between py-1.5 px-2 rounded-md ${
                status.isCovered
                  ? "bg-green-50 dark:bg-green-900/10"
                  : "bg-amber-50 dark:bg-amber-900/10"
              }`}
            >
              <div className="flex items-center gap-2">
                {status.isCovered ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
                <span className="font-medium text-sm">
                  {status.feedingTime.time}
                </span>
                <span className="text-sm text-muted-foreground">
                  {status.feedingTime.name}
                </span>
              </div>
              {status.isCovered && status.coveredBy ? (
                <Link
                  to={`/routines/${status.coveredBy.routineId}`}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  {status.coveredBy.routineName}
                </Link>
              ) : (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-amber-600 hover:text-amber-700"
                >
                  <Link
                    to={`/routines/create?date=${dateStr}&time=${status.feedingTime.time}`}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Skapa rutin
                  </Link>
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Warning if not all covered */}
        {!allCovered && !compact && (
          <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              <strong>{uncoveredFeedings.length}</strong> fodertid
              {uncoveredFeedings.length > 1 ? "er" : ""} saknar tilldelad rutin.
              Skapa rutiner för att säkerställa att alla hästar får foder.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
