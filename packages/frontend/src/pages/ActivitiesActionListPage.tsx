import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOrgPermissions } from "@/hooks/useOrgPermissions";
import { useDialog } from "@/hooks/useDialog";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useCRUD } from "@/hooks/useCRUD";
import { useUserStables } from "@/hooks/useUserStables";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useActivityFilters } from "@/hooks/useActivityFilters";
import { useActivitiesByPeriod } from "@/hooks/useActivitiesQuery";
import { useActivityTypesQuery } from "@/hooks/useActivityTypesQuery";
import {
  useStablePlanningMembers,
  formatMembersForSelection,
} from "@/hooks/useOrganizationMembers";
import { ActivityFormDialog } from "@/components/ActivityFormDialog";
import { ActivityFilterPopover } from "@/components/activities/ActivityFilterPopover";
import { AssigneeAvatar } from "@/components/activities/AssigneeAvatar";
import { SpecialInstructionsPopover } from "@/components/activities/SpecialInstructionsPopover";
import { Timestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { toDate } from "@/utils/timestampUtils";
import { queryKeys, cacheInvalidation } from "@/lib/queryClient";
import {
  createActivity,
  createTask,
  createMessage,
  updateActivity,
  deleteActivity,
  completeActivity,
} from "@/services/activityService";
import { getUserHorses } from "@/services/horseService";
import type {
  ActivityEntry,
  ActivityFilters,
  PeriodType,
} from "@/types/activity";
import type { Horse } from "@/types/roles";
import { ACTIVITY_TYPES as ACTIVITY_TYPE_CONFIG } from "@/types/activity";
import { useToast } from "@/hooks/use-toast";
import {
  format,
  isSameDay,
  isSameWeek,
  isSameMonth,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  addYears,
  subYears,
  startOfWeek,
  endOfWeek,
} from "date-fns";

export default function ActivitiesActionListPage() {
  console.log("[ActivitiesPage] Component mounting/rendering");
  const { t } = useTranslation(["activities", "common"]);
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { hasPermission } = useOrgPermissions(currentOrganization);
  const canManageActivities = hasPermission("manage_activities");

  const PERIOD_TYPES: Array<{ value: PeriodType; label: string }> = [
    { value: "day", label: t("activities:actionList.period.day") },
    { value: "week", label: t("activities:actionList.period.week") },
    { value: "month", label: t("activities:actionList.period.month") },
  ];
  const { toast } = useToast();
  const [periodType, setPeriodType] = useState<PeriodType>("day");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedStableId, setSelectedStableId] = useState<string>("all");
  const [hasInitializedDefault, setHasInitializedDefault] = useState(false);
  const [filters, setFilters] = useState<ActivityFilters>({
    groupBy: "none",
    forMe: false,
    showFinished: false,
    entryTypes: ["activity", "task", "message"],
  });
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());

  // Navigation handlers
  const handleNext = () => {
    setCurrentDate((current) => {
      const now = new Date();
      const oneYearAhead = addYears(now, 1);

      let newDate: Date;
      switch (periodType) {
        case "day":
          newDate = addDays(current, 1);
          break;
        case "week":
          newDate = addWeeks(current, 1);
          break;
        case "month":
          newDate = addMonths(current, 1);
          break;
        default:
          return current;
      }

      // Limit to 1 year ahead
      return newDate <= oneYearAhead ? newDate : current;
    });
  };

  const handlePrevious = () => {
    setCurrentDate((current) => {
      const now = new Date();
      const oneYearBehind = subYears(now, 1);

      let newDate: Date;
      switch (periodType) {
        case "day":
          newDate = subDays(current, 1);
          break;
        case "week":
          newDate = subWeeks(current, 1);
          break;
        case "month":
          newDate = subMonths(current, 1);
          break;
        default:
          return current;
      }

      // Limit to 1 year behind
      return newDate >= oneYearBehind ? newDate : current;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getDateRangeLabel = (date: Date, type: PeriodType): string => {
    const now = new Date();

    switch (type) {
      case "day":
        if (isSameDay(date, now))
          return t("activities:actionList.dateLabels.today");
        if (isSameDay(date, addDays(now, 1)))
          return t("activities:actionList.dateLabels.tomorrow");
        return format(date, "MMMM d, yyyy");

      case "week":
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(date, { weekStartsOn: 1 });

        if (isSameWeek(date, now, { weekStartsOn: 1 }))
          return t("activities:actionList.dateLabels.thisWeek");
        if (isSameWeek(date, addWeeks(now, 1), { weekStartsOn: 1 }))
          return t("activities:actionList.dateLabels.nextWeek");

        return `${t("activities:actionList.dateLabels.weekOf")} ${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;

      case "month":
        if (isSameMonth(date, now))
          return t("activities:actionList.dateLabels.thisMonth");
        if (isSameMonth(date, addMonths(now, 1)))
          return t("activities:actionList.dateLabels.nextMonth");

        return format(date, "MMMM yyyy");
    }
  };

  // Determine if navigation buttons should be disabled
  const now = new Date();
  const oneYearAhead = addYears(now, 1);
  const oneYearBehind = subYears(now, 1);
  const isNextDisabled = currentDate >= oneYearAhead;
  const isPreviousDisabled = currentDate <= oneYearBehind;

  // Load user's stables and preferences
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);
  const { preferences, isLoading: preferencesLoading } = useUserPreferences();

  console.log("[ActivitiesPage] Data state:", {
    stablesLoading,
    preferencesLoading,
    stablesCount: stables.length,
    preferences,
    hasInitializedDefault,
  });

  // Set default stable from user preferences when loaded (only once)
  useEffect(() => {
    console.log("[DefaultStable] Effect running:", {
      hasInitializedDefault,
      stablesLoading,
      preferencesLoading,
      stablesCount: stables.length,
      defaultStableId: preferences?.defaultStableId,
      preferences,
    });

    // Only initialize once, after both stables and preferences are loaded
    if (
      !hasInitializedDefault &&
      !stablesLoading &&
      !preferencesLoading &&
      stables.length > 0
    ) {
      console.log("[DefaultStable] Conditions met, checking defaultStableId");
      if (preferences?.defaultStableId) {
        const hasAccess = stables.some(
          (s) => s.id === preferences.defaultStableId,
        );
        console.log(
          "[DefaultStable] hasAccess:",
          hasAccess,
          "stables:",
          stables.map((s) => s.id),
        );
        if (hasAccess) {
          console.log(
            "[DefaultStable] Setting selectedStableId to:",
            preferences.defaultStableId,
          );
          setSelectedStableId(preferences.defaultStableId);
        }
      } else {
        console.log("[DefaultStable] No defaultStableId in preferences");
      }
      setHasInitializedDefault(true);
    }
  }, [
    hasInitializedDefault,
    stablesLoading,
    preferencesLoading,
    stables,
    preferences?.defaultStableId,
  ]);

  // Load activities for selected stable and period using TanStack Query
  const {
    activities: activitiesData,
    loading: activitiesLoading,
    query: activitiesQuery,
  } = useActivitiesByPeriod(selectedStableId, stables, currentDate, periodType);

  // Load horses for activity form using TanStack Query
  const { data: horsesData = [], isLoading: horsesLoading } = useApiQuery<
    Horse[]
  >(queryKeys.horses.my(), () => getUserHorses(user!.uid), { enabled: !!user });

  // Load activity types for selected stable using TanStack Query
  const { activityTypes: activityTypesData, loading: activityTypesLoading } =
    useActivityTypesQuery(selectedStableId === "all" ? null : selectedStableId);

  // Filter and group activities
  const { filteredActivities, groupedActivities, temporalSections } =
    useActivityFilters(activitiesData, filters, user?.uid, periodType);

  // Dialog state
  const formDialog = useDialog<ActivityEntry>();

  // Get query client for cache operations
  const queryClient = useQueryClient();

  // CRUD operations
  const { create, update, remove } = useCRUD<ActivityEntry>({
    createFn: async (data: any) => {
      if (!user) throw new Error("User not authenticated");

      if (data.type === "activity") {
        // For activities, use the horse's stable (not the selected stable filter)
        const horse = horsesData.find((h) => h.id === data.horseId);
        if (!horse) throw new Error("Horse not found");
        if (!horse.currentStableId)
          throw new Error("Horse is not assigned to a stable");

        return await createActivity(
          user.uid,
          horse.currentStableId,
          data,
          horse.currentStableName || "",
        );
      } else {
        // For tasks and messages, use the selected stable (must have a specific stable selected)
        if (!selectedStableId || selectedStableId === "all") {
          throw new Error(
            "Please select a specific stable for tasks and messages",
          );
        }
        const stable = stables.find((s) => s.id === selectedStableId);
        if (!stable) throw new Error("Stable not found");

        if (data.type === "task") {
          return await createTask(
            user.uid,
            selectedStableId,
            data,
            stable.name,
          );
        } else {
          return await createMessage(
            user.uid,
            selectedStableId,
            data,
            stable.name,
          );
        }
      }
    },
    updateFn: async (id, data) => {
      if (!user) throw new Error("User not authenticated");
      await updateActivity(id, user.uid, data);
    },
    deleteFn: async (id) => {
      await deleteActivity(id);
    },
    onSuccess: async () => {
      // Invalidate activities cache to trigger refetch
      await cacheInvalidation.activities.lists();
    },
    successMessages: {
      create: t("activities:messages.createSuccess"),
      update: t("activities:messages.updateSuccess"),
      delete: t("activities:messages.deleteSuccess"),
    },
  });

  // Handlers
  const handleAddEntry = () => {
    formDialog.openDialog();
  };

  const handleEditEntry = (entry: ActivityEntry) => {
    formDialog.openDialog(entry);
  };

  const handleDeleteEntry = async (entry: ActivityEntry) => {
    const entryTitle =
      entry.type === "activity"
        ? `${entry.horseName} - ${ACTIVITY_TYPE_CONFIG.find((t) => t.value === entry.activityType)?.label}`
        : entry.title;

    if (
      confirm(t("activities:messages.confirmDelete", { title: entryTitle }))
    ) {
      await remove(entry.id);
    }
  };

  const handleCompleteEntry = async (entry: ActivityEntry) => {
    if (!user || entry.status === "completed") return;

    setCompletingIds((prev) => new Set(prev).add(entry.id));

    // Get the current query key for optimistic updates
    const isAllStables = selectedStableId === "all";
    const stableIds = stables.map((s) => s.id);
    const dateString = currentDate.toISOString().split("T")[0] ?? "";
    const currentQueryKey = isAllStables
      ? queryKeys.activities.byPeriodMultiStable(
          stableIds,
          dateString,
          periodType,
        )
      : queryKeys.activities.byPeriod(
          selectedStableId || "",
          dateString,
          periodType,
        );

    try {
      // Optimistic update using TanStack Query
      queryClient.setQueryData<ActivityEntry[]>(
        currentQueryKey,
        (old) =>
          old?.map((a) =>
            a.id === entry.id ? { ...a, status: "completed" as const } : a,
          ) ?? [],
      );

      await completeActivity(entry.id, user.uid);

      toast({
        title: t("activities:actionList.completed"),
        description: t("activities:actionList.entryCompleted"),
      });

      // Invalidate to ensure fresh data from server
      await cacheInvalidation.activities.lists();
    } catch (error) {
      console.error("Failed to complete:", error);
      // Rollback by invalidating cache (triggers refetch)
      await cacheInvalidation.activities.lists();
      toast({
        title: t("common:messages.error"),
        description: t("activities:messages.completeError"),
        variant: "destructive",
      });
    } finally {
      setCompletingIds((prev) => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
    }
  };

  const handleSaveEntry = async (data: any) => {
    try {
      if (formDialog.data) {
        // Update existing entry
        await update(formDialog.data.id, data);
      } else {
        // Create new entry
        await create(data);
      }
      formDialog.closeDialog();
    } catch (error) {
      console.error("Failed to save entry:", error);
      toast({
        title: t("common:messages.error"),
        description: t("activities:messages.saveError"),
        variant: "destructive",
      });
    }
  };

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

  if (stablesLoading || preferencesLoading) {
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
              {t("activities:emptyState.noStables.description")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("activities:actionList.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("activities:actionList.description")}
          </p>
        </div>
        {canManageActivities && (
          <Button
            onClick={handleAddEntry}
            disabled={!selectedStableId || selectedStableId === "all"}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("activities:actionList.addEntry")}
          </Button>
        )}
      </div>

      {/* Combined Card */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Top Row: Stable Selector + Period Tabs + Filter */}
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Stable Selector */}
            <div className="w-full md:w-64">
              <Select
                value={selectedStableId}
                onValueChange={setSelectedStableId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("activities:stable.select")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("activities:stable.all")}
                  </SelectItem>
                  {stables.map((stable) => (
                    <SelectItem key={stable.id} value={stable.id}>
                      {stable.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Period Type Selection */}
            <Tabs
              value={periodType}
              onValueChange={(v) => setPeriodType(v as PeriodType)}
              className="flex-1"
            >
              <TabsList className="grid w-full md:w-[300px] grid-cols-3">
                {PERIOD_TYPES.map((type) => (
                  <TabsTrigger key={type.value} value={type.value}>
                    {type.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Filter Button */}
            <ActivityFilterPopover
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>

          {/* Navigation Controls + Date Range */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Date Range Display */}
            <div className="text-sm text-muted-foreground order-2 sm:order-1">
              {t("activities:actionList.navigation.showing")}:{" "}
              {getDateRangeLabel(currentDate, periodType)}
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-center sm:justify-end gap-2 order-1 sm:order-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevious}
                disabled={isPreviousDisabled}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday}>
                {t("activities:actionList.navigation.today")}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                disabled={isNextDisabled}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-b"></div>

          {/* Activities List */}
          {activitiesLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {t("activities:actionList.loading")}
              </p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {t("activities:actionList.noActivities")}
              </p>
            </div>
          ) : temporalSections ? (
            // TEMPORAL SECTIONS VIEW
            <div className="space-y-6">
              {temporalSections.overdue.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-red-600">
                      {t("activities:actionList.sections.overdue")}
                    </h3>
                    <Badge variant="destructive" className="text-xs">
                      {temporalSections.overdue.length}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {temporalSections.overdue.map((entry) => (
                      <ActivityCard
                        key={entry.id}
                        entry={entry}
                        onEdit={() => handleEditEntry(entry)}
                        onDelete={() => handleDeleteEntry(entry)}
                        onComplete={() => handleCompleteEntry(entry)}
                        isCompleting={completingIds.has(entry.id)}
                        canManage={canManageActivities}
                        activityTypes={activityTypesData}
                        horses={horsesData}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              )}

              {temporalSections.today.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold">
                      {t("activities:actionList.sections.today")}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {temporalSections.today.length}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {temporalSections.today.map((entry) => (
                      <ActivityCard
                        key={entry.id}
                        entry={entry}
                        onEdit={() => handleEditEntry(entry)}
                        onDelete={() => handleDeleteEntry(entry)}
                        onComplete={() => handleCompleteEntry(entry)}
                        isCompleting={completingIds.has(entry.id)}
                        canManage={canManageActivities}
                        activityTypes={activityTypesData}
                        horses={horsesData}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              )}

              {temporalSections.upcoming.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      {t("activities:actionList.sections.upcoming")}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {temporalSections.upcoming.length}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {temporalSections.upcoming.map((entry) => (
                      <ActivityCard
                        key={entry.id}
                        entry={entry}
                        onEdit={() => handleEditEntry(entry)}
                        onDelete={() => handleDeleteEntry(entry)}
                        onComplete={() => handleCompleteEntry(entry)}
                        isCompleting={completingIds.has(entry.id)}
                        canManage={canManageActivities}
                        activityTypes={activityTypesData}
                        horses={horsesData}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : filters.groupBy === "none" ? (
            // UNGROUPED LIST
            <div className="space-y-1">
              {filteredActivities.map((entry) => (
                <ActivityCard
                  key={entry.id}
                  entry={entry}
                  onEdit={() => handleEditEntry(entry)}
                  onDelete={() => handleDeleteEntry(entry)}
                  onComplete={() => handleCompleteEntry(entry)}
                  isCompleting={completingIds.has(entry.id)}
                  canManage={canManageActivities}
                  activityTypes={activityTypesData}
                  horses={horsesData}
                  t={t}
                />
              ))}
            </div>
          ) : (
            // GROUPED VIEW
            <div className="space-y-6">
              {Object.entries(groupedActivities).map(([groupKey, entries]) => (
                <div key={groupKey}>
                  <h3 className="text-sm font-semibold mb-3">{groupKey}</h3>
                  <div className="space-y-1">
                    {entries.map((entry) => (
                      <ActivityCard
                        key={entry.id}
                        entry={entry}
                        onEdit={() => handleEditEntry(entry)}
                        onDelete={() => handleDeleteEntry(entry)}
                        onComplete={() => handleCompleteEntry(entry)}
                        isCompleting={completingIds.has(entry.id)}
                        canManage={canManageActivities}
                        activityTypes={activityTypesData}
                        horses={horsesData}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <ActivityFormDialog
        open={formDialog.open}
        onOpenChange={formDialog.closeDialog}
        entry={formDialog.data || undefined}
        onSave={handleSaveEntry}
        horses={horsesData.map((h) => ({ id: h.id, name: h.name }))}
        stableMembers={stableMembers}
        activityTypes={activityTypesData}
        currentUserId={user?.uid}
      />
    </div>
  );
}

// Activity Card Component
interface ActivityCardProps {
  entry: ActivityEntry;
  onEdit: () => void;
  onDelete: () => void;
  onComplete: () => void;
  isCompleting: boolean;
  canManage: boolean;
  activityTypes: Array<any>; // Activity type configs
  horses: Array<{ id: string; name: string }>; // Horse lookup data
  t: (key: string) => string; // Translation function
}

// Helper functions for ActivityCard
function getEntryTitle(
  entry: ActivityEntry,
  activityTypes: any[],
  horses: Array<{ id: string; name: string }>,
): string {
  if (entry.type === "activity") {
    const typeConfig = activityTypes.find(
      (t) => t.id === entry.activityTypeConfigId,
    );
    const typeName = typeConfig?.name || "Activity";

    // Try to get horse name from entry, otherwise look it up from horses array
    let horseName = entry.horseName;
    if (!horseName && entry.horseId) {
      const horse = horses.find((h) => h.id === entry.horseId);
      horseName = horse?.name || "Unknown Horse";
    } else if (!horseName) {
      horseName = "Unknown Horse";
    }

    return `${horseName} - ${typeName}`;
  }
  return entry.title;
}

function isOverdue(entry: ActivityEntry): boolean {
  if (entry.status === "completed") return false;
  const entryDate = toDate(entry.date);
  return entryDate ? entryDate < new Date() : false;
}

function formatActivityDate(
  timestamp: Timestamp,
  t: (key: string) => string,
): string {
  const date = toDate(timestamp);
  if (!date) return t("common:labels.noData");
  const today = new Date();

  if (isSameDay(date, today))
    return t("activities:actionList.dateLabels.today");
  if (isSameDay(date, addDays(today, 1)))
    return t("activities:actionList.dateLabels.tomorrow");
  return format(date, "MMM d, yyyy");
}

function getBadge(entry: ActivityEntry, activityTypes: any[]): string | null {
  if (entry.type === "activity") {
    const typeConfig = activityTypes.find(
      (t) => t.id === entry.activityTypeConfigId,
    );
    return typeConfig?.category || null;
  }
  return entry.type.charAt(0).toUpperCase() + entry.type.slice(1);
}

function getAssigneeName(entry: ActivityEntry): string | null {
  return entry.type === "activity" || entry.type === "task"
    ? entry.assignedToName || null
    : null;
}

function ActivityCard({
  entry,
  onComplete,
  onEdit,
  onDelete,
  activityTypes,
  horses,
  isCompleting,
  canManage,
  t,
}: ActivityCardProps) {
  const badge = getBadge(entry, activityTypes);
  const assigneeName = getAssigneeName(entry);

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-3 py-2 border rounded-md hover:bg-accent/30 transition-colors",
        canManage && "cursor-pointer",
      )}
      onClick={canManage ? onEdit : undefined}
    >
      {/* Checkbox - Left */}
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={entry.status === "completed"}
          onCheckedChange={() => onComplete()}
          disabled={entry.status === "completed" || isCompleting}
          className="shrink-0"
        />
      </div>

      {/* Content - Center */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {getEntryTitle(entry, activityTypes, horses)}
        </p>

        <div className="flex items-center gap-2 mt-0.5">
          <span
            className={cn(
              "text-xs",
              isOverdue(entry)
                ? "text-red-600 font-medium"
                : "text-muted-foreground",
            )}
          >
            {formatActivityDate(entry.date, t)}
          </span>
          {badge && (
            <>
              <span className="text-muted-foreground">•</span>
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                {badge}
              </Badge>
            </>
          )}
        </div>
      </div>

      {/* Special Instructions Bell - only if entry is an activity with special instructions */}
      {"horseHasSpecialInstructions" in entry &&
        entry.horseHasSpecialInstructions &&
        "horseId" in entry &&
        entry.horseId && (
          <div onClick={(e) => e.stopPropagation()}>
            <SpecialInstructionsPopover
              horseId={entry.horseId}
              horseName={
                "horseName" in entry ? entry.horseName || "Horse" : "Horse"
              }
            />
          </div>
        )}

      {/* Avatar + Context Menu - Right */}
      <div
        className="flex items-center gap-2 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <AssigneeAvatar name={assigneeName} size="sm" />

        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-60 group-hover:opacity-100 transition-opacity focus:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                {t("common:buttons.edit")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                {t("common:buttons.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
