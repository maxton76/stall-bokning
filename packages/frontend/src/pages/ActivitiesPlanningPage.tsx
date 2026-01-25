import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  startOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  startOfDay,
  endOfDay,
} from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useUserStables } from "@/hooks/useUserStables";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useDialog } from "@/hooks/useDialog";
import { queryKeys, cacheInvalidation } from "@/lib/queryClient";
import {
  useStablePlanningMembers,
  formatMembersForSelection,
} from "@/hooks/useOrganizationMembers";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { WeekDaysHeader } from "@/components/calendar/WeekDaysHeader";
import { HorseRow } from "@/components/calendar/HorseRow";
import { ActivityFormDialog } from "@/components/ActivityFormDialog";
import {
  getStableActivities,
  createActivity,
  updateActivity,
  deleteActivity,
} from "@/services/activityService";
import {
  getStableHorses,
  getAllAccessibleHorses,
} from "@/services/horseService";
import { getScheduledRoutineInstances } from "@/services/routineService";
import { ScheduledRoutinesCard } from "@/components/routines";
import { getActivityTypesByStable } from "@/services/activityTypeService";
// Note: formatFullName removed - member formatting now handled by formatMembersForSelection
import type { ActivityEntry, ActivityTypeConfig } from "@/types/activity";
import type { Horse } from "@/types/roles";
import type { RoutineInstance } from "@shared/types";

export default function ActivitiesPlanningPage() {
  const { t } = useTranslation(["activities", "common"]);
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
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
  const horsesQuery = useApiQuery<Horse[]>(
    queryKeys.horses.list({
      stableId: selectedStableId,
      status: "active",
    }),
    async () => {
      if (!user || stables.length === 0) return [];

      // If "all" is selected, fetch horses from all stables
      if (selectedStableId === "all") {
        return await getAllAccessibleHorses("active");
      }

      return await getStableHorses(selectedStableId, "active");
    },
    {
      enabled: !!user && stables.length > 0,
      staleTime: 5 * 60 * 1000,
    },
  );
  const horsesData = horsesQuery.data ?? [];
  const horsesLoading = horsesQuery.isLoading;

  // Load activities for week - based on horses' stables (not useUserStables)
  // Get unique stable IDs from horses for multi-stable queries
  const horseStableIds = useMemo(() => {
    if (selectedStableId !== "all") return [];
    return [
      ...new Set(
        horsesData
          .map((h) => h.currentStableId)
          .filter((id): id is string => !!id),
      ),
    ];
  }, [horsesData, selectedStableId]);

  const activitiesQuery = useApiQuery<ActivityEntry[]>(
    queryKeys.activities.list({
      stableId: selectedStableId,
      horseStableIds:
        selectedStableId === "all"
          ? horseStableIds.sort().join(",")
          : undefined,
      startDate: dateRange.start.toISOString(),
      endDate: dateRange.end.toISOString(),
    }),
    async () => {
      // Early return if no horses data
      if (horsesData.length === 0) return [];

      // If "all" is selected, fetch from all stables that have horses we can see
      if (selectedStableId === "all") {
        if (horseStableIds.length === 0) return [];

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
    },
    {
      enabled:
        horsesData.length > 0 ||
        (selectedStableId !== "all" && !!selectedStableId),
      staleTime: 2 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  );
  const activitiesData = activitiesQuery.data ?? [];
  const activitiesLoading = activitiesQuery.isLoading;

  // Load scheduled/actionable routine instances (status: scheduled, started, in_progress)
  const routinesQuery = useApiQuery<RoutineInstance[]>(
    ["routines", "scheduled", selectedStableId],
    async () => {
      if (stables.length === 0) return [];

      // If "all" is selected, fetch from all stables
      if (selectedStableId === "all") {
        const promises = stables.map((stable) =>
          getScheduledRoutineInstances(stable.id),
        );
        const results = await Promise.all(promises);
        return results.flat();
      }

      // Single stable
      return await getScheduledRoutineInstances(selectedStableId);
    },
    {
      enabled: stables.length > 0,
      staleTime: 2 * 60 * 1000,
    },
  );
  const scheduledRoutines = routinesQuery.data ?? [];
  const routinesLoading = routinesQuery.isLoading;

  // Load activity types - based on horse stables for "all" view
  const activityTypesQuery = useApiQuery<ActivityTypeConfig[]>(
    queryKeys.activityTypes.byStable(
      selectedStableId === "all"
        ? horseStableIds.sort().join(",")
        : selectedStableId || "",
      true,
    ),
    async () => {
      if (selectedStableId === "all") {
        // Get unique stable IDs from horses
        if (horsesData.length === 0) return [];
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
    },
    {
      enabled:
        selectedStableId === "all"
          ? horseStableIds.length > 0
          : !!selectedStableId,
      staleTime: 5 * 60 * 1000,
    },
  );
  const activityTypesData = activityTypesQuery.data ?? [];

  // Fetch organization members for assignment dropdown (filtered by stable access)
  const { data: organizationMembers = [] } = useStablePlanningMembers(
    currentOrganization,
    selectedStableId,
  );

  // Format members for the ActivityFormDialog
  const stableMembers = useMemo(
    () => formatMembersForSelection(organizationMembers),
    [organizationMembers],
  );

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

  const handleSave = async (data: any) => {
    if (!user) return;

    if (data.type === "activity") {
      // Find the horse to get its stable
      const horse = horsesData.find((h) => h.id === data.horseId);
      if (!horse || !horse.currentStableId) {
        throw new Error("Horse not found or not assigned to a stable");
      }

      if (formDialog.data) {
        // Update existing activity
        await updateActivity(formDialog.data.id, user.uid, data);
      } else {
        // Create new activity
        await createActivity(
          user.uid,
          horse.currentStableId,
          data,
          horse.currentStableName || "",
        );
      }
    }
    // Note: tasks and messages are not supported in calendar view

    formDialog.closeDialog();
    setInitialFormData({});
    // Invalidate activities cache to trigger refetch
    await cacheInvalidation.activities.lists();
  };

  const handleDelete = async () => {
    if (!formDialog.data) return;

    const entry = formDialog.data;
    const entryTitle =
      entry.type === "activity"
        ? `${entry.horseName || ""} - ${entry.activityType || ""}`
        : entry.title || "";

    if (
      confirm(t("activities:messages.confirmDelete", { title: entryTitle }))
    ) {
      await deleteActivity(entry.id);
      formDialog.closeDialog();
      setInitialFormData({});
      // Invalidate activities cache to trigger refetch
      await cacheInvalidation.activities.lists();
    }
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

      {/* Scheduled Routines Section */}
      <div className="mb-4 sm:mb-6">
        <ScheduledRoutinesCard
          routineInstances={scheduledRoutines}
          isLoading={routinesLoading}
          selectedStableId={selectedStableId}
        />
      </div>

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
            {horsesLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                {t("activities:planning.loadingHorses")}
              </div>
            ) : horsesData.length > 0 ? (
              horsesData.map((horse) => (
                <HorseRow
                  key={horse.id}
                  horse={horse}
                  weekDays={weekDays}
                  activities={activitiesData}
                  expanded={expandedHorses.has(horse.id)}
                  onToggleExpand={() => handleToggleHorse(horse.id)}
                  onActivityClick={handleActivityClick}
                  onCellClick={handleCellClick}
                  activityTypes={activityTypesData}
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
        onDelete={formDialog.data ? handleDelete : undefined}
        horses={horsesData.map((h) => ({ id: h.id, name: h.name }))}
        stableMembers={stableMembers}
        activityTypes={activityTypesData}
        currentUserId={user?.uid}
      />
    </div>
  );
}
