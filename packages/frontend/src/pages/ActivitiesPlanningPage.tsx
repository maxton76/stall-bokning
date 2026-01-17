import { useState, useEffect, useMemo } from "react";
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
import { useUserStables } from "@/hooks/useUserStables";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useDialog } from "@/hooks/useDialog";
import { useActivityTypes } from "@/hooks/useActivityTypes";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { WeekDaysHeader } from "@/components/calendar/WeekDaysHeader";
import { HorseRow } from "@/components/calendar/HorseRow";
import { ActivityFormDialog } from "@/components/ActivityFormDialog";
import { getStableActivities } from "@/services/activityService";
import {
  getUserHorsesAtStable,
  getUserHorsesAtStables,
} from "@/services/horseService";
import type { ActivityEntry } from "@/types/activity";
import type { Horse } from "@/types/roles";

export default function ActivitiesPlanningPage() {
  const { t } = useTranslation(["activities", "common"]);
  const { user } = useAuth();
  const [selectedStableId, setSelectedStableId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"day" | "week">("week");
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [expandedHorses, setExpandedHorses] = useState<Set<string>>(new Set());
  const formDialog = useDialog<ActivityEntry>();

  // Load user's stables
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);

  // Helper to check if a specific stable is selected (not "all")
  const isSpecificStable = selectedStableId && selectedStableId !== "all";

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

  // Load activities for week
  const activities = useAsyncData<ActivityEntry[]>({
    loadFn: async () => {
      if (stables.length === 0) return [];

      // If "all" is selected, fetch from all stables
      if (selectedStableId === "all") {
        const promises = stables.map((stable) =>
          getStableActivities(stable.id, dateRange.start, dateRange.end),
        );
        const results = await Promise.all(promises);
        // Merge and sort by date
        return results.flat().sort((a, b) => {
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
  });

  // Load horses
  const horses = useAsyncData<Horse[]>({
    loadFn: async () => {
      if (!user || stables.length === 0) return [];

      // If "all" is selected, fetch horses from all stables
      if (selectedStableId === "all") {
        const stableIds = stables.map((s) => s.id);
        return await getUserHorsesAtStables(user.uid, stableIds);
      }

      return await getUserHorsesAtStable(user.uid, selectedStableId);
    },
  });

  // Load activity types
  const activityTypes = useActivityTypes(selectedStableId, true);

  // Reload activities when stable, stables list, or date range changes
  useEffect(() => {
    if (stables.length > 0) {
      activities.load();
    }
  }, [selectedStableId, stables, dateRange.start, dateRange.end]);

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
  const handleCellClick = (_horseId: string, _date: Date, _hour?: number) => {
    // Don't open dialog when viewing all stables
    if (!isSpecificStable) return;

    // Open dialog with undefined entry
    // TODO: Pass horseId and date as initial data to ActivityFormDialog
    // ActivityFormDialog needs to support initialData prop for horseId and date
    formDialog.openDialog(undefined);
  };

  // Activity click - edit existing activity
  const handleActivityClick = (activity: ActivityEntry) => {
    formDialog.openDialog(activity);
  };

  const handleSave = async (data: any) => {
    // TODO: Implement save logic
    console.log("Save activity:", data);
    formDialog.closeDialog();
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
          disableAdd={!isSpecificStable}
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
        onOpenChange={formDialog.closeDialog}
        entry={formDialog.data || undefined}
        onSave={handleSave}
        horses={horses.data?.map((h) => ({ id: h.id, name: h.name })) || []}
        stableMembers={[]}
        activityTypes={activityTypes.data || []}
      />
    </div>
  );
}
