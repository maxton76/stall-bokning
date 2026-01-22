import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  startOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  startOfDay,
  endOfDay,
  format,
  isSameDay,
} from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStables } from "@/hooks/useUserStables";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useDialog } from "@/hooks/useDialog";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { WeekDaysHeader } from "@/components/calendar/WeekDaysHeader";
import { HorseRow } from "@/components/calendar/HorseRow";
import { ActivityFormDialog } from "@/components/ActivityFormDialog";
import {
  getStableActivities,
  createActivity,
} from "@/services/activityService";
import {
  getStableHorses,
  getAllAccessibleHorses,
} from "@/services/horseService";
import { getRoutineInstances } from "@/services/routineService";
import { getActivityTypesByStable } from "@/services/activityTypeService";
import type { ActivityEntry, ActivityTypeConfig } from "@/types/activity";
import type { Horse } from "@/types/roles";
import type { RoutineInstance } from "@shared/types";

export default function ActivitiesPlanningPage() {
  const { t } = useTranslation(["activities", "common"]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedStableId, setSelectedStableId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"day" | "week">("week");
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [expandedHorses, setExpandedHorses] = useState<Set<string>>(new Set());
  const [initialFormData, setInitialFormData] = useState<{
    date?: Date;
    horseId?: string;
  }>({});
  const formDialog = useDialog<ActivityEntry>();

  // Load user's stables
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);

  // Get week days
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  // Get date range for loading activities
  const dateRange = useMemo(() => {
    return {
      start: startOfDay(weekDays[0]!),
      end: endOfDay(weekDays[6]!),
    };
  }, [weekDays]);

  // Load horses FIRST - activities depend on horses
  const horses = useAsyncData<Horse[]>({
    loadFn: async () => {
      if (!user || stables.length === 0) return [];

      // If "all" is selected, fetch horses from all stables
      if (selectedStableId === "all") {
        return await getAllAccessibleHorses("active");
      }

      return await getStableHorses(selectedStableId, "active");
    },
  });

  // Load activities for week - based on horses' stables (not useUserStables)
  // This ensures we fetch activities from all stables where we can see horses
  // Note: We pass horsesData as a parameter to avoid stale closure issues
  const loadActivities = async (horsesData: Horse[] | null) => {
    // Early return if no horses data
    if (!horsesData || horsesData.length === 0) return [];

    // If "all" is selected, fetch from all stables that have horses we can see
    if (selectedStableId === "all") {
      // Get unique stable IDs from horses we can see
      const horseStableIds = [
        ...new Set(
          horsesData
            .map((h) => h.currentStableId)
            .filter((id): id is string => !!id),
        ),
      ];

      // No stables to fetch from (horses might not have currentStableId set)
      if (horseStableIds.length === 0) {
        return [];
      }

      const promises = horseStableIds.map((stableId) =>
        getStableActivities(stableId, dateRange.start, dateRange.end),
      );
      const results = await Promise.all(promises);
      const allActivities = results.flat();

      // Sort by date
      return allActivities.sort((a, b) => {
        const dateA = a.date?.toDate?.() || new Date(a.date as any);
        const dateB = b.date?.toDate?.() || new Date(b.date as any);
        return dateA.getTime() - dateB.getTime();
      });
    }

    return await getStableActivities(
      selectedStableId,
      dateRange.start,
      dateRange.end,
    );
  };

  const activities = useAsyncData<ActivityEntry[]>({
    loadFn: () => loadActivities(horses.data),
  });

  // Load routine instances for week
  const routines = useAsyncData<RoutineInstance[]>({
    loadFn: async () => {
      if (stables.length === 0) return [];

      // If "all" is selected, fetch from all stables
      if (selectedStableId === "all") {
        const promises = stables.map((stable) =>
          getRoutineInstances(stable.id, currentWeekStart),
        );
        const results = await Promise.all(promises);
        return results.flat();
      }

      // Single stable
      return await getRoutineInstances(selectedStableId, currentWeekStart);
    },
  });

  // Filter routines by selected stable
  const filteredRoutineInstances = useMemo(() => {
    if (!routines.data) return [];

    if (selectedStableId === "all") {
      return routines.data;
    }

    return routines.data.filter((i) => i.stableId === selectedStableId);
  }, [routines.data, selectedStableId]);

  // Load activity types - based on horse stables for "all" view
  const loadActivityTypes = async (horsesData: Horse[] | null) => {
    if (selectedStableId === "all") {
      // Get unique stable IDs from horses
      if (!horsesData || horsesData.length === 0) return [];

      const horseStableIds = [
        ...new Set(
          horsesData
            .map((h) => h.currentStableId)
            .filter((id): id is string => !!id),
        ),
      ];

      if (horseStableIds.length === 0) return [];

      // Fetch activity types from all stables
      const promises = horseStableIds.map((stableId) =>
        getActivityTypesByStable(stableId, true),
      );
      const results = await Promise.all(promises);
      return results.flat();
    }

    // Single stable
    if (!selectedStableId) return [];
    return await getActivityTypesByStable(selectedStableId, true);
  };

  const activityTypes = useAsyncData<ActivityTypeConfig[]>({
    loadFn: () => loadActivityTypes(horses.data),
  });

  // Reload activity types when stable or horses change
  useEffect(() => {
    if (selectedStableId === "all") {
      if (horses.data && horses.data.length > 0) {
        activityTypes.load();
      }
    } else if (selectedStableId) {
      activityTypes.load();
    }
  }, [selectedStableId, horses.data]);

  // Reload activities when stable, horses, or date range changes
  // Activities depend on horses data to know which stables to query
  useEffect(() => {
    if (horses.data && horses.data.length > 0) {
      activities.load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStableId, horses.data, dateRange.start, dateRange.end]);

  // Reload routines when stable, stables list, or week changes
  useEffect(() => {
    if (stables.length > 0) {
      routines.load();
    }
  }, [selectedStableId, stables, currentWeekStart]);

  // Reload horses when stable or stables list changes
  useEffect(() => {
    if (user && stables.length > 0) {
      horses.load();
    }
  }, [selectedStableId, stables, user]);

  // Navigation handlers
  const handleNavigate = (direction: "prev" | "next" | "today") => {
    if (direction === "today") {
      setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    } else if (direction === "prev") {
      setCurrentWeekStart((d) => subWeeks(d, 1));
    } else {
      setCurrentWeekStart((d) => addWeeks(d, 1));
    }
  };

  // Horse expand/collapse
  const handleToggleHorse = (horseId: string) => {
    setExpandedHorses((prev) => {
      const next = new Set(prev);
      if (next.has(horseId)) {
        next.delete(horseId);
      } else {
        next.add(horseId);
      }
      return next;
    });
  };

  // Cell click - open form dialog with pre-filled date/horse
  const handleCellClick = (horseId: string, date: Date, hour?: number) => {
    // Set time if hour provided (expanded view), otherwise use noon as default
    const dateWithTime = new Date(date);
    if (hour !== undefined) {
      dateWithTime.setHours(hour, 0, 0, 0);
    } else {
      dateWithTime.setHours(12, 0, 0, 0);
    }

    setInitialFormData({
      date: dateWithTime,
      horseId: horseId,
    });
    formDialog.openDialog(undefined);
  };

  // Activity click - edit existing activity
  const handleActivityClick = (activity: ActivityEntry) => {
    setInitialFormData({}); // Clear initial data when editing existing activity
    formDialog.openDialog(activity);
  };

  // Handle dialog close - clear initial data
  const handleDialogClose = () => {
    formDialog.closeDialog();
    setInitialFormData({});
  };

  // Routine click - navigate to routine flow
  const handleRoutineClick = (routine: RoutineInstance) => {
    navigate(`/routines/flow/${routine.id}`);
  };

  const handleSave = async (data: any) => {
    if (!user) return;

    if (data.type === "activity") {
      // Find the horse to get its stable
      const horse = horses.data?.find((h) => h.id === data.horseId);
      if (!horse || !horse.currentStableId) {
        throw new Error("Horse not found or not assigned to a stable");
      }

      await createActivity(
        user.uid,
        horse.currentStableId,
        data,
        horse.currentStableName || "",
      );
    }
    // Note: tasks and messages are not supported in calendar view

    formDialog.closeDialog();
    setInitialFormData({});
    activities.reload();
  };

  if (stablesLoading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">
          {t("activities:stable.loading")}
        </p>
      </div>
    );
  }

  if (stables.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">
              {t("activities:emptyState.noStables.title")}
            </h3>
            <p className="text-muted-foreground">
              {t("activities:emptyState.noStables.planning")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2 sm:p-6 h-screen flex flex-col">
      {/* Stable Selector */}
      <div className="mb-2 sm:mb-4">
        <Select value={selectedStableId} onValueChange={setSelectedStableId}>
          <SelectTrigger className="w-full sm:w-[280px]">
            <SelectValue placeholder={t("activities:stable.select")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("activities:stable.all")}</SelectItem>
            {stables.map((stable) => (
              <SelectItem key={stable.id} value={stable.id}>
                {stable.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Routines Section */}
      {filteredRoutineInstances.length > 0 && (
        <Card className="mb-4 sm:mb-6">
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-4">
              {t("activities:routines.weekRoutines")}
            </h3>

            {/* Group routines by date */}
            <div className="space-y-4">
              {weekDays.map((day) => {
                const dayRoutines = filteredRoutineInstances.filter(
                  (routine) => {
                    const routineDate = new Date(routine.scheduledDate as any);
                    return isSameDay(routineDate, day);
                  },
                );

                if (dayRoutines.length === 0) return null;

                return (
                  <div key={day.toISOString()}>
                    <div className="text-sm font-medium text-gray-600 mb-2">
                      {format(day, "EEEE, MMM d")}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {dayRoutines.map((routine) => (
                        <div
                          key={routine.id}
                          className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg cursor-pointer hover:bg-purple-200 transition-colors flex items-center gap-2"
                          onClick={() => handleRoutineClick(routine)}
                        >
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {routine.templateName}
                          </span>
                          {selectedStableId === "all" && routine.stableName && (
                            <span className="text-xs opacity-75">
                              · {routine.stableName}
                            </span>
                          )}
                          {routine.scheduledStartTime && (
                            <span className="text-xs opacity-75">
                              {routine.scheduledStartTime}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar Card */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {/* Calendar Header with Navigation */}
        <CalendarHeader
          currentWeekStart={currentWeekStart}
          onNavigate={handleNavigate}
          viewMode={viewMode}
          onViewModeChange={(mode) => setViewMode(mode as "day" | "week")}
          onAddActivity={() => formDialog.openDialog()}
          onFilterClick={() => {
            /* TODO: implement filter */
          }}
          disableAdd={false}
        />

        {/* Calendar Grid - single scroll container */}
        <CardContent className="flex-1 overflow-x-auto overflow-y-auto p-0">
          <div className="min-w-max">
            {/* Week Days Header */}
            <div className="sticky top-0 z-10">
              <WeekDaysHeader weekDays={weekDays} today={new Date()} />
            </div>

            {/* Horse Rows */}
            {horses.loading ? (
              <div className="p-8 text-center text-muted-foreground">
                {t("activities:planning.loadingHorses")}
              </div>
            ) : horses.data && horses.data.length > 0 ? (
              horses.data.map((horse) => (
                <HorseRow
                  key={horse.id}
                  horse={horse}
                  weekDays={weekDays}
                  activities={activities.data || []}
                  expanded={expandedHorses.has(horse.id)}
                  onToggleExpand={() => handleToggleHorse(horse.id)}
                  onActivityClick={handleActivityClick}
                  onCellClick={handleCellClick}
                  activityTypes={activityTypes.data || []}
                />
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                {t("activities:planning.noHorses")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity Form Dialog */}
      <ActivityFormDialog
        open={formDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            handleDialogClose();
          }
        }}
        entry={formDialog.data || undefined}
        initialDate={initialFormData.date}
        initialHorseId={initialFormData.horseId}
        onSave={handleSave}
        horses={horses.data?.map((h) => ({ id: h.id, name: h.name })) || []}
        stableMembers={[]}
        activityTypes={activityTypes.data || []}
      />
    </div>
  );
}
