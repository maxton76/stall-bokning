import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Heart, Search } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStables } from "@/hooks/useUserStables";
import { useActivityPageState } from "@/hooks/useActivityPageState";
import { useHorseFilters } from "@/hooks/useHorseFilters";
import { ActivityPageLayout } from "@/components/layouts/ActivityPageLayout";
import {
  HorseFilterPopover,
  HorseFilterBadges,
} from "@/components/HorseFilterPopover";
import {
  getCareActivities,
  createActivity,
  updateActivity,
} from "@/services/activityService";
import { seedStandardActivityTypes } from "@/services/activityTypeService";
import { CareMatrixView } from "@/components/CareMatrixView";
import { QuickAddDialog } from "@/components/QuickAddDialog";
import { ActivityFormDialog } from "@/components/ActivityFormDialog";
import type { Activity } from "@/types/activity";
import type { FilterConfig } from "@shared/types/filters";
import { Timestamp } from "firebase/firestore";
import { toDate } from "@/utils/timestampUtils";

export default function ActivitiesCarePage() {
  const { t } = useTranslation(["activities", "common"]);
  const { user } = useAuth();

  // State for quick add dialog
  const [quickAddDialog, setQuickAddDialog] = useState<{
    open: boolean;
    horseId?: string;
    activityTypeId?: string;
  }>({ open: false });

  // State for full activity dialog
  const [activityDialog, setActivityDialog] = useState<{
    open: boolean;
    initialHorseId?: string;
    initialActivityTypeId?: string;
    initialDate?: Date;
    editActivity?: Activity; // For editing existing activity
  }>({ open: false });

  // Load user's stables
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);

  // Use shared activity page state hook
  const {
    selectedStableId,
    setSelectedStableId,
    activities,
    activityTypes,
    horses,
    horseGroups,
  } = useActivityPageState({
    user,
    stables,
    activityLoader: getCareActivities,
    includeGroups: true,
  });

  // Track whether we've attempted seeding to prevent infinite loops
  const [seedingAttempted, setSeedingAttempted] = useState(false);

  // Reset seeding state when stable changes
  useEffect(() => {
    setSeedingAttempted(false);
  }, [selectedStableId]);

  // Auto-seed activity types if none exist for the selected stable(s)
  useEffect(() => {
    async function seedIfNeeded() {
      if (
        seedingAttempted ||
        !selectedStableId ||
        !user ||
        stablesLoading ||
        activityTypes.loading ||
        !activityTypes.data ||
        activityTypes.data.length > 0 ||
        stables.length === 0
      ) {
        return;
      }

      setSeedingAttempted(true);

      try {
        if (selectedStableId === "all") {
          // Seed for all stables that don't have activity types
          for (const stable of stables) {
            try {
              await seedStandardActivityTypes(stable.id, user.uid);
            } catch {
              // Ignore errors (409 Conflict = already seeded, 400 = other issue)
            }
          }
        } else {
          // Seed for the selected stable
          try {
            await seedStandardActivityTypes(selectedStableId, user.uid);
          } catch {
            // Ignore errors
          }
        }
        // Reload activity types after seeding attempts
        activityTypes.load();
      } catch (error) {
        console.error("Failed to seed activity types:", error);
      }
    }
    seedIfNeeded();
  }, [
    selectedStableId,
    activityTypes.data,
    activityTypes.loading,
    user,
    stablesLoading,
    stables,
    seedingAttempted,
  ]);

  // Filtering with unified hook
  const {
    filters,
    setFilters,
    filteredHorses,
    activeFilterCount,
    hasActiveFilters,
    clearAllFilters,
    getActiveFilterBadges,
  } = useHorseFilters({
    horses: horses.data || [],
    initialFilters: {},
    stableContext: selectedStableId === "all" ? undefined : selectedStableId,
    t,
  });

  // Filter configuration for ActivitiesCarePage
  const filterConfig: FilterConfig = {
    showSearch: false, // Search is external, not in popover
    showStable: false, // Using stable selector above, not in filter
    showGender: true,
    showAge: true,
    showUsage: true,
    showGroups: true, // Care page needs groups
    showStatus: false,
    useStableContext: true,
  };

  // Helper function to find last activity for horse + activity type
  const findLastActivity = (
    horseId?: string,
    activityTypeId?: string,
  ): Activity | undefined => {
    if (!horseId || !activityTypeId) return undefined;
    return (activities.data || [])
      .filter(
        (a) =>
          a.horseId === horseId && a.activityTypeConfigId === activityTypeId,
      )
      .sort((a, b) => b.date.toMillis() - a.date.toMillis())[0];
  };

  // Handlers for matrix interactions
  const handleCellClick = (
    horseId: string,
    activityTypeId: string,
    nextActivity?: Activity,
  ) => {
    if (nextActivity) {
      // If there's a pending activity, open the form dialog directly for editing
      setActivityDialog({
        open: true,
        editActivity: nextActivity,
        initialHorseId: horseId,
        initialActivityTypeId: activityTypeId,
        initialDate: toDate(nextActivity.date) || new Date(),
      });
    } else {
      // No pending activity, show quick add dialog
      setQuickAddDialog({ open: true, horseId, activityTypeId });
    }
  };

  const handleQuickAdd = () => {
    setQuickAddDialog({ open: false });
    setActivityDialog({
      open: true,
      initialHorseId: quickAddDialog.horseId,
      initialActivityTypeId: quickAddDialog.activityTypeId,
      initialDate: new Date(),
    });
  };

  const handleSave = async (data: any) => {
    try {
      if (!user || !selectedStableId) {
        throw new Error("User or stable not found");
      }

      const isEditing = !!activityDialog.editActivity;

      // When "all" is selected, we need to determine which stable to save to
      // Use the horse's currentStableId from the data
      let stableIdToUse =
        selectedStableId === "all" ? data.horseStableId : selectedStableId;

      if (!stableIdToUse) {
        // Find the stable from the horse data
        const horse = horses.data?.find((h) => h.id === data.horseId);
        if (horse && "currentStableId" in horse) {
          stableIdToUse = (horse as any).currentStableId;
        }
      }

      const stable = stables.find((s) => s.id === stableIdToUse);
      if (!stable) throw new Error("Stable not found");

      const horse = horses.data?.find((h) => h.id === data.horseId);

      // Get activity type name for legacy field
      const activityType = activityTypes.data?.find(
        (t) => t.id === data.activityTypeConfigId,
      );
      const legacyActivityType =
        (activityType?.name.toLowerCase() as any) || "other";

      if (isEditing && activityDialog.editActivity) {
        // Update existing activity
        // Note: using type assertion because UpdateActivityEntryData union type is too restrictive
        await updateActivity(activityDialog.editActivity.id, user.uid, {
          date: data.date instanceof Date ? data.date.toISOString() : data.date,
          activityType: legacyActivityType,
          activityTypeConfigId: data.activityTypeConfigId,
          activityTypeColor: data.activityTypeColor,
          note: data.note,
          assignedTo: data.assignedTo,
          assignedToName: data.assignedToName,
        } as any);
      } else {
        // Create new activity
        await createActivity(
          user.uid,
          stableIdToUse,
          {
            date:
              data.date instanceof Date ? data.date.toISOString() : data.date,
            horseId: data.horseId,
            horseName: horse?.name || "Unknown",
            activityType: legacyActivityType,
            activityTypeConfigId: data.activityTypeConfigId,
            activityTypeColor: data.activityTypeColor,
            note: data.note,
            assignedTo: data.assignedTo,
            assignedToName: data.assignedToName,
            status: "pending" as const,
          },
          stable.name,
        );
      }

      setActivityDialog({ open: false });
      await activities.reload();
    } catch (error) {
      console.error("Failed to save activity:", error);
      throw error; // Let dialog handle error display
    }
  };

  return (
    <ActivityPageLayout
      icon={Heart}
      title={t("activities:care.title")}
      description={t("activities:care.description")}
      selectedStableId={selectedStableId}
      onStableChange={setSelectedStableId}
      stables={stables}
      stablesLoading={stablesLoading}
      showStableSelector={false}
    >
      {/* Care Activities Matrix/Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              {/* Stable Selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">
                  {t("activities:care.stableLabel")}:
                </label>
                <Select
                  value={selectedStableId}
                  onValueChange={setSelectedStableId}
                >
                  <SelectTrigger className="w-[200px]">
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
            </div>

            {/* Filters Row */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Filter Popover */}
                <HorseFilterPopover
                  filters={filters}
                  onFiltersChange={setFilters}
                  config={filterConfig}
                  groups={horseGroups.data || []}
                  activeFilterCount={activeFilterCount}
                  onClearAll={clearAllFilters}
                />

                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("activities:care.search.placeholder")}
                    value={filters.searchQuery}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        searchQuery: e.target.value,
                      }))
                    }
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Filter Badges */}
              {hasActiveFilters && (
                <HorseFilterBadges
                  badges={getActiveFilterBadges()}
                  onClearAll={clearAllFilters}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activities.loading || horses.loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {t("activities:care.loading")}
              </p>
            </div>
          ) : (
            <CareMatrixView
              horses={filteredHorses.map((h) => ({ id: h.id, name: h.name }))}
              activityTypes={activityTypes.data || []}
              activities={activities.data || []}
              onCellClick={handleCellClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Quick Add Dialog */}
      <QuickAddDialog
        open={quickAddDialog.open}
        onOpenChange={(open) => setQuickAddDialog({ ...quickAddDialog, open })}
        horse={filteredHorses.find((h) => h.id === quickAddDialog.horseId)}
        activityType={activityTypes.data?.find(
          (t) => t.id === quickAddDialog.activityTypeId,
        )}
        lastActivity={findLastActivity(
          quickAddDialog.horseId,
          quickAddDialog.activityTypeId,
        )}
        onAdd={handleQuickAdd}
      />

      {/* Activity Form Dialog */}
      <ActivityFormDialog
        open={activityDialog.open}
        onOpenChange={(open) => setActivityDialog({ ...activityDialog, open })}
        entry={
          activityDialog.editActivity
            ? {
                ...activityDialog.editActivity,
                type: "activity" as const,
              }
            : undefined
        }
        initialDate={activityDialog.initialDate}
        initialHorseId={activityDialog.initialHorseId}
        initialActivityType={activityDialog.initialActivityTypeId}
        horses={filteredHorses.map((h) => ({ id: h.id, name: h.name }))}
        activityTypes={activityTypes.data || []}
        onSave={handleSave}
      />
    </ActivityPageLayout>
  );
}
