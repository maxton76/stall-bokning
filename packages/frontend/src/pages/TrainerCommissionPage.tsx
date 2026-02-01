import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryClient";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  getCommissionConfigs,
  createCommissionConfig,
  updateCommissionConfig,
  getCommissions,
  calculateCommissions,
  approveCommission,
  rejectCommission,
  exportCommissionsCSV,
} from "@/services/trainerCommissionService";
import type {
  TrainerCommissionConfig,
  TrainerCommission,
} from "@equiduty/shared";

import {
  CommissionConfigPanel,
  EMPTY_CONFIG_FORM,
  EMPTY_RULE,
  configToFormState,
} from "@/components/trainerCommission/CommissionConfigPanel";
import type {
  ConfigFormState,
  RuleFormState,
} from "@/components/trainerCommission/CommissionConfigPanel";
import { CommissionListTable } from "@/components/trainerCommission/CommissionListTable";
import { CommissionApprovalDialog } from "@/components/trainerCommission/CommissionApprovalDialog";
import { CommissionCalculateDialog } from "@/components/trainerCommission/CommissionCalculateDialog";

export default function TrainerCommissionPage() {
  const { t } = useTranslation(["trainerCommission", "common"]);
  const { toast } = useToast();
  const { selectedOrganization } = useOrganization();
  const queryClient = useQueryClient();

  // Tab state
  const [activeTab, setActiveTab] = useState("configuration");

  // Config state
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] =
    useState<TrainerCommissionConfig | null>(null);
  const [configForm, setConfigForm] =
    useState<ConfigFormState>(EMPTY_CONFIG_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Commission filters
  const [commissionTrainerFilter, setCommissionTrainerFilter] = useState("");
  const [commissionStatusFilter, setCommissionStatusFilter] = useState("");
  const [periodStartFilter, setPeriodStartFilter] = useState("");
  const [periodEndFilter, setPeriodEndFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Calculate dialog
  const [calcDialogOpen, setCalcDialogOpen] = useState(false);
  const [calcPeriodStart, setCalcPeriodStart] = useState("");
  const [calcPeriodEnd, setCalcPeriodEnd] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);

  // Reject dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingCommissionId, setRejectingCommissionId] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  // Data fetching
  const configsQuery = useApiQuery<TrainerCommissionConfig[]>(
    queryKeys.commissionConfigs.byOrganization(selectedOrganization ?? ""),
    () => getCommissionConfigs(selectedOrganization!),
    { enabled: !!selectedOrganization },
  );

  const commissionsFilters = useMemo(
    () => ({
      trainerId: commissionTrainerFilter || undefined,
      status: commissionStatusFilter || undefined,
    }),
    [commissionTrainerFilter, commissionStatusFilter],
  );

  const commissionsQuery = useApiQuery<{
    items: TrainerCommission[];
    pagination: { limit: number; offset: number; count: number };
  }>(
    queryKeys.commissions.byOrganization(
      selectedOrganization ?? "",
      commissionsFilters,
    ),
    () =>
      getCommissions(selectedOrganization!, {
        trainerId: commissionTrainerFilter || undefined,
        status: commissionStatusFilter || undefined,
        periodStart: periodStartFilter || undefined,
        periodEnd: periodEndFilter || undefined,
      }),
    { enabled: !!selectedOrganization },
  );

  const configs = configsQuery.data || [];
  const commissions = commissionsQuery.data?.items || [];

  // Filtered configs
  const filteredConfigs = useMemo(() => {
    if (!searchQuery) return configs;
    const q = searchQuery.toLowerCase();
    return configs.filter(
      (c) =>
        c.trainerName.toLowerCase().includes(q) ||
        c.trainerId.toLowerCase().includes(q),
    );
  }, [configs, searchQuery]);

  // Invalidation helpers
  const invalidateConfigs = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.commissionConfigs.byOrganization(
        selectedOrganization ?? "",
      ),
    });
  }, [queryClient, selectedOrganization]);

  const invalidateCommissions = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.commissions.byOrganization(
        selectedOrganization ?? "",
      ),
    });
  }, [queryClient, selectedOrganization]);

  // Config handlers
  const handleOpenCreateConfig = useCallback(() => {
    setEditingConfig(null);
    setConfigForm(EMPTY_CONFIG_FORM);
    setConfigDialogOpen(true);
  }, []);

  const handleOpenEditConfig = useCallback(
    (config: TrainerCommissionConfig) => {
      setEditingConfig(config);
      setConfigForm(configToFormState(config));
      setConfigDialogOpen(true);
    },
    [],
  );

  const handleAddRule = useCallback(() => {
    setConfigForm((prev) => ({
      ...prev,
      rules: [...prev.rules, { ...EMPTY_RULE }],
    }));
  }, []);

  const handleRemoveRule = useCallback((index: number) => {
    setConfigForm((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }));
  }, []);

  const handleUpdateRule = useCallback(
    (index: number, field: keyof RuleFormState, value: string) => {
      setConfigForm((prev) => ({
        ...prev,
        rules: prev.rules.map((r, i) =>
          i === index ? { ...r, [field]: value } : r,
        ),
      }));
    },
    [],
  );

  const handleSaveConfig = useCallback(async () => {
    if (!selectedOrganization) return;

    if (!configForm.trainerId.trim() || !configForm.trainerName.trim()) {
      toast({
        title: t("common:errors.required", "Required fields missing"),
        variant: "destructive",
      });
      return;
    }

    const defaultRate = parseFloat(configForm.defaultRate);
    if (isNaN(defaultRate) || defaultRate < 0) {
      toast({
        title: t("common:errors.invalidValue", "Invalid value"),
        variant: "destructive",
      });
      return;
    }

    const rules = configForm.rules
      .filter((r) => r.lessonType.trim())
      .map((r) => ({
        lessonType: r.lessonType.trim(),
        rate: parseFloat(r.rate) || 0,
        rateType: r.rateType,
        ...(r.minAmount ? { minAmount: parseInt(r.minAmount, 10) } : {}),
        ...(r.maxAmount ? { maxAmount: parseInt(r.maxAmount, 10) } : {}),
      }));

    setIsSaving(true);
    try {
      if (editingConfig) {
        await updateCommissionConfig(selectedOrganization, editingConfig.id, {
          trainerName: configForm.trainerName.trim(),
          defaultRate,
          defaultRateType: configForm.defaultRateType,
          isActive: configForm.isActive,
          rules,
        });
        toast({ title: t("trainerCommission:toast.configUpdated") });
      } else {
        await createCommissionConfig(selectedOrganization, {
          trainerId: configForm.trainerId.trim(),
          trainerName: configForm.trainerName.trim(),
          defaultRate,
          defaultRateType: configForm.defaultRateType,
          isActive: configForm.isActive,
          rules,
        });
        toast({ title: t("trainerCommission:toast.configCreated") });
      }
      setConfigDialogOpen(false);
      await invalidateConfigs();
    } catch {
      toast({
        title: t("trainerCommission:toast.error"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedOrganization,
    configForm,
    editingConfig,
    toast,
    invalidateConfigs,
    t,
  ]);

  // Commission handlers
  const handleCalculate = useCallback(async () => {
    if (!selectedOrganization || !calcPeriodStart || !calcPeriodEnd) return;

    setIsCalculating(true);
    try {
      const results = await calculateCommissions(selectedOrganization, {
        periodStart: calcPeriodStart,
        periodEnd: calcPeriodEnd,
      });
      toast({
        title: `${t("trainerCommission:toast.calculated")} (${results.length})`,
      });
      setCalcDialogOpen(false);
      setCalcPeriodStart("");
      setCalcPeriodEnd("");
      await invalidateCommissions();
    } catch {
      toast({
        title: t("trainerCommission:toast.error"),
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  }, [
    selectedOrganization,
    calcPeriodStart,
    calcPeriodEnd,
    toast,
    invalidateCommissions,
    t,
  ]);

  const handleApprove = useCallback(
    async (commissionId: string) => {
      if (!selectedOrganization) return;
      try {
        await approveCommission(selectedOrganization, commissionId);
        toast({ title: t("trainerCommission:toast.approved") });
        await invalidateCommissions();
      } catch {
        toast({
          title: t("trainerCommission:toast.error"),
          variant: "destructive",
        });
      }
    },
    [selectedOrganization, toast, invalidateCommissions, t],
  );

  const handleOpenReject = useCallback((commissionId: string) => {
    setRejectingCommissionId(commissionId);
    setRejectReason("");
    setRejectDialogOpen(true);
  }, []);

  const handleReject = useCallback(async () => {
    if (!selectedOrganization || !rejectingCommissionId || !rejectReason.trim())
      return;

    setIsRejecting(true);
    try {
      await rejectCommission(
        selectedOrganization,
        rejectingCommissionId,
        rejectReason.trim(),
      );
      toast({ title: t("trainerCommission:toast.rejected") });
      setRejectDialogOpen(false);
      await invalidateCommissions();
    } catch {
      toast({
        title: t("trainerCommission:toast.error"),
        variant: "destructive",
      });
    } finally {
      setIsRejecting(false);
    }
  }, [
    selectedOrganization,
    rejectingCommissionId,
    rejectReason,
    toast,
    invalidateCommissions,
    t,
  ]);

  const handleExport = useCallback(async () => {
    if (!selectedOrganization) return;
    try {
      const blob = await exportCommissionsCSV(selectedOrganization, {
        periodStart: periodStartFilter || undefined,
        periodEnd: periodEndFilter || undefined,
        trainerId: commissionTrainerFilter || undefined,
        status: commissionStatusFilter || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "commissions-export.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: t("trainerCommission:toast.exported") });
    } catch {
      toast({
        title: t("trainerCommission:toast.error"),
        variant: "destructive",
      });
    }
  }, [
    selectedOrganization,
    periodStartFilter,
    periodEndFilter,
    commissionTrainerFilter,
    commissionStatusFilter,
    toast,
    t,
  ]);

  // Render guards
  if (!selectedOrganization) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">
              {t("common:labels.selectStable", "Select an organization")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("trainerCommission:title")}</h1>
        <p className="text-muted-foreground">
          {t("trainerCommission:description")}
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="configuration">
            {t("trainerCommission:tabs.configuration")}
          </TabsTrigger>
          <TabsTrigger value="commissions">
            {t("trainerCommission:tabs.commissions")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-4">
          <CommissionConfigPanel
            configs={configs}
            filteredConfigs={filteredConfigs}
            isLoading={configsQuery.isLoading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onOpenCreate={handleOpenCreateConfig}
            onOpenEdit={handleOpenEditConfig}
            dialogOpen={configDialogOpen}
            onDialogOpenChange={setConfigDialogOpen}
            editingConfig={editingConfig}
            configForm={configForm}
            onConfigFormChange={setConfigForm}
            onAddRule={handleAddRule}
            onRemoveRule={handleRemoveRule}
            onUpdateRule={handleUpdateRule}
            onSave={handleSaveConfig}
            isSaving={isSaving}
          />
        </TabsContent>

        <TabsContent value="commissions" className="space-y-4">
          <CommissionListTable
            commissions={commissions}
            isLoading={commissionsQuery.isLoading}
            periodStartFilter={periodStartFilter}
            onPeriodStartChange={setPeriodStartFilter}
            periodEndFilter={periodEndFilter}
            onPeriodEndChange={setPeriodEndFilter}
            commissionStatusFilter={commissionStatusFilter}
            onStatusFilterChange={setCommissionStatusFilter}
            onOpenCalculate={() => setCalcDialogOpen(true)}
            onExport={handleExport}
            onApprove={handleApprove}
            onOpenReject={handleOpenReject}
          />
        </TabsContent>
      </Tabs>

      {/* Calculate Dialog */}
      <CommissionCalculateDialog
        open={calcDialogOpen}
        onOpenChange={setCalcDialogOpen}
        periodStart={calcPeriodStart}
        onPeriodStartChange={setCalcPeriodStart}
        periodEnd={calcPeriodEnd}
        onPeriodEndChange={setCalcPeriodEnd}
        onCalculate={handleCalculate}
        isCalculating={isCalculating}
      />

      {/* Reject Dialog */}
      <CommissionApprovalDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        rejectReason={rejectReason}
        onRejectReasonChange={setRejectReason}
        onReject={handleReject}
        isRejecting={isRejecting}
      />
    </div>
  );
}
