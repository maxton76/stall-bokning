import { useMemo } from "react";
import { format, isSameDay } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import type { ActivityEntry, ActivityTypeConfig } from "@/types/activity";
import { toDate } from "@/utils/timestampUtils";

interface HorseRowProps {
  horse: { id: string; name: string };
  weekDays: Date[];
  activities: ActivityEntry[];
  expanded: boolean;
  onToggleExpand: () => void;
  onActivityClick: (activity: ActivityEntry) => void;
  onCellClick: (horseId: string, date: Date, hour?: number) => void;
  activityTypes: ActivityTypeConfig[];
}

export function HorseRow({
  horse,
  weekDays,
  activities,
  expanded,
  onToggleExpand,
  onActivityClick,
  onCellClick,
  activityTypes,
}: HorseRowProps) {
  const { t, i18n } = useTranslation(["activities", "common"]);
  const locale = i18n.language === "sv" ? sv : enUS;

  // Group activities by day
  const activitiesByDay = useMemo(() => {
    const grouped: Record<string, ActivityEntry[]> = {};
    weekDays.forEach((day) => {
      const dayKey = format(day, "yyyy-MM-dd");
      grouped[dayKey] = activities.filter((a) => {
        // Only include entries that are activities with a matching horseId
        const isActivity = a.type === "activity";
        if (!isActivity) return false;
        const hasHorseId = "horseId" in a && a.horseId === horse.id;
        const activityDate = toDate(a.date);
        return activityDate && isSameDay(activityDate, day) && hasHorseId;
      });
    });
    return grouped;
  }, [activities, weekDays, horse.id]);

  // Calculate hour range dynamically based on activities (for expanded view)
  // Must be called before conditional return to satisfy Rules of Hooks
  const hours = useMemo(() => {
    const allActivities = Object.values(activitiesByDay).flat();

    if (allActivities.length === 0) {
      // Default range: 7 AM - 7 PM
      return Array.from({ length: 13 }, (_, i) => 7 + i);
    }

    // Find min and max hours from activities
    const activityHours = allActivities
      .map((a) => toDate(a.date)?.getHours())
      .filter((h): h is number => h !== undefined);
    const minHour = Math.min(...activityHours);
    const maxHour = Math.max(...activityHours);

    // Add 1 hour padding on each side, but keep within 0-23 range
    const startHour = Math.max(0, minHour - 1);
    const endHour = Math.min(23, maxHour + 1);

    // Create hour array
    const hourCount = endHour - startHour + 1;
    return Array.from({ length: hourCount }, (_, i) => startHour + i);
  }, [activitiesByDay]);

  // Calculate compact view indicators (icons + time)
  const getCompactIndicators = (dayActivities: ActivityEntry[]) => {
    if (dayActivities.length === 0) return null;

    // Get unique icons from activity types
    const icons = dayActivities
      .map((a) => {
        if (a.type === "activity" && "activityTypeConfigId" in a) {
          return activityTypes.find((t) => t.id === a.activityTypeConfigId)
            ?.icon;
        }
        return undefined;
      })
      .filter(Boolean)
      .slice(0, 3);

    // Get first activity time
    const firstTime = dayActivities[0] ? toDate(dayActivities[0].date) : null;

    return { icons, time: firstTime };
  };

  if (!expanded) {
    // COLLAPSED VIEW - compact with icons and time
    return (
      <div className="flex border-b hover:bg-accent/30">
        {/* Horse name cell - fixed width */}
        <div
          className="w-32 md:w-48 flex-shrink-0 p-2 md:p-4 border-r cursor-pointer flex flex-col"
          onClick={onToggleExpand}
        >
          <div className="font-medium text-sm md:text-base truncate">
            {horse.name}
          </div>
          {/* Show first day's indicators */}
          {(() => {
            const firstDayActivities = Object.values(activitiesByDay)[0] || [];
            const indicators = getCompactIndicators(firstDayActivities);
            return (
              indicators && (
                <div className="mt-1">
                  <div className="flex gap-1">
                    {indicators.icons.map((icon, i) => (
                      <span key={i} className="text-xs md:text-sm">
                        {icon}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {format(indicators.time!, "HH:mm", { locale })}
                  </div>
                </div>
              )
            );
          })()}
        </div>

        {/* Day cells */}
        {weekDays.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const dayActivities = activitiesByDay[dayKey] || [];

          return (
            <div
              key={dayKey}
              className="w-24 md:w-32 lg:flex-1 flex-shrink-0 p-2 border-r cursor-pointer hover:bg-accent/50"
              onClick={() => onCellClick(horse.id, day)}
            >
              {dayActivities.map((activity) => {
                const activityType =
                  activity.type === "activity" &&
                  "activityTypeConfigId" in activity
                    ? activityTypes.find(
                        (t) => t.id === activity.activityTypeConfigId,
                      )
                    : undefined;
                return (
                  <div
                    key={activity.id}
                    className="text-xs p-1 rounded mb-1 cursor-pointer truncate"
                    style={{
                      backgroundColor: activityType?.color || "gray",
                      color: "white",
                      opacity: activity.status === "completed" ? 0.6 : 1,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onActivityClick(activity);
                    }}
                  >
                    {activityType?.name ||
                      t("activities:form.entryTypes.activity")}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  // EXPANDED VIEW - hourly timeline
  return (
    <div className="border-b">
      {/* Horse name header */}
      <div className="flex border-b bg-accent/20">
        <div
          className="w-32 md:w-48 flex-shrink-0 p-2 md:p-4 border-r cursor-pointer"
          onClick={onToggleExpand}
        >
          <div className="font-medium text-sm md:text-base truncate">
            {horse.name}
          </div>
        </div>
      </div>

      {/* Hourly rows */}
      {hours.map((hour) => (
        <div key={hour} className="flex border-b min-w-max">
          {/* Time label - fixed width */}
          <div className="w-32 md:w-48 flex-shrink-0 p-2 text-xs text-muted-foreground border-r">
            {format(new Date().setHours(hour, 0), "HH:mm", { locale })}
          </div>

          {/* Day cells for this hour */}
          {weekDays.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayActivities = activitiesByDay[dayKey] || [];

            // Filter activities for this hour
            const hourActivities = dayActivities.filter((a) => {
              const activityDate = toDate(a.date);
              const activityHour = activityDate?.getHours();
              return activityHour === hour;
            });

            return (
              <div
                key={`${dayKey}-${hour}`}
                className="w-24 md:w-32 lg:flex-1 flex-shrink-0 p-1 border-r cursor-pointer hover:bg-accent/50 min-h-[40px] relative"
                onClick={() => onCellClick(horse.id, day, hour)}
              >
                {hourActivities.map((activity) => {
                  const activityType =
                    activity.type === "activity" &&
                    "activityTypeConfigId" in activity
                      ? activityTypes.find(
                          (t) => t.id === activity.activityTypeConfigId,
                        )
                      : undefined;
                  const activityTime = toDate(activity.date);
                  return (
                    <div
                      key={activity.id}
                      className="text-xs p-1 rounded mb-1 cursor-pointer truncate"
                      style={{
                        backgroundColor: activityType?.color || "#gray",
                        color: "white",
                        opacity: activity.status === "completed" ? 0.6 : 1,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onActivityClick(activity);
                      }}
                      title={`${activityType?.name || t("activities:form.entryTypes.activity")} ${activityTime ? format(activityTime, "HH:mm", { locale }) : ""}`}
                    >
                      {activityType?.name ||
                        t("activities:form.entryTypes.activity")}{" "}
                      {activityTime
                        ? format(activityTime, "HH:mm", { locale })
                        : ""}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
