import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
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
import { useAsyncData } from "@/hooks/useAsyncData";
import { useCRUD } from "@/hooks/useCRUD";
import { useDialog } from "@/hooks/useDialog";
import type {
  FeedType,
  FeedingTime,
  HorseFeeding,
  CreateHorseFeedingData,
} from "@shared/types";
import type { Horse } from "@/types/roles";
import { getStableHorses } from "@/services/horseService";
import { getFeedTypesByStable } from "@/services/feedTypeService";
import { getFeedingTimesByStable } from "@/services/feedingTimeService";
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
  const { user } = useAuth();
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

  // Auto-select first stable
  useEffect(() => {
    if (stables.length > 0 && !selectedStableId && stables[0]) {
      setSelectedStableId(stables[0].id);
    }
  }, [stables, selectedStableId]);

  // Load horses for selected stable
  const horses = useAsyncData<Horse[]>({
    loadFn: async () => {
      if (!selectedStableId) return [];
      return await getStableHorses(selectedStableId);
    },
  });

  // Load feed types for selected stable
  const feedTypes = useAsyncData<FeedType[]>({
    loadFn: async () => {
      if (!selectedStableId) return [];
      return await getFeedTypesByStable(selectedStableId, true); // Active only
    },
  });

  // Load feeding times for selected stable
  const feedingTimes = useAsyncData<FeedingTime[]>({
    loadFn: async () => {
      if (!selectedStableId) return [];
      return await getFeedingTimesByStable(selectedStableId, true); // Active only
    },
  });

  // Load horse feedings for selected stable and date
  const horseFeedings = useAsyncData<HorseFeeding[]>({
    loadFn: async () => {
      if (!selectedStableId) return [];
      return await getHorseFeedingsByStable(selectedStableId, {
        date: selectedDate,
        activeOnly: true,
      });
    },
  });

  // Reload data when stable or date changes
  useEffect(() => {
    if (selectedStableId) {
      horses.load();
      feedTypes.load();
      feedingTimes.load();
      horseFeedings.load();
    }
  }, [selectedStableId]);

  // Reload feedings when date changes
  useEffect(() => {
    if (selectedStableId) {
      horseFeedings.load();
    }
  }, [selectedDate]);

  // Sort feeding times by sortOrder
  const sortedFeedingTimes = useMemo(() => {
    return [...(feedingTimes.data || [])].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
  }, [feedingTimes.data]);

  // Filter horses by search query
  const filteredHorses = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return horses.data || [];

    return (horses.data || []).filter(
      (horse) =>
        horse.name.toLowerCase().includes(query) ||
        horse.ueln?.toLowerCase().includes(query) ||
        horse.chipNumber?.toLowerCase().includes(query),
    );
  }, [horses.data, searchQuery]);

  // Group feedings by horse and feeding time
  const feedingsByHorseAndTime = useMemo(() => {
    const map = new Map<string, HorseFeeding[]>();

    (horseFeedings.data || []).forEach((feeding) => {
      const key = `${feeding.horseId}_${feeding.feedingTimeId}`;
      const existing = map.get(key) || [];
      map.set(key, [...existing, feeding]);
    });

    return map;
  }, [horseFeedings.data]);

  // Get feedings for a specific horse and feeding time
  const getFeedingsForCell = (
    horseId: string,
    feedingTimeId: string,
  ): HorseFeeding[] => {
    return feedingsByHorseAndTime.get(`${horseId}_${feedingTimeId}`) || [];
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
      await horseFeedings.reload();
    },
    successMessages: {
      create: "Feeding added successfully",
      update: "Feeding updated successfully",
      delete: "Feeding deleted successfully",
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
        <p className="text-muted-foreground">Loading stables...</p>
      </div>
    );
  }

  if (stables.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">No stables found</h3>
            <p className="text-muted-foreground">
              You need to be a member of a stable to view the feeding schedule.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoading =
    horses.loading ||
    feedTypes.loading ||
    feedingTimes.loading ||
    horseFeedings.loading;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Wheat className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Feeding Schedule
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage horse feeding schedules
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
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
                    format(selectedDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by horse name, UELN, or chip number..."
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
                Today
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Grid */}
      <Card>
        <CardHeader>
          <CardTitle>
            Schedule for {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </CardTitle>
          <CardDescription>
            Click on a cell to view or add feedings for that horse and time slot
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading schedule...</p>
            </div>
          ) : sortedFeedingTimes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No feeding times configured. Please set up feeding times in
                Settings first.
              </p>
              <Button
                variant="link"
                className="mt-2"
                onClick={() => (window.location.href = "/feeding/settings")}
              >
                Go to Settings
              </Button>
            </div>
          ) : filteredHorses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No horses found matching your search."
                  : "No horses found in this stable."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px] sticky left-0 bg-background z-10">
                      Horse
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
                                        +{cellFeedings.length - 2} more
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    No feedings
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
              <p className="text-sm font-medium">About the Feeding Schedule</p>
              <p className="text-sm text-muted-foreground">
                This schedule shows all active feeding entries for the selected
                date. Feedings are shown based on their start and end dates. To
                add or modify feed types and feeding time slots, go to the
                Settings page.
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
          feedTypes={feedTypes.data || []}
          feedingTimes={feedingTimes.data || []}
          onSave={handleSaveFeeding}
          defaultFeedingTimeId={feedingDialog.data.feedingTimeId}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feeding</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingFeeding?.feedTypeName}"
              feeding for {deletingFeeding?.horseName}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
