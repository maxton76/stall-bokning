import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Briefcase,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  MapPin,
  Calendar,
  AlertTriangle,
  Wrench,
  Package,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { authFetch } from "@/lib/authFetch";
import { TackItemForm } from "./TackItemForm";
import type { Horse } from "@/types/roles";
import type { TackItem, TackCategory, TackCondition } from "@shared/types/tack";

interface TackRoomCardProps {
  horse: Horse;
}

const CONDITION_COLORS: Record<TackCondition, string> = {
  new: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  excellent:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  good: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  fair: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  poor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  needs_repair: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const CATEGORY_ICONS: Record<TackCategory, string> = {
  saddle: "🪑",
  bridle: "🐴",
  blanket: "🧥",
  boots: "🥾",
  grooming: "🪮",
  halter: "🪢",
  lunge: "⭕",
  protective: "🛡️",
  rider: "👤",
  other: "📦",
};

export function TackRoomCard({ horse }: TackRoomCardProps) {
  const { t, i18n } = useTranslation(["horses", "common"]);
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TackItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<TackItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Fetch tack items
  const { data: tackItems = [], isLoading } = useQuery<TackItem[]>({
    queryKey: ["horse-tack", horse.id],
    queryFn: async () => {
      const response = await authFetch(`/api/v1/horses/${horse.id}/tack`);
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error("Failed to fetch tack items");
      }
      return response.json();
    },
  });

  // Add/Update tack item mutation
  const saveItemMutation = useMutation({
    mutationFn: async ({
      item,
      id,
    }: {
      item: Partial<TackItem>;
      id?: string;
    }) => {
      const url = id
        ? `/api/v1/horses/${horse.id}/tack/${id}`
        : `/api/v1/horses/${horse.id}/tack`;
      const method = id ? "PUT" : "POST";

      const response = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save tack item");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["horse-tack", horse.id] });
      setIsAddDialogOpen(false);
      setEditingItem(null);
    },
  });

  // Delete tack item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await authFetch(
        `/api/v1/horses/${horse.id}/tack/${id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete tack item");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["horse-tack", horse.id] });
      setDeletingItem(null);
    },
  });

  const getCategoryLabel = (category: TackCategory): string => {
    const labels: Record<TackCategory, { en: string; sv: string }> = {
      saddle: { en: "Saddle", sv: "Sadel" },
      bridle: { en: "Bridle", sv: "Huvudlag" },
      blanket: { en: "Blanket/Rug", sv: "Täcke" },
      boots: { en: "Boots", sv: "Benskydd" },
      grooming: { en: "Grooming", sv: "Ryktning" },
      halter: { en: "Halter", sv: "Grimma" },
      lunge: { en: "Lunging", sv: "Longering" },
      protective: { en: "Protective Gear", sv: "Skyddsutrustning" },
      rider: { en: "Rider Equipment", sv: "Ryttarutrustning" },
      other: { en: "Other", sv: "Övrigt" },
    };
    return labels[category]?.[i18n.language as "en" | "sv"] || category;
  };

  const getConditionLabel = (condition: TackCondition): string => {
    const labels: Record<TackCondition, { en: string; sv: string }> = {
      new: { en: "New", sv: "Ny" },
      excellent: { en: "Excellent", sv: "Utmärkt" },
      good: { en: "Good", sv: "Bra" },
      fair: { en: "Fair", sv: "Okej" },
      poor: { en: "Poor", sv: "Dålig" },
      needs_repair: { en: "Needs Repair", sv: "Behöver reparation" },
    };
    return labels[condition]?.[i18n.language as "en" | "sv"] || condition;
  };

  const handleSave = (data: Partial<TackItem>) => {
    saveItemMutation.mutate({
      item: data,
      id: editingItem?.id,
    });
  };

  const handleDelete = () => {
    if (deletingItem) {
      deleteItemMutation.mutate(deletingItem.id);
    }
  };

  // Filter items
  const filteredItems =
    categoryFilter === "all"
      ? tackItems
      : tackItems.filter((item) => item.category === categoryFilter);

  // Get unique categories for filter
  const categories = [...new Set(tackItems.map((item) => item.category))];

  // Calculate stats
  const needsMaintenanceCount = tackItems.filter((item) => {
    if (!item.nextMaintenanceDate) return false;
    const maintenanceDate = item.nextMaintenanceDate as unknown as {
      seconds: number;
    };
    return maintenanceDate.seconds * 1000 < Date.now();
  }).length;

  const poorConditionCount = tackItems.filter(
    (item) => item.condition === "poor" || item.condition === "needs_repair",
  ).length;

  const totalValue = tackItems.reduce(
    (sum, item) => sum + (item.purchasePrice || 0),
    0,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{t("horses:tack.title", "Equipment")}</CardTitle>
          </div>
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t("horses:tack.addItem", "Add Item")}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats & Warnings */}
        {tackItems.length > 0 && (
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline" className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {tackItems.length} {t("horses:tack.items", "items")}
            </Badge>
            {totalValue > 0 && (
              <Badge variant="outline">{totalValue.toLocaleString()} SEK</Badge>
            )}
            {needsMaintenanceCount > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Wrench className="h-3 w-3" />
                {needsMaintenanceCount}{" "}
                {t("horses:tack.needsMaintenance", "needs maintenance")}
              </Badge>
            )}
            {poorConditionCount > 0 && (
              <Badge
                variant="secondary"
                className="flex items-center gap-1 bg-orange-100 text-orange-800"
              >
                <AlertTriangle className="h-3 w-3" />
                {poorConditionCount}{" "}
                {t("horses:tack.poorCondition", "poor condition")}
              </Badge>
            )}
          </div>
        )}

        {/* Category Filter */}
        {categories.length > 1 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue
                placeholder={t(
                  "horses:tack.filterCategory",
                  "Filter by category",
                )}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("horses:tack.allCategories", "All Categories")}
              </SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {CATEGORY_ICONS[cat]} {getCategoryLabel(cat)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Items List */}
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            {t("common:loading", "Loading...")}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <Briefcase className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {t("horses:tack.noItems", "No equipment yet")}
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              {t(
                "horses:tack.addItemHint",
                "Track saddles, bridles, blankets, and other equipment",
              )}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t("horses:tack.addFirst", "Add First Item")}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Category Icon */}
                  <div className="text-2xl">
                    {CATEGORY_ICONS[item.category]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{item.name}</span>
                      {item.brand && (
                        <span className="text-sm text-muted-foreground">
                          ({item.brand})
                        </span>
                      )}
                      <Badge className={CONDITION_COLORS[item.condition]}>
                        {getConditionLabel(item.condition)}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {getCategoryLabel(item.category)}
                      </span>
                      {item.storageLocation && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {item.storageLocation}
                        </span>
                      )}
                      {item.purchasePrice && (
                        <span>{item.purchasePrice.toLocaleString()} SEK</span>
                      )}
                      {item.nextMaintenanceDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(
                            (
                              item.nextMaintenanceDate as unknown as {
                                seconds: number;
                              }
                            ).seconds * 1000,
                          ).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingItem(item)}>
                      <Edit className="h-4 w-4 mr-2" />
                      {t("common:buttons.edit", "Edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeletingItem(item)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t("common:buttons.delete", "Delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("horses:tack.addItem", "Add Equipment")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "horses:tack.addItemDescription",
                "Add a new equipment item for this horse",
              )}
            </DialogDescription>
          </DialogHeader>
          <TackItemForm
            onSubmit={handleSave}
            onCancel={() => setIsAddDialogOpen(false)}
            isSubmitting={saveItemMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("horses:tack.editItem", "Edit Equipment")}
            </DialogTitle>
            <DialogDescription>
              {t("horses:tack.editItemDescription", "Update equipment details")}
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <TackItemForm
              defaultValues={editingItem}
              onSubmit={handleSave}
              onCancel={() => setEditingItem(null)}
              isSubmitting={saveItemMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingItem}
        onOpenChange={(open) => !open && setDeletingItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("horses:tack.deleteTitle", "Delete Equipment")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "horses:tack.deleteConfirm",
                "Are you sure you want to delete {{name}}? This action cannot be undone.",
                { name: deletingItem?.name },
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("common:buttons.cancel", "Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteItemMutation.isPending
                ? t("common:loading", "Loading...")
                : t("common:buttons.delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
