import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryClient";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  getPackageDefinitions,
  createPackageDefinition,
  updatePackageDefinition,
  getMemberPackages,
} from "@/services/packageService";
import type {
  PackageDefinition,
  MemberPackage,
  CreatePackageDefinitionData,
  UpdatePackageDefinitionData,
} from "@equiduty/shared";

import { PackageTable } from "@/components/packages/PackageTable";
import {
  PackageFormDialog,
  EMPTY_FORM,
  formStateFromItem,
} from "@/components/packages/PackageFormDialog";
import type { PackageFormState } from "@/components/packages/PackageFormDialog";

// ============================================================================
// Form conversion helpers
// ============================================================================

function formStateToCreateData(
  form: PackageFormState,
): CreatePackageDefinitionData {
  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    chargeableItemId: form.chargeableItemId.trim(),
    totalUnits: parseInt(form.totalUnits, 10),
    price: Math.round(parseFloat(form.priceSEK) * 100),
    validityDays: form.validityDays
      ? parseInt(form.validityDays, 10)
      : undefined,
    expiryPolicy: form.expiryPolicy,
    transferableWithinGroup: form.transferableWithinGroup,
    cancellationPolicy: form.cancellationPolicy,
  };
}

function formStateToUpdateData(
  form: PackageFormState,
): UpdatePackageDefinitionData {
  return formStateToCreateData(form);
}

// ============================================================================
// Page Component
// ============================================================================

export default function PackagesPage() {
  const { t } = useTranslation(["invoices", "common"]);
  const { toast } = useToast();
  const { selectedOrganization } = useOrganization();
  const queryClient = useQueryClient();

  // State
  const [activeTab, setActiveTab] = useState<"definitions" | "purchased">(
    "definitions",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PackageDefinition | null>(
    null,
  );
  const [formState, setFormState] = useState<PackageFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Data - definitions
  const definitionsQuery = useApiQuery<PackageDefinition[]>(
    queryKeys.packageDefinitions.byOrganization(selectedOrganization ?? ""),
    () => getPackageDefinitions(selectedOrganization!),
    { enabled: !!selectedOrganization, staleTime: 5 * 60 * 1000 },
  );

  // Data - purchased packages
  const memberPackagesQuery = useApiQuery<MemberPackage[]>(
    queryKeys.memberPackages.byOrganization(selectedOrganization ?? ""),
    () => getMemberPackages(selectedOrganization!),
    {
      enabled: !!selectedOrganization && activeTab === "purchased",
      staleTime: 5 * 60 * 1000,
    },
  );

  // Filtered definitions
  const filteredDefinitions = useMemo(() => {
    if (!definitionsQuery.data) return [];
    let items = definitionsQuery.data;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          (item.description && item.description.toLowerCase().includes(query)),
      );
    }
    return items;
  }, [definitionsQuery.data, searchQuery]);

  const filteredMemberPackages = useMemo(() => {
    return memberPackagesQuery.data || [];
  }, [memberPackagesQuery.data]);

  // Invalidate cache
  const invalidateDefinitions = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.packageDefinitions.byOrganization(
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

  const handleOpenEdit = useCallback((item: PackageDefinition) => {
    setEditingItem(item);
    setFormState(formStateFromItem(item));
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedOrganization) return;

    if (!formState.name.trim()) {
      toast({
        title: t("invoices:packages.errors.nameRequired"),
        variant: "destructive",
      });
      return;
    }
    if (!formState.chargeableItemId.trim()) {
      toast({
        title: t("invoices:packages.errors.chargeableItemRequired"),
        variant: "destructive",
      });
      return;
    }
    const units = parseInt(formState.totalUnits, 10);
    if (isNaN(units) || units <= 0) {
      toast({
        title: t("invoices:packages.errors.invalidUnits"),
        variant: "destructive",
      });
      return;
    }
    const price = parseFloat(formState.priceSEK);
    if (isNaN(price) || price < 0) {
      toast({
        title: t("invoices:packages.errors.invalidPrice"),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editingItem) {
        await updatePackageDefinition(
          selectedOrganization,
          editingItem.id,
          formStateToUpdateData(formState),
        );
        toast({ title: t("invoices:packages.messages.updated") });
      } else {
        await createPackageDefinition(
          selectedOrganization,
          formStateToCreateData(formState),
        );
        toast({ title: t("invoices:packages.messages.created") });
      }
      setDialogOpen(false);
      await invalidateDefinitions();
    } catch {
      toast({
        title: editingItem
          ? t("invoices:packages.errors.updateFailed")
          : t("invoices:packages.errors.createFailed"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedOrganization,
    formState,
    editingItem,
    toast,
    invalidateDefinitions,
    t,
  ]);

  const handleDeactivate = useCallback(
    async (item: PackageDefinition) => {
      if (!selectedOrganization) return;
      try {
        await updatePackageDefinition(selectedOrganization, item.id, {
          isActive: !item.isActive,
        });
        toast({
          title: item.isActive
            ? t("invoices:packages.messages.deactivated")
            : t("invoices:packages.messages.activated"),
        });
        await invalidateDefinitions();
      } catch {
        toast({
          title: t("common:errors.generic", "Något gick fel"),
          variant: "destructive",
        });
      }
    },
    [selectedOrganization, toast, invalidateDefinitions, t],
  );

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
          <h1 className="text-2xl font-bold">{t("invoices:packages.title")}</h1>
          <p className="text-muted-foreground">
            {t("invoices:packages.description")}
          </p>
        </div>
        {activeTab === "definitions" && (
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t("invoices:packages.newDefinition")}
          </Button>
        )}
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "definitions" ? "default" : "outline"}
          onClick={() => setActiveTab("definitions")}
        >
          {t("invoices:packages.tabs.definitions")}
        </Button>
        <Button
          variant={activeTab === "purchased" ? "default" : "outline"}
          onClick={() => setActiveTab("purchased")}
        >
          {t("invoices:packages.tabs.purchased")}
        </Button>
      </div>

      {/* Table */}
      <PackageTable
        activeTab={activeTab}
        filteredDefinitions={filteredDefinitions}
        definitionsLoading={definitionsQuery.isLoading}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenCreate={handleOpenCreate}
        onOpenEdit={handleOpenEdit}
        onDeactivate={handleDeactivate}
        filteredMemberPackages={filteredMemberPackages}
        memberPackagesLoading={memberPackagesQuery.isLoading}
      />

      {/* Create/Edit Dialog */}
      <PackageFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingItem={editingItem}
        formState={formState}
        onFormStateChange={setFormState}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}
