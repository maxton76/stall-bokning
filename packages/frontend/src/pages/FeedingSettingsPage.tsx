import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Settings,
  Plus,
  Pencil,
  Trash2,
  Wheat,
  Clock,
  RotateCcw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export default function FeedingSettingsPage() {
  const { t } = useTranslation(["feeding", "common"]);
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
      create: t("feeding:feedTypes.messages.createSuccess"),
      update: t("feeding:feedTypes.messages.updateSuccess"),
      delete: t("feeding:feedTypes.messages.deleteSuccess"),
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
      create: t("feeding:feedingTimes.messages.createSuccess"),
      update: t("feeding:feedingTimes.messages.updateSuccess"),
      delete: t("feeding:feedingTimes.messages.deleteSuccess"),
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

  // Reactivate handlers
  const handleReactivateFeedType = async (type: FeedType) => {
    await updateFeedType(type.id, { isActive: true });
    await feedTypes.reload();
  };

  const handleReactivateFeedingTime = async (time: FeedingTime) => {
    await updateFeedingTime(time.id, { isActive: true });
    await feedingTimes.reload();
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

  // Sort feeding times by time (HH:mm format)
  const sortedFeedingTimes = [...(feedingTimes.data || [])].sort((a, b) =>
    a.time.localeCompare(b.time),
  );

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
              {t("feeding:loadingStates.noStablesForSettings")}
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
            {t("feeding:page.settingsTitle")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("feeding:page.settingsDescription")}
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
                <CardTitle>{t("feeding:feedTypes.title")}</CardTitle>
                <CardDescription>
                  {t("feeding:feedTypes.description")}
                </CardDescription>
              </div>
            </div>
            <Button onClick={handleAddFeedType} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t("feeding:actions.addFeedType")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {feedTypes.loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {t("feeding:feedTypes.loading")}
              </p>
            </div>
          ) : (feedTypes.data || []).length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {t("feeding:feedTypes.noFeedTypes")}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {t("feeding:feedTypes.tableHeaders.name")}
                  </TableHead>
                  <TableHead>
                    {t("feeding:feedTypes.tableHeaders.category")}
                  </TableHead>
                  <TableHead>
                    {t("feeding:feedTypes.tableHeaders.brand")}
                  </TableHead>
                  <TableHead>
                    {t("feeding:feedTypes.tableHeaders.defaultAmount")}
                  </TableHead>
                  <TableHead>
                    {t("feeding:feedTypes.tableHeaders.warning")}
                  </TableHead>
                  <TableHead className="w-24 text-right">
                    {t("feeding:feedTypes.tableHeaders.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(feedTypes.data || []).map((type) => (
                  <TableRow
                    key={type.id}
                    className={!type.isActive ? "opacity-60" : ""}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {type.name}
                        {!type.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            {t("feeding:feedTypes.inactive")}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {t(`feeding:categories.${type.category}`)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {type.brand}
                    </TableCell>
                    <TableCell>
                      {type.defaultQuantity}{" "}
                      {t(`feeding:abbreviations.${type.quantityMeasure}`)}
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
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {type.isActive ? (
                          <>
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
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReactivateFeedType(type)}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            {t("feeding:feedTypes.reactivate")}
                          </Button>
                        )}
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
                <CardTitle>{t("feeding:feedingTimes.title")}</CardTitle>
                <CardDescription>
                  {t("feeding:feedingTimes.description")}
                </CardDescription>
              </div>
            </div>
            <Button onClick={handleAddFeedingTime} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t("feeding:actions.addFeedingTime")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {feedingTimes.loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {t("feeding:feedingTimes.loading")}
              </p>
            </div>
          ) : sortedFeedingTimes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {t("feeding:feedingTimes.noFeedingTimes")}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {t("feeding:feedingTimes.tableHeaders.name")}
                  </TableHead>
                  <TableHead>
                    {t("feeding:feedingTimes.tableHeaders.time")}
                  </TableHead>
                  <TableHead className="w-24 text-right">
                    {t("feeding:feedingTimes.tableHeaders.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedFeedingTimes.map((time) => (
                  <TableRow
                    key={time.id}
                    className={!time.isActive ? "opacity-60" : ""}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {time.name}
                        {!time.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            {t("feeding:feedingTimes.inactive")}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{time.time}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {time.isActive ? (
                          <>
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
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReactivateFeedingTime(time)}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            {t("feeding:feedingTimes.reactivate")}
                          </Button>
                        )}
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
              <p className="text-sm font-medium">
                {t("feeding:infoCard.settingsTitle")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("feeding:infoCard.settingsDescription")}
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
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deletingItem?.type === "feedType"
                ? t("feeding:deleteDialog.feedTypeTitle")
                : t("feeding:deleteDialog.feedingTimeTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deletingItem?.type === "feedType"
                ? t("feeding:deleteDialog.feedTypeDescription", {
                    name:
                      deletingItem?.item && "name" in deletingItem.item
                        ? deletingItem.item.name
                        : "",
                  })
                : t("feeding:deleteDialog.feedingTimeDescription", {
                    name:
                      deletingItem?.item && "name" in deletingItem.item
                        ? deletingItem.item.name
                        : "",
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
