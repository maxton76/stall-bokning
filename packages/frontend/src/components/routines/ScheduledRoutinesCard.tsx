import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { isBefore, startOfDay, parseISO } from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Play,
  CalendarX2,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ROUTINE_STATUS_COLORS,
  ROUTINE_STATUS_ICONS,
} from "@/constants/routineStyles";
import { cn } from "@/lib/utils";
import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys } from "@/lib/queryClient";
import { getStableHorses } from "@/services/horseService";
import type { Horse } from "@/types/roles";
import type { RoutineInstance, RoutineInstanceStatus } from "@shared/types";

interface ScheduledRoutinesCardProps {
  routineInstances: RoutineInstance[];
  isLoading?: boolean;
  selectedStableId: string;
}

interface RoutineWithHorses extends RoutineInstance {
  horses: { id: string; name: string; completed: boolean }[];
}

/**
 * Parse scheduledDate from RoutineInstance which can be FirestoreTimestamp or string
 */
function parseScheduledDate(scheduledDate: unknown): Date {
  if (!scheduledDate) return new Date();

  // Handle Firestore Timestamp (has toDate method or _seconds property)
  if (typeof scheduledDate === "object" && scheduledDate !== null) {
    if (
      "toDate" in scheduledDate &&
      typeof scheduledDate.toDate === "function"
    ) {
      return scheduledDate.toDate();
    }
    if ("_seconds" in scheduledDate) {
      return new Date((scheduledDate as { _seconds: number })._seconds * 1000);
    }
    if ("seconds" in scheduledDate) {
      return new Date((scheduledDate as { seconds: number }).seconds * 1000);
    }
  }

  // Handle ISO string
  if (typeof scheduledDate === "string") {
    return parseISO(scheduledDate);
  }

  return new Date(scheduledDate as Date);
}

/**
 * Extract horse info from routine instance progress.
 * Resolves horse names from the provided map (sourced from horse documents)
 * rather than relying on denormalized horseName in progress data.
 */
function extractHorsesFromProgress(
  instance: RoutineInstance,
  horseNameMap: Record<string, string>,
): { id: string; name: string; completed: boolean }[] {
  const horses: { id: string; name: string; completed: boolean }[] = [];
  const seenHorseIds = new Set<string>();

  // Iterate through all step progress to find horses
  if (instance.progress?.stepProgress) {
    for (const stepProgress of Object.values(instance.progress.stepProgress)) {
      if (stepProgress.horseProgress) {
        for (const horseProgress of Object.values(stepProgress.horseProgress)) {
          if (!seenHorseIds.has(horseProgress.horseId)) {
            seenHorseIds.add(horseProgress.horseId);
            horses.push({
              id: horseProgress.horseId,
              name: horseNameMap[horseProgress.horseId] || horseProgress.horseId,
              completed: horseProgress.completed || horseProgress.skipped,
            });
          }
        }
      }
    }
  }

  return horses;
}

/**
 * Check if routine is overdue (scheduledDate < today and not completed)
 */
function isOverdue(instance: RoutineInstance): boolean {
  const scheduledDate = parseScheduledDate(instance.scheduledDate);
  const today = startOfDay(new Date());
  return (
    isBefore(startOfDay(scheduledDate), today) &&
    instance.status !== "completed"
  );
}

/**
 * Individual routine row component
 */
function RoutineInstanceRow({
  routine,
  selectedStableId,
}: {
  routine: RoutineWithHorses;
  selectedStableId: string;
}) {
  const { t } = useTranslation(["routines", "common"]);
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  const StatusIcon = ROUTINE_STATUS_ICONS[routine.status];
  const statusColor = ROUTINE_STATUS_COLORS[routine.status];
  const overdue = isOverdue(routine);

  // Progress calculation
  const progressPercent =
    routine.progress?.stepsTotal > 0
      ? Math.round(
          (routine.progress.stepsCompleted / routine.progress.stepsTotal) * 100,
        )
      : 0;

  // Horses to display
  const displayedHorses = routine.horses.slice(0, 3);
  const remainingHorsesCount = Math.max(0, routine.horses.length - 3);

  const handleAction = () => {
    navigate(`/routines/flow/${routine.id}`);
  };

  // Determine action button text
  const isStarted =
    routine.status === "started" || routine.status === "in_progress";
  const actionLabel = isStarted
    ? t("routines:actions.continue")
    : t("routines:actions.start");

  return (
    <div
      className={cn(
        "border rounded-lg p-4 transition-colors",
        overdue && "border-red-300 bg-red-50/50",
      )}
    >
      {/* Main Row */}
      <div className="flex items-start justify-between gap-4">
        {/* Left: Status and Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {/* Status dot */}
            <div
              className={cn(
                "w-2.5 h-2.5 rounded-full flex-shrink-0",
                routine.status === "scheduled" && "bg-blue-500",
                (routine.status === "started" ||
                  routine.status === "in_progress") &&
                  "bg-amber-500 animate-pulse",
              )}
            />
            {/* Routine name */}
            <span className="font-medium text-sm truncate">
              {routine.templateName}
            </span>
            {/* Overdue badge */}
            {overdue && (
              <Badge
                variant="destructive"
                className="text-xs flex items-center gap-1"
              >
                <AlertTriangle className="w-3 h-3" />
                {t("routines:scheduledRoutines.overdue")}
              </Badge>
            )}
          </div>

          {/* Stable name (when showing all stables) */}
          {selectedStableId === "all" && routine.stableName && (
            <div className="text-xs text-muted-foreground mb-1">
              @ {routine.stableName}
            </div>
          )}

          {/* Time */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <Clock className="w-3 h-3" />
            <span>{routine.scheduledStartTime}</span>
          </div>

          {/* Progress bar (for in-progress routines) */}
          {isStarted && routine.progress && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>
                  {t("routines:scheduledRoutines.stepsProgress", {
                    completed: routine.progress.stepsCompleted,
                    total: routine.progress.stepsTotal,
                  })}
                </span>
                <span>{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
            </div>
          )}

          {/* Horses section */}
          {routine.horses.length > 0 && (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  <div className="flex items-center gap-1 flex-wrap">
                    {displayedHorses.map((horse) => (
                      <Badge
                        key={horse.id}
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          horse.completed && "bg-green-100 text-green-800",
                        )}
                      >
                        {horse.name}
                      </Badge>
                    ))}
                    {remainingHorsesCount > 0 && (
                      <span className="text-muted-foreground">
                        {t("routines:scheduledRoutines.moreHorses", {
                          count: remainingHorsesCount,
                        })}
                      </span>
                    )}
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="flex flex-wrap gap-1 pl-5">
                  {routine.horses.slice(3).map((horse) => (
                    <Badge
                      key={horse.id}
                      variant="secondary"
                      className={cn(
                        "text-xs",
                        horse.completed && "bg-green-100 text-green-800",
                      )}
                    >
                      {horse.name}
                    </Badge>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        {/* Right: Action button */}
        <Button
          size="sm"
          variant={isStarted ? "default" : "outline"}
          onClick={handleAction}
          className="flex-shrink-0"
        >
          <Play className="w-4 h-4 mr-1" />
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for the card
 */
function ScheduledRoutinesCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Empty state for the card
 */
function ScheduledRoutinesEmptyState() {
  const { t } = useTranslation(["routines"]);

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <CalendarX2 className="w-12 h-12 text-muted-foreground/50 mb-3" />
      <h4 className="font-medium text-sm mb-1">
        {t("routines:scheduledRoutines.noRoutines")}
      </h4>
      <p className="text-xs text-muted-foreground max-w-[250px]">
        {t("routines:scheduledRoutines.noRoutinesDescription")}
      </p>
    </div>
  );
}

/**
 * Scheduled Routines Card Component
 *
 * Displays actionable routine instances (scheduled, started, in_progress)
 * with expandable horse lists and quick action buttons.
 */
export function ScheduledRoutinesCard({
  routineInstances,
  isLoading,
  selectedStableId,
}: ScheduledRoutinesCardProps) {
  const { t } = useTranslation(["routines"]);

  // Collect unique stable IDs from routine instances to fetch horses
  const stableIds = useMemo(() => {
    const ids = new Set<string>();
    for (const instance of routineInstances) {
      if (instance.stableId) ids.add(instance.stableId);
    }
    return Array.from(ids);
  }, [routineInstances]);

  // Fetch horses for all relevant stables to resolve names
  const { data: allHorses = [] } = useApiQuery<Horse[]>(
    queryKeys.horses.list({ stableIds, context: "routineProgress" }),
    async () => {
      if (stableIds.length === 0) return [];
      const results = await Promise.all(
        stableIds.map((id) => getStableHorses(id)),
      );
      return results.flat();
    },
    {
      enabled: stableIds.length > 0,
      staleTime: 5 * 60 * 1000,
    },
  );

  // Build horseId → horseName lookup map
  const horseNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const horse of allHorses) {
      if (horse.id && horse.name) {
        map[horse.id] = horse.name;
      }
    }
    return map;
  }, [allHorses]);

  // Process routines with horse data
  const processedRoutines: RoutineWithHorses[] = useMemo(() => {
    return routineInstances.map((instance) => ({
      ...instance,
      horses: extractHorsesFromProgress(instance, horseNameMap),
    }));
  }, [routineInstances, horseNameMap]);

  // Sort routines: overdue first, then by scheduled time
  const sortedRoutines = useMemo(() => {
    return [...processedRoutines].sort((a, b) => {
      const aOverdue = isOverdue(a);
      const bOverdue = isOverdue(b);

      // Overdue items first
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Then by scheduled date/time
      const aDate = parseScheduledDate(a.scheduledDate);
      const bDate = parseScheduledDate(b.scheduledDate);

      if (aDate.getTime() !== bDate.getTime()) {
        return aDate.getTime() - bDate.getTime();
      }

      // Same date, sort by time
      return (a.scheduledStartTime || "").localeCompare(
        b.scheduledStartTime || "",
      );
    });
  }, [processedRoutines]);

  if (isLoading) {
    return <ScheduledRoutinesCardSkeleton />;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {t("routines:scheduledRoutines.title")}
            {sortedRoutines.length > 0 && (
              <Badge variant="secondary" className="font-normal">
                {sortedRoutines.length}
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {sortedRoutines.length === 0 ? (
          <ScheduledRoutinesEmptyState />
        ) : (
          <div className="space-y-3">
            {sortedRoutines.map((routine) => (
              <RoutineInstanceRow
                key={routine.id}
                routine={routine}
                selectedStableId={selectedStableId}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
