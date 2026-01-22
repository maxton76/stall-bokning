import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import { CheckCircle2, XCircle, User, Clock, ChevronRight } from "lucide-react";
import type { HorseActivityHistoryEntry } from "@shared/types";
import { getCategoryInfo } from "@/hooks/useHorseActivityHistory";
import { toDate } from "@/utils/timestampUtils";
import { cn } from "@/lib/utils";

interface ActivityTimelineProps {
  /**
   * Activities to display
   */
  activities: HorseActivityHistoryEntry[];
  /**
   * Whether to group by day
   */
  groupByDay?: boolean;
  /**
   * Whether to show detailed snapshots
   */
  showDetails?: boolean;
  /**
   * Compact mode for smaller displays
   */
  compact?: boolean;
  /**
   * Called when an activity is clicked
   */
  onActivityClick?: (activity: HorseActivityHistoryEntry) => void;
}

interface DayGroup {
  date: string;
  activities: HorseActivityHistoryEntry[];
}

export function ActivityTimeline({
  activities,
  groupByDay = true,
  showDetails = false,
  compact = false,
  onActivityClick,
}: ActivityTimelineProps) {
  const { t, i18n } = useTranslation(["horses", "routines", "common"]);
  const dateLocale = i18n.language === "sv" ? sv : enUS;

  // Group activities by day if requested
  const groupedActivities = groupByDay
    ? activities.reduce<DayGroup[]>((groups, activity) => {
        const executedAt = toDate(activity.executedAt);
        const dateKey = executedAt
          ? format(executedAt, "yyyy-MM-dd")
          : "unknown";

        const existingGroup = groups.find((g) => g.date === dateKey);
        if (existingGroup) {
          existingGroup.activities.push(activity);
        } else {
          groups.push({
            date: dateKey,
            activities: [activity],
          });
        }
        return groups;
      }, [])
    : [{ date: "all", activities }];

  const renderActivity = (activity: HorseActivityHistoryEntry) => {
    const categoryInfo = getCategoryInfo(activity.category);
    const executedAt = toDate(activity.executedAt);
    const isCompleted = activity.executionStatus === "completed";

    return (
      <div
        key={activity.id}
        className={cn(
          "relative flex gap-3",
          compact ? "py-2" : "py-3",
          onActivityClick &&
            "cursor-pointer hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors",
        )}
        onClick={() => onActivityClick?.(activity)}
      >
        {/* Timeline dot and line */}
        <div className="flex flex-col items-center">
          <div
            className={cn(
              "rounded-full flex items-center justify-center shrink-0",
              compact ? "w-8 h-8" : "w-10 h-10",
              isCompleted
                ? "bg-primary/10 text-primary"
                : "bg-amber-100 text-amber-600",
            )}
          >
            <span className={compact ? "text-sm" : "text-base"}>
              {categoryInfo.icon}
            </span>
          </div>
          {/* Vertical line to next item */}
          <div className="w-px flex-1 bg-border mt-2 min-h-[16px]" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={cn(
                    "font-medium",
                    compact ? "text-sm" : "text-base",
                  )}
                >
                  {activity.horseName}
                </span>
                <Badge
                  variant={isCompleted ? "default" : "secondary"}
                  className={cn(
                    "text-xs",
                    !isCompleted && "bg-amber-100 text-amber-800",
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                  ) : (
                    <XCircle className="h-3 w-3 mr-1" />
                  )}
                  {t(
                    `horses:routineHistory.status.${activity.executionStatus}`,
                  )}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mt-0.5">
                {activity.stepName}
              </p>
            </div>

            {onActivityClick && (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
            )}
          </div>

          {/* Time and executor */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
            {executedAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(executedAt, "HH:mm", { locale: dateLocale })}
              </span>
            )}
            {activity.executedByName && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {activity.executedByName}
              </span>
            )}
          </div>

          {/* Show details if requested */}
          {showDetails && (
            <div className="mt-2 space-y-2">
              {activity.feedingSnapshot && (
                <div className="text-xs bg-muted/50 rounded p-2">
                  <span className="font-medium">
                    {t("horses:routineHistory.snapshot.feeding")}:
                  </span>{" "}
                  {activity.feedingSnapshot.instructions.feedTypeName} (
                  {activity.feedingSnapshot.instructions.quantity}{" "}
                  {activity.feedingSnapshot.instructions.quantityMeasure})
                </div>
              )}
              {activity.medicationSnapshot && (
                <div className="text-xs bg-muted/50 rounded p-2">
                  <span className="font-medium">
                    {t("horses:routineHistory.snapshot.medication")}:
                  </span>{" "}
                  {activity.medicationSnapshot.instructions.medicationName} -{" "}
                  {activity.medicationSnapshot.given
                    ? t("common:status.given")
                    : t("common:status.skipped")}
                </div>
              )}
              {activity.blanketSnapshot && (
                <div className="text-xs bg-muted/50 rounded p-2">
                  <span className="font-medium">
                    {t("horses:routineHistory.snapshot.blanket")}:
                  </span>{" "}
                  {activity.blanketSnapshot.action}
                </div>
              )}
              {activity.skipReason && (
                <div className="text-xs bg-amber-50 text-amber-800 rounded p-2">
                  <span className="font-medium">
                    {t("horses:routineHistory.skipReason")}:
                  </span>{" "}
                  {activity.skipReason}
                </div>
              )}
              {activity.notes && (
                <div className="text-xs bg-muted/50 rounded p-2 italic">
                  {activity.notes}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">
          {t("horses:routineHistory.noActivities")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groupedActivities.map((group) => (
        <div key={group.date}>
          {/* Day header - only show if grouping by day */}
          {groupByDay && group.date !== "all" && group.date !== "unknown" && (
            <div className="sticky top-0 bg-background z-10 py-2 mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {format(new Date(group.date), "EEEE, d MMMM", {
                  locale: dateLocale,
                })}
              </h3>
            </div>
          )}

          {/* Activities for this day */}
          <div className="space-y-0">
            {group.activities.map((activity, index) => (
              <div key={activity.id}>{renderActivity(activity)}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Component for displaying activities grouped by step (for routine summary)
 */
interface StepGroupedActivitiesProps {
  groupedByStep: Record<string, HorseActivityHistoryEntry[]>;
  stepOrder: string[];
}

export function StepGroupedActivities({
  groupedByStep,
  stepOrder,
}: StepGroupedActivitiesProps) {
  const { t } = useTranslation(["horses", "routines"]);

  // Sort steps by order
  const orderedSteps = stepOrder.filter((stepId) => groupedByStep[stepId]);

  if (orderedSteps.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">
          {t("horses:routineHistory.noActivities")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {orderedSteps.map((stepId) => {
        const activities = groupedByStep[stepId];
        if (!activities || activities.length === 0) return null;

        const firstActivity = activities[0];
        if (!firstActivity) return null;
        const categoryInfo = getCategoryInfo(firstActivity.category);
        const completedCount = activities.filter(
          (a) => a.executionStatus === "completed",
        ).length;
        const skippedCount = activities.filter(
          (a) => a.executionStatus === "skipped",
        ).length;

        return (
          <div key={stepId} className="border rounded-lg p-4">
            {/* Step header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{categoryInfo.icon}</span>
                <h3 className="font-medium">{firstActivity.stepName}</h3>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {completedCount > 0 && (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {completedCount}
                  </Badge>
                )}
                {skippedCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="gap-1 bg-amber-100 text-amber-800"
                  >
                    <XCircle className="h-3 w-3" />
                    {skippedCount}
                  </Badge>
                )}
              </div>
            </div>

            {/* Horse list for this step */}
            <div className="grid gap-2 sm:grid-cols-2">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded"
                >
                  <span className="text-sm font-medium">
                    {activity.horseName}
                  </span>
                  <Badge
                    variant={
                      activity.executionStatus === "completed"
                        ? "default"
                        : "secondary"
                    }
                    className={cn(
                      "text-xs",
                      activity.executionStatus === "skipped" &&
                        "bg-amber-100 text-amber-800",
                    )}
                  >
                    {activity.executionStatus === "completed" ? (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    ) : (
                      <XCircle className="h-3 w-3 mr-1" />
                    )}
                    {t(
                      `horses:routineHistory.status.${activity.executionStatus}`,
                    )}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
