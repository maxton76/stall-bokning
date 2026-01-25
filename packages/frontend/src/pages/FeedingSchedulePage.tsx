import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import { Calendar as CalendarIcon, Search, Wheat, Filter } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FeedingCellPopover } from "@/components/FeedingCellPopover";
import { HorseFeedingFormDialog } from "@/components/HorseFeedingFormDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStables } from "@/hooks/useUserStables";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useFeedTypesQuery } from "@/hooks/useFeedTypesQuery";
import { useFeedingTimesQuery } from "@/hooks/useFeedingTimesQuery";
import { useCRUD } from "@/hooks/useCRUD";
import { useDialog } from "@/hooks/useDialog";
import { queryKeys, cacheInvalidation } from "@/lib/queryClient";
import type {
  FeedType,
  FeedingTime,
  HorseFeeding,
  CreateHorseFeedingData,
} from "@shared/types";
import type { Horse } from "@/types/roles";
import { getStableHorses } from "@/services/horseService";
import {
  getHorseFeedingsByStable,
  createHorseFeeding,
  updateHorseFeeding,
  deleteHorseFeeding,
} from "@/services/horseFeedingService";
import { QUANTITY_MEASURE_ABBREVIATIONS } from "@/constants/feeding";
import { cn } from "@/lib/utils";

interface FeedingDialogState {
  horseId: string;
  horseName: string;
  feedingTimeId?: string;
  existingFeeding?: HorseFeeding;
}

export default function FeedingSchedulePage() {
  const { t, i18n } = useTranslation(["feeding", "common"]);
  const { user } = useAuth();
  const locale = i18n.language === "sv" ? sv : enUS;
  const [selectedStableId, setSelectedStableId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog state
  const feedingDialog = useDialog<FeedingDialogState>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingFeeding, setDeletingFeeding] = useState<HorseFeeding | null>(
    null,
  );

  // Load user's stables
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);

  // Get the selected stable's organizationId
  const selectedStable = stables.find((s) => s.id === selectedStableId);
  const organizationId = selectedStable?.organizationId;

  // Auto-select first stable when stables load
  useEffect(() => {
    const firstStable = stables[0];
    if (firstStable && !selectedStableId) {
      setSelectedStableId(firstStable.id);
    }
  }, [stables, selectedStableId]);

  // Date string for query key
  const dateString = selectedDate.toISOString().split("T")[0] ?? "";

  // Load horses for selected stable
  const horsesQuery = useApiQuery<Horse[]>(
    queryKeys.horses.list({ stableId: selectedStableId, context: "feeding" }),
    () => getStableHorses(selectedStableId!),
    {
      enabled: !!selectedStableId && stables.length > 0,
      staleTime: 5 * 60 * 1000,
    },
  );
  const horsesData = horsesQuery.data ?? [];
  const horsesLoading = horsesQuery.isLoading;

  // Load feed types for the organization (shared across all stables)
  const { feedTypes: feedTypesData, loading: feedTypesLoading } =
    useFeedTypesQuery(organizationId, false);

  // Load feeding times for selected stable
  const { feedingTimes: feedingTimesData, loading: feedingTimesLoading } =
    useFeedingTimesQuery(selectedStableId || undefined, false);

  // Load horse feedings for selected stable and date
  const horseFeedingsQuery = useApiQuery<HorseFeeding[]>(
    queryKeys.horseFeedings.byStable(selectedStableId || "", dateString, true),
    () =>
      getHorseFeedingsByStable(selectedStableId!, {
        date: selectedDate,
        activeOnly: true,
      }),
    {
      enabled: !!selectedStableId && stables.length > 0,
      staleTime: 2 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  );
  const horseFeedingsData = horseFeedingsQuery.data ?? [];
  const horseFeedingsLoading = horseFeedingsQuery.isLoading;

  // Sort feeding times by sortOrder
  const sortedFeedingTimes = useMemo(() => {
    return [...feedingTimesData].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [feedingTimesData]);

  // Filter horses by search query
  const filteredHorses = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return horsesData;

    return horsesData.filter(
      (horse) =>
        horse.name.toLowerCase().includes(query) ||
        horse.ueln?.toLowerCase().includes(query) ||
        horse.chipNumber?.toLowerCase().includes(query),
    );
  }, [horsesData, searchQuery]);

  // Group feedings by horse and feeding time ID (ensures renamed times still match)
  const feedingsByHorseAndTimeId = useMemo(() => {
    const map = new Map<string, HorseFeeding[]>();

    horseFeedingsData.forEach((feeding) => {
      // Use feeding time ID for matching (handles renamed feeding times correctly)
      const key = `${feeding.horseId}_${feeding.feedingTimeId}`;
      const existing = map.get(key) || [];
      map.set(key, [...existing, feeding]);
    });

    return map;
  }, [horseFeedingsData]);

  // Get feedings for a specific horse and feeding time
  const getFeedingsForCell = (
    horseId: string,
    feedingTimeId: string,
  ): HorseFeeding[] => {
    return feedingsByHorseAndTimeId.get(`${horseId}_${feedingTimeId}`) || [];
  };

  // CRUD operations
  const feedingCRUD = useCRUD<HorseFeeding>({
    createFn: async (data) => {
      if (!selectedStableId) throw new Error("No stable selected");
      return await createHorseFeeding(
        selectedStableId,
        data as CreateHorseFeedingData,
      );
    },
    updateFn: async (id, data) => {
      await updateHorseFeeding(id, data);
    },
    deleteFn: async (id) => {
      await deleteHorseFeeding(id);
    },
    onSuccess: async () => {
      await cacheInvalidation.horseFeedings.all();
    },
    successMessages: {
      create: t("feeding:horseFeeding.messages.createSuccess"),
      update: t("feeding:horseFeeding.messages.updateSuccess"),
      delete: t("feeding:horseFeeding.messages.deleteSuccess"),
    },
  });

  // Handlers
  const handleAddFeeding = (
    horseId: string,
    horseName: string,
    feedingTimeId: string,
  ) => {
    feedingDialog.openDialog({
      horseId,
      horseName,
      feedingTimeId,
    });
  };

  const handleEditFeeding = (
    feeding: HorseFeeding,
    horseId: string,
    horseName: string,
  ) => {
    feedingDialog.openDialog({
      horseId,
      horseName,
      existingFeeding: feeding,
    });
  };

  const handleDeleteFeeding = (feeding: HorseFeeding) => {
    setDeletingFeeding(feeding);
    setDeleteDialogOpen(true);
  };

  const handleSaveFeeding = async (data: CreateHorseFeedingData) => {
    if (feedingDialog.data?.existingFeeding) {
      await feedingCRUD.update(feedingDialog.data.existingFeeding.id, data);
    } else {
      await feedingCRUD.create(data);
    }
    feedingDialog.closeDialog();
  };

  const confirmDelete = async () => {
    if (!deletingFeeding) return;
    await feedingCRUD.remove(deletingFeeding.id);
    setDeleteDialogOpen(false);
    setDeletingFeeding(null);
  };

  // Loading and empty states
  if (stablesLoading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">
          {t("feeding:loadingStates.stables")}
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
              {t("feeding:loadingStates.noStablesTitle")}
            </h3>
            <p className="text-muted-foreground">
              {t("feeding:loadingStates.noStablesForSchedule")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoading =
    horsesLoading ||
    feedTypesLoading ||
    feedingTimesLoading ||
    horseFeedingsLoading;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Wheat className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("feeding:page.scheduleTitle")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("feeding:page.scheduleDescription")}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Stable Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">
                {t("feeding:schedule.stable")}
              </label>
              <Select
                value={selectedStableId}
                onValueChange={setSelectedStableId}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue
                    placeholder={t("feeding:schedule.selectStable")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {stables.map((stable) => (
                    <SelectItem key={stable.id} value={stable.id}>
                      {stable.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full sm:w-[240px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "PPP", { locale })
                  ) : (
                    <span>{t("feeding:schedule.pickDate")}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={locale}
                  weekStartsOn={1}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("feeding:schedule.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Quick navigation buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
              >
                {t("feeding:schedule.today")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Grid */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t("feeding:schedule.title", {
              date: format(selectedDate, "EEEE, MMMM d, yyyy", { locale }),
            })}
          </CardTitle>
          <CardDescription>{t("feeding:schedule.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {t("feeding:schedule.loading")}
              </p>
            </div>
          ) : sortedFeedingTimes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {t("feeding:schedule.noFeedingTimesConfigured")}
              </p>
              <Button
                variant="link"
                className="mt-2"
                onClick={() => (window.location.href = "/feeding/settings")}
              >
                {t("feeding:schedule.goToSettings")}
              </Button>
            </div>
          ) : filteredHorses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery
                  ? t("feeding:schedule.noHorsesMatchingSearch")
                  : t("feeding:schedule.noHorsesFound")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px] sticky left-0 bg-background z-10">
                      {t("feeding:schedule.horse")}
                    </TableHead>
                    {sortedFeedingTimes.map((time) => (
                      <TableHead
                        key={time.id}
                        className="text-center min-w-[150px]"
                      >
                        <div className="flex flex-col items-center">
                          <span className="font-medium">{time.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {time.time}
                          </span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHorses.map((horse) => (
                    <TableRow key={horse.id}>
                      <TableCell className="font-medium sticky left-0 bg-background z-10">
                        {horse.name}
                      </TableCell>
                      {sortedFeedingTimes.map((time) => {
                        const cellFeedings = getFeedingsForCell(
                          horse.id,
                          time.id,
                        );
                        return (
                          <TableCell
                            key={`${horse.id}_${time.id}`}
                            className="p-1"
                          >
                            <FeedingCellPopover
                              feedings={cellFeedings}
                              horseName={horse.name}
                              feedingTimeName={`${time.name} (${time.time})`}
                              onAddClick={() =>
                                handleAddFeeding(horse.id, horse.name, time.id)
                              }
                              onEditClick={(feeding) =>
                                handleEditFeeding(feeding, horse.id, horse.name)
                              }
                              onDeleteClick={handleDeleteFeeding}
                            >
                              <button
                                className={cn(
                                  "w-full min-h-[60px] p-2 rounded-md border border-dashed transition-colors",
                                  "hover:bg-muted/50 hover:border-primary/50 cursor-pointer",
                                  cellFeedings.length > 0
                                    ? "bg-amber-50/50 border-amber-200"
                                    : "border-muted-foreground/20",
                                )}
                              >
                                {cellFeedings.length > 0 ? (
                                  <div className="space-y-1">
                                    {cellFeedings.slice(0, 2).map((feeding) => (
                                      <div
                                        key={feeding.id}
                                        className="flex items-center gap-1 text-xs"
                                      >
                                        <Wheat className="h-3 w-3 text-amber-600 flex-shrink-0" />
                                        <span className="truncate">
                                          {feeding.feedTypeName}
                                        </span>
                                        <span className="text-muted-foreground">
                                          {feeding.quantity}
                                          {QUANTITY_MEASURE_ABBREVIATIONS[
                                            feeding.quantityMeasure
                                          ] &&
                                            ` ${QUANTITY_MEASURE_ABBREVIATIONS[feeding.quantityMeasure]}`}
                                        </span>
                                      </div>
                                    ))}
                                    {cellFeedings.length > 2 && (
                                      <div className="text-xs text-muted-foreground">
                                        {t("feeding:schedule.moreFeedings", {
                                          count: cellFeedings.length - 2,
                                        })}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    {t("feeding:schedule.noFeedings")}
                                  </span>
                                )}
                              </button>
                            </FeedingCellPopover>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="text-muted-foreground">
              <Filter className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {t("feeding:infoCard.scheduleTitle")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("feeding:infoCard.scheduleDescription")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Horse Feeding Form Dialog */}
      {feedingDialog.data && (
        <HorseFeedingFormDialog
          open={feedingDialog.open}
          onOpenChange={feedingDialog.closeDialog}
          horseFeeding={feedingDialog.data.existingFeeding}
          horseId={feedingDialog.data.horseId}
          horseName={feedingDialog.data.horseName}
          feedTypes={feedTypesData}
          feedingTimes={feedingTimesData}
          onSave={handleSaveFeeding}
          defaultFeedingTimeId={feedingDialog.data.feedingTimeId}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("feeding:deleteDialog.feedingTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("feeding:deleteDialog.feedingDescription", {
                feedTypeName: deletingFeeding?.feedTypeName,
                horseName: deletingFeeding?.horseName,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:buttons.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              {t("common:buttons.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
