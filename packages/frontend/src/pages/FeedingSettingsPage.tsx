import { useState, useEffect } from "react";
import { Settings, Plus, Pencil, Trash2, Wheat, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { FeedTypeFormDialog } from "@/components/FeedTypeFormDialog";
import { FeedingTimeFormDialog } from "@/components/FeedingTimeFormDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStables } from "@/hooks/useUserStables";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useCRUD } from "@/hooks/useCRUD";
import { useDialog } from "@/hooks/useDialog";
import type {
  FeedType,
  FeedingTime,
  CreateFeedTypeData,
  CreateFeedingTimeData,
} from "@shared/types";
import {
  getFeedTypesByStable,
  createFeedType,
  updateFeedType,
  deleteFeedType,
} from "@/services/feedTypeService";
import {
  getFeedingTimesByStable,
  createFeedingTime,
  updateFeedingTime,
  deleteFeedingTime,
} from "@/services/feedingTimeService";
import {
  FEED_CATEGORY_LABELS,
  QUANTITY_MEASURE_ABBREVIATIONS,
} from "@/constants/feeding";

export default function FeedingSettingsPage() {
  const { user } = useAuth();
  const [selectedStableId, setSelectedStableId] = useState<string>("");

  // Dialog state using useDialog hook
  const feedTypeDialog = useDialog<FeedType>();
  const feedingTimeDialog = useDialog<FeedingTime>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{
    type: "feedType" | "feedingTime";
    item: FeedType | FeedingTime;
  } | null>(null);

  // Load user's stables
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);

  // Auto-select first stable
  useEffect(() => {
    if (stables.length > 0 && !selectedStableId && stables[0]) {
      setSelectedStableId(stables[0].id);
    }
  }, [stables, selectedStableId]);

  // Load feed types for selected stable
  const feedTypes = useAsyncData<FeedType[]>({
    loadFn: async () => {
      if (!selectedStableId) return [];
      return await getFeedTypesByStable(selectedStableId, false); // Include inactive
    },
  });

  // Load feeding times for selected stable
  const feedingTimes = useAsyncData<FeedingTime[]>({
    loadFn: async () => {
      if (!selectedStableId) return [];
      return await getFeedingTimesByStable(selectedStableId, false); // Include inactive
    },
  });

  // Reload data when stable changes
  useEffect(() => {
    if (selectedStableId) {
      feedTypes.load();
      feedingTimes.load();
    }
  }, [selectedStableId]);

  // Feed Types CRUD operations
  const feedTypeCRUD = useCRUD<FeedType>({
    createFn: async (data) => {
      if (!selectedStableId) throw new Error("No stable selected");
      return await createFeedType(selectedStableId, data as CreateFeedTypeData);
    },
    updateFn: async (id, data) => {
      await updateFeedType(id, data);
    },
    deleteFn: async (id) => {
      await deleteFeedType(id);
    },
    onSuccess: async () => {
      await feedTypes.reload();
    },
    successMessages: {
      create: "Feed type created successfully",
      update: "Feed type updated successfully",
      delete: "Feed type deleted successfully",
    },
  });

  // Feeding Times CRUD operations
  const feedingTimeCRUD = useCRUD<FeedingTime>({
    createFn: async (data) => {
      if (!selectedStableId) throw new Error("No stable selected");
      return await createFeedingTime(
        selectedStableId,
        data as CreateFeedingTimeData,
      );
    },
    updateFn: async (id, data) => {
      await updateFeedingTime(id, data);
    },
    deleteFn: async (id) => {
      await deleteFeedingTime(id);
    },
    onSuccess: async () => {
      await feedingTimes.reload();
    },
    successMessages: {
      create: "Feeding time created successfully",
      update: "Feeding time updated successfully",
      delete: "Feeding time deleted successfully",
    },
  });

  // Feed Type Handlers
  const handleAddFeedType = () => {
    feedTypeDialog.openDialog();
  };

  const handleEditFeedType = (type: FeedType) => {
    feedTypeDialog.openDialog(type);
  };

  const handleDeleteFeedType = (type: FeedType) => {
    setDeletingItem({ type: "feedType", item: type });
    setDeleteDialogOpen(true);
  };

  const handleSaveFeedType = async (data: CreateFeedTypeData) => {
    if (feedTypeDialog.data) {
      await feedTypeCRUD.update(feedTypeDialog.data.id, data);
    } else {
      await feedTypeCRUD.create(data);
    }
    feedTypeDialog.closeDialog();
  };

  // Feeding Time Handlers
  const handleAddFeedingTime = () => {
    feedingTimeDialog.openDialog();
  };

  const handleEditFeedingTime = (time: FeedingTime) => {
    feedingTimeDialog.openDialog(time);
  };

  const handleDeleteFeedingTime = (time: FeedingTime) => {
    setDeletingItem({ type: "feedingTime", item: time });
    setDeleteDialogOpen(true);
  };

  const handleSaveFeedingTime = async (data: CreateFeedingTimeData) => {
    if (feedingTimeDialog.data) {
      await feedingTimeCRUD.update(feedingTimeDialog.data.id, data);
    } else {
      await feedingTimeCRUD.create(data);
    }
    feedingTimeDialog.closeDialog();
  };

  // Delete confirmation
  const confirmDelete = async () => {
    if (!deletingItem) return;

    if (deletingItem.type === "feedType") {
      await feedTypeCRUD.remove(deletingItem.item.id);
    } else {
      await feedingTimeCRUD.remove(deletingItem.item.id);
    }

    setDeleteDialogOpen(false);
    setDeletingItem(null);
  };

  // Sort feeding times by sortOrder
  const sortedFeedingTimes = [...(feedingTimes.data || [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

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
              You need to be a member of a stable to configure feeding settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Feeding Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure feed types and feeding times for your stable
          </p>
        </div>
      </div>

      {/* Feed Types Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wheat className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Feed Types</CardTitle>
                <CardDescription>
                  Manage the types of feed available at your stable
                </CardDescription>
              </div>
            </div>
            <Button onClick={handleAddFeedType} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Feed Type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {feedTypes.loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading feed types...</p>
            </div>
          ) : (feedTypes.data || []).length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No feed types found. Add your first feed type to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Default Amount</TableHead>
                  <TableHead>Warning</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(feedTypes.data || []).map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell>{FEED_CATEGORY_LABELS[type.category]}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {type.brand}
                    </TableCell>
                    <TableCell>
                      {type.defaultQuantity}{" "}
                      {QUANTITY_MEASURE_ABBREVIATIONS[type.quantityMeasure]}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {type.warning ? (
                        <span className="text-amber-600 text-sm truncate block">
                          {type.warning}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {type.isActive ? (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700"
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-gray-50 text-gray-700"
                        >
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditFeedType(type)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteFeedType(type)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Feeding Times Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Feeding Times</CardTitle>
                <CardDescription>
                  Configure the daily feeding schedule time slots
                </CardDescription>
              </div>
            </div>
            <Button onClick={handleAddFeedingTime} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Feeding Time
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {feedingTimes.loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading feeding times...</p>
            </div>
          ) : sortedFeedingTimes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No feeding times found. Default times will be created when you
                first access the schedule.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedFeedingTimes.map((time) => (
                  <TableRow key={time.id}>
                    <TableCell className="font-medium">{time.name}</TableCell>
                    <TableCell>{time.time}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {time.sortOrder}
                    </TableCell>
                    <TableCell>
                      {time.isActive ? (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700"
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-gray-50 text-gray-700"
                        >
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditFeedingTime(time)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteFeedingTime(time)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="text-muted-foreground">
              <Settings className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">About Feeding Settings</p>
              <p className="text-sm text-muted-foreground">
                Feed types define the different feeds available at your stable
                (roughage, concentrate, supplements, medicine). Feeding times
                define the daily schedule slots when horses are fed. If no
                feeding times are configured, default times (morning 07:00,
                afternoon 13:00, evening 20:00) will be created automatically.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feed Type Form Dialog */}
      <FeedTypeFormDialog
        open={feedTypeDialog.open}
        onOpenChange={feedTypeDialog.closeDialog}
        feedType={feedTypeDialog.data || undefined}
        onSave={handleSaveFeedType}
      />

      {/* Feeding Time Form Dialog */}
      <FeedingTimeFormDialog
        open={feedingTimeDialog.open}
        onOpenChange={feedingTimeDialog.closeDialog}
        feedingTime={feedingTimeDialog.data || undefined}
        onSave={handleSaveFeedingTime}
        existingCount={sortedFeedingTimes.length}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete{" "}
              {deletingItem?.type === "feedType" ? "Feed Type" : "Feeding Time"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "
              {deletingItem?.item
                ? "name" in deletingItem.item
                  ? deletingItem.item.name
                  : ""
                : ""}
              "?
              {deletingItem?.type === "feedType"
                ? " If this feed type is in use, it will be marked as inactive instead of deleted."
                : " If this feeding time is in use, it will be marked as inactive instead of deleted."}
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
