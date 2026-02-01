import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryClient";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  getChargeableItems,
  createChargeableItem,
  updateChargeableItem,
  deleteChargeableItem,
} from "@/services/chargeableItemService";
import type {
  ChargeableItem,
  ChargeableItemCategory,
  CreateChargeableItemData,
  UpdateChargeableItemData,
} from "@equiduty/shared";

import { ChargeableItemTable } from "@/components/chargeableItems/ChargeableItemTable";
import {
  ChargeableItemFormDialog,
  EMPTY_FORM,
  formStateFromItem,
} from "@/components/chargeableItems/ChargeableItemFormDialog";
import type { ChargeableItemFormState } from "@/components/chargeableItems/ChargeableItemFormDialog";

// ============================================================================
// Form conversion helpers
// ============================================================================

function formStateToCreateData(
  form: ChargeableItemFormState,
): CreateChargeableItemData {
  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    unitType: form.unitType,
    defaultUnitPrice: Math.round(parseFloat(form.defaultUnitPriceSEK) * 100),
    vatRate: form.vatRate,
    vatCategory: form.vatCategory.trim(),
    category: form.category,
    accountingCode: form.accountingCode.trim() || undefined,
    costCenter: form.costCenter.trim() || undefined,
  };
}

function formStateToUpdateData(
  form: ChargeableItemFormState,
): UpdateChargeableItemData {
  return formStateToCreateData(form);
}

// ============================================================================
// Page Component
// ============================================================================

export default function ChargeableItemsPage() {
  const { t } = useTranslation(["invoices", "common"]);
  const { toast } = useToast();
  const { selectedOrganization } = useOrganization();
  const queryClient = useQueryClient();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    ChargeableItemCategory | "all"
  >("all");
  const [showInactive, setShowInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChargeableItem | null>(null);
  const [formState, setFormState] =
    useState<ChargeableItemFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingItem, setDeletingItem] = useState<ChargeableItem | null>(null);

  // Data
  const itemsQuery = useApiQuery<ChargeableItem[]>(
    queryKeys.chargeableItems.byOrganization(selectedOrganization ?? ""),
    () => getChargeableItems(selectedOrganization!),
    { enabled: !!selectedOrganization, staleTime: 5 * 60 * 1000 },
  );

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!itemsQuery.data) return [];
    let items = itemsQuery.data;
    if (!showInactive) {
      items = items.filter((item) => item.isActive);
    }
    if (categoryFilter !== "all") {
      items = items.filter((item) => item.category === categoryFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          (item.description && item.description.toLowerCase().includes(query)),
      );
    }
    return items;
  }, [itemsQuery.data, searchQuery, categoryFilter, showInactive]);

  // Invalidate cache
  const invalidateItems = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.chargeableItems.byOrganization(
        selectedOrganization ?? "",
      ),
    });
  }, [queryClient, selectedOrganization]);

  // Handlers
  const handleOpenCreate = useCallback(() => {
    setEditingItem(null);
    setFormState(EMPTY_FORM);
    setDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((item: ChargeableItem) => {
    setEditingItem(item);
    setFormState(formStateFromItem(item));
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedOrganization) return;

    if (!formState.name.trim()) {
      toast({
        title: t("invoices:chargeableItems.errors.nameRequired"),
        variant: "destructive",
      });
      return;
    }
    const price = parseFloat(formState.defaultUnitPriceSEK);
    if (isNaN(price) || price < 0) {
      toast({
        title: t("invoices:chargeableItems.errors.invalidPrice"),
        variant: "destructive",
      });
      return;
    }
    if (!formState.vatCategory.trim()) {
      toast({
        title: t("invoices:chargeableItems.errors.vatCategoryRequired"),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editingItem) {
        await updateChargeableItem(
          selectedOrganization,
          editingItem.id,
          formStateToUpdateData(formState),
        );
        toast({ title: t("invoices:chargeableItems.messages.updated") });
      } else {
        await createChargeableItem(
          selectedOrganization,
          formStateToCreateData(formState),
        );
        toast({ title: t("invoices:chargeableItems.messages.created") });
      }
      setDialogOpen(false);
      await invalidateItems();
    } catch {
      toast({
        title: editingItem
          ? t("invoices:chargeableItems.errors.updateFailed")
          : t("invoices:chargeableItems.errors.createFailed"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [selectedOrganization, formState, editingItem, toast, invalidateItems]);

  const handleToggleActive = useCallback(
    async (item: ChargeableItem) => {
      if (!selectedOrganization) return;
      try {
        await updateChargeableItem(selectedOrganization, item.id, {
          isActive: !item.isActive,
        });
        toast({
          title: item.isActive
            ? t("invoices:chargeableItems.messages.deactivated")
            : t("invoices:chargeableItems.messages.activated"),
        });
        await invalidateItems();
      } catch {
        toast({
          title: t("common:errors.generic", "Något gick fel"),
          variant: "destructive",
        });
      }
    },
    [selectedOrganization, toast, invalidateItems, t],
  );

  const handleRequestDelete = useCallback((item: ChargeableItem) => {
    setDeletingItem(item);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedOrganization || !deletingItem) return;
    try {
      await deleteChargeableItem(selectedOrganization, deletingItem.id);
      toast({ title: t("invoices:chargeableItems.messages.deleted") });
      await invalidateItems();
    } catch {
      toast({
        title: t("common:errors.generic", "Något gick fel"),
        variant: "destructive",
      });
    } finally {
      setDeletingItem(null);
    }
  }, [selectedOrganization, deletingItem, toast, invalidateItems, t]);

  if (!selectedOrganization) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">
              {t("common:labels.selectStable", "Välj en organisation")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {t("invoices:chargeableItems.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("invoices:chargeableItems.description")}
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("invoices:chargeableItems.addItem")}
        </Button>
      </div>

      {/* Table with filters */}
      <ChargeableItemTable
        items={filteredItems}
        isLoading={itemsQuery.isLoading}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        showInactive={showInactive}
        onShowInactiveChange={setShowInactive}
        onOpenCreate={handleOpenCreate}
        onOpenEdit={handleOpenEdit}
        onToggleActive={handleToggleActive}
        onDelete={handleRequestDelete}
      />

      {/* Create/Edit Dialog */}
      <ChargeableItemFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingItem={editingItem}
        formState={formState}
        onFormStateChange={setFormState}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingItem}
        onOpenChange={(open) => {
          if (!open) setDeletingItem(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("common:confirmDelete.title", "Bekräfta borttagning")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "common:confirmDelete.description",
                "Är du säker? Denna åtgärd kan inte ångras.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("common:buttons.cancel", "Avbryt")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              {t("common:buttons.delete", "Ta bort")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
