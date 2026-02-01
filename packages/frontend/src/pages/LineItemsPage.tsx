import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Plus, FileText } from "lucide-react";
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
import { toDate } from "@/lib/utils";
import {
  getLineItems,
  createLineItem,
  updateLineItem,
  deleteLineItem,
  generateInvoicesFromLineItems,
} from "@/services/lineItemService";
import type {
  LineItem,
  LineItemSourceType,
  LineItemStatus,
  CreateLineItemData,
  UpdateLineItemData,
  SwedishVatRate,
} from "@equiduty/shared";

import { LineItemFilters } from "@/components/lineItems/LineItemFilters";
import { LineItemTable } from "@/components/lineItems/LineItemTable";
import {
  LineItemFormDialog,
  EMPTY_FORM,
  formStateFromItem,
} from "@/components/lineItems/LineItemFormDialog";
import type { LineItemFormState } from "@/components/lineItems/LineItemFormDialog";

// ============================================================================
// Form conversion helpers
// ============================================================================

function generateIdempotencyKey(form: LineItemFormState): string {
  return `${form.memberId}-${form.date}-${form.description}-${form.sourceType}-${Date.now()}`;
}

function formStateToCreateData(form: LineItemFormState): CreateLineItemData {
  return {
    memberId: form.memberId.trim(),
    billingContactId: form.billingContactId.trim(),
    date: form.date,
    description: form.description.trim(),
    quantity: parseFloat(form.quantity),
    unitPrice: Math.round(parseFloat(form.unitPriceSEK) * 100),
    vatRate: form.vatRate,
    sourceType: form.sourceType,
    idempotencyKey: generateIdempotencyKey(form),
    horseId: form.horseId.trim() || undefined,
  };
}

function formStateToUpdateData(form: LineItemFormState): UpdateLineItemData {
  return {
    description: form.description.trim(),
    quantity: parseFloat(form.quantity),
    unitPrice: Math.round(parseFloat(form.unitPriceSEK) * 100),
    vatRate: form.vatRate,
    horseId: form.horseId.trim() || undefined,
  };
}

type StatusFilter = LineItemStatus | "all";

// ============================================================================
// Page Component
// ============================================================================

export default function LineItemsPage() {
  const { t } = useTranslation(["invoices", "common"]);
  const { toast } = useToast();
  const { selectedOrganization } = useOrganization();
  const queryClient = useQueryClient();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceTypeFilter, setSourceTypeFilter] = useState<
    LineItemSourceType | "all"
  >("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LineItem | null>(null);
  const [formState, setFormState] = useState<LineItemFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deletingItem, setDeletingItem] = useState<LineItem | null>(null);

  // Data
  const itemsQuery = useApiQuery<LineItem[]>(
    queryKeys.lineItems.byOrganization(selectedOrganization ?? ""),
    () => getLineItems(selectedOrganization!),
    {
      enabled: !!selectedOrganization,
      staleTime: 5 * 60 * 1000,
    },
  );
  const itemsData = itemsQuery.data;
  const itemsLoading = itemsQuery.isLoading;

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!itemsData) return [];

    let items = itemsData;

    if (statusFilter !== "all") {
      items = items.filter((item) => item.status === statusFilter);
    }

    if (sourceTypeFilter !== "all") {
      items = items.filter((item) => item.sourceType === sourceTypeFilter);
    }

    if (dateFrom) {
      items = items.filter((item) => {
        const itemDate = toDate(item.date);
        return itemDate >= new Date(dateFrom);
      });
    }
    if (dateTo) {
      items = items.filter((item) => {
        const itemDate = toDate(item.date);
        return itemDate <= new Date(dateTo + "T23:59:59");
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.description.toLowerCase().includes(query) ||
          item.memberId.toLowerCase().includes(query),
      );
    }

    return items;
  }, [
    itemsData,
    searchQuery,
    sourceTypeFilter,
    statusFilter,
    dateFrom,
    dateTo,
  ]);

  // Invalidate cache
  const invalidateItems = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.lineItems.byOrganization(selectedOrganization ?? ""),
    });
  }, [queryClient, selectedOrganization]);

  // Open create dialog
  const handleOpenCreate = useCallback(() => {
    setEditingItem(null);
    setFormState(EMPTY_FORM);
    setDialogOpen(true);
  }, []);

  // Open edit dialog
  const handleOpenEdit = useCallback((item: LineItem) => {
    setEditingItem(item);
    setFormState(formStateFromItem(item));
    setDialogOpen(true);
  }, []);

  // Save (create or update)
  const handleSave = useCallback(async () => {
    if (!selectedOrganization) return;

    if (!formState.memberId.trim()) {
      toast({
        title: t("invoices:lineItems.errors.memberIdRequired"),
        variant: "destructive",
      });
      return;
    }
    if (!formState.billingContactId.trim()) {
      toast({
        title: t("invoices:lineItems.errors.billingContactRequired"),
        variant: "destructive",
      });
      return;
    }
    if (!formState.description.trim()) {
      toast({
        title: t("invoices:lineItems.errors.descriptionRequired"),
        variant: "destructive",
      });
      return;
    }
    const qty = parseFloat(formState.quantity);
    if (isNaN(qty) || qty <= 0) {
      toast({
        title: t("invoices:lineItems.errors.invalidQuantity"),
        variant: "destructive",
      });
      return;
    }
    const price = parseFloat(formState.unitPriceSEK);
    if (isNaN(price) || price < 0) {
      toast({
        title: t("invoices:lineItems.errors.invalidPrice"),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editingItem) {
        await updateLineItem(
          selectedOrganization,
          editingItem.id,
          formStateToUpdateData(formState),
        );
        toast({ title: t("invoices:lineItems.messages.updated") });
      } else {
        await createLineItem(
          selectedOrganization,
          formStateToCreateData(formState),
        );
        toast({ title: t("invoices:lineItems.messages.created") });
      }
      setDialogOpen(false);
      await invalidateItems();
    } catch {
      toast({
        title: editingItem
          ? t("invoices:lineItems.errors.updateFailed")
          : t("invoices:lineItems.errors.createFailed"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [selectedOrganization, formState, editingItem, toast, invalidateItems, t]);

  // Delete with confirmation
  const handleRequestDelete = useCallback((item: LineItem) => {
    setDeletingItem(item);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedOrganization || !deletingItem) return;
    try {
      await deleteLineItem(selectedOrganization, deletingItem.id);
      toast({ title: t("invoices:lineItems.messages.deleted") });
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

  // Generate invoices
  const handleGenerateInvoices = useCallback(async () => {
    if (!selectedOrganization) return;

    setIsGenerating(true);
    try {
      const result = await generateInvoicesFromLineItems(selectedOrganization, {
        from: dateFrom || undefined,
        to: dateTo || undefined,
      });
      toast({
        title: t("invoices:lineItems.messages.invoicesGenerated"),
        description: t(
          "invoices:lineItems.messages.invoicesGeneratedDescription",
          {
            invoiceCount: result.invoicesCreated,
            lineItemCount: result.lineItemsProcessed,
          },
        ),
      });
      await invalidateItems();
    } catch {
      toast({
        title: t("invoices:lineItems.errors.generateFailed"),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [selectedOrganization, dateFrom, dateTo, toast, invalidateItems, t]);

  // ============================================================================
  // Render
  // ============================================================================

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
            {t("invoices:lineItems.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("invoices:lineItems.description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t("invoices:lineItems.createItem")}
          </Button>
          <Button
            variant="secondary"
            onClick={handleGenerateInvoices}
            disabled={isGenerating}
          >
            <FileText className="mr-2 h-4 w-4" />
            {isGenerating
              ? t("invoices:lineItems.generating")
              : t("invoices:lineItems.generateInvoices")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <LineItemFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sourceTypeFilter={sourceTypeFilter}
        onSourceTypeFilterChange={setSourceTypeFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
      />

      {/* Table */}
      <LineItemTable
        items={filteredItems}
        isLoading={itemsLoading}
        searchQuery={searchQuery}
        onOpenCreate={handleOpenCreate}
        onOpenEdit={handleOpenEdit}
        onDelete={handleRequestDelete}
      />

      {/* Create/Edit Dialog */}
      <LineItemFormDialog
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
