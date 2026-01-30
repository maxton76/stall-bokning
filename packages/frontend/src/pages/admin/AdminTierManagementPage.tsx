import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Save,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { PageHeader } from "@/components/PageHeader";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { SubscriptionLimitsEditor } from "@/components/subscription/SubscriptionLimitsEditor";
import { SubscriptionModulesEditor } from "@/components/subscription/SubscriptionModulesEditor";
import { SubscriptionAddonsEditor } from "@/components/subscription/SubscriptionAddonsEditor";
import { CreateTierDialog } from "@/components/subscription/CreateTierDialog";
import type {
  TierDefinition,
  SubscriptionLimits,
  ModuleFlags,
  SubscriptionAddons,
  StripeProductMapping,
} from "@equiduty/shared";
import { SUBSCRIPTION_TIERS } from "@equiduty/shared";
import {
  getTierDefinitions,
  updateTierDefinition,
  resetTierDefaults,
  getStripeProducts,
  updateStripeProduct,
  createTier,
  deleteTier,
} from "@/services/adminService";

// ---------- Types ----------

interface TierFormData {
  name: string;
  description: string;
  price: number;
  limits: SubscriptionLimits;
  modules: ModuleFlags;
  addons: SubscriptionAddons;
  enabled: boolean;
  isBillable: boolean;
  sortOrder: number;
  visibility: "public" | "hidden";
  // Stripe fields
  stripeProductId: string;
  monthPriceId: string;
  yearPriceId: string;
}

// ---------- Helpers ----------

function buildFormData(
  tier: TierDefinition,
  stripe?: StripeProductMapping,
): TierFormData {
  return {
    name: tier.name,
    description: tier.description,
    price: tier.price,
    limits: { ...tier.limits },
    modules: { ...tier.modules },
    addons: { ...tier.addons },
    enabled: tier.enabled ?? true,
    isBillable: tier.isBillable ?? tier.price > 0,
    sortOrder: tier.sortOrder ?? 99,
    visibility: tier.visibility ?? "public",
    stripeProductId: stripe?.stripeProductId ?? "",
    monthPriceId: stripe?.prices?.month ?? "",
    yearPriceId: stripe?.prices?.year ?? "",
  };
}

function isStripeConfigured(form: TierFormData): boolean {
  return !!(form.stripeProductId && form.monthPriceId && form.yearPriceId);
}

// ---------- Loading Skeleton ----------

function TierLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-[600px] w-full" />
    </div>
  );
}

// ---------- Main Content ----------

function TierManagementContent({
  initialTiers,
  initialStripeProducts,
  onRefresh,
}: {
  initialTiers: TierDefinition[];
  initialStripeProducts: StripeProductMapping[];
  onRefresh: () => void;
}) {
  const { t } = useTranslation(["admin", "common"]);

  const tierKeys = initialTiers.map((t) => t.tier);
  const [selectedTier, setSelectedTier] = useState<string>(
    tierKeys[0] ?? "free",
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [forms, setForms] = useState<Record<string, TierFormData>>(() => {
    const result: Record<string, TierFormData> = {};
    for (const tierDef of initialTiers) {
      const stripe = initialStripeProducts.find((p) => p.tier === tierDef.tier);
      result[tierDef.tier] = buildFormData(tierDef, stripe);
    }
    return result;
  });

  const form = forms[selectedTier];

  const updateForm = (patch: Partial<TierFormData>) => {
    setForms((prev) => {
      const current = prev[selectedTier];
      if (!current) return prev;
      return {
        ...prev,
        [selectedTier]: { ...current, ...patch },
      };
    });
  };

  // --- Mutations ---

  const saveMutation = useApiMutation(
    async ({ tier, data }: { tier: string; data: TierFormData }) => {
      const tierPayload: Partial<TierDefinition> = {
        name: data.name,
        description: data.description,
        price: data.price,
        limits: data.limits,
        modules: data.modules,
        addons: data.addons,
        enabled: data.enabled,
        isBillable: data.isBillable,
        sortOrder: data.sortOrder,
        visibility: data.visibility,
      };

      // Save tier definition FIRST — the stripe endpoint validates
      // isBillable from Firestore, so the tier must be persisted before
      // the stripe mapping can succeed.
      await updateTierDefinition(tier, tierPayload);

      if (data.isBillable && isStripeConfigured(data)) {
        await updateStripeProduct(tier, {
          stripeProductId: data.stripeProductId,
          prices: {
            month: data.monthPriceId,
            year: data.yearPriceId,
          },
        });
      }

      return { success: true };
    },
    {
      successMessage: t("admin:tiers.messages.saveSuccess"),
      errorMessage: t("admin:tiers.messages.saveError"),
      onSuccess: () => onRefresh(),
    },
  );

  const resetMutation = useApiMutation(
    (tier: string) => resetTierDefaults(tier),
    {
      successMessage: t("admin:tiers.messages.resetSuccess"),
      errorMessage: t("admin:tiers.messages.resetError"),
      onSuccess: (result, tier) => {
        if (result.definition) {
          const stripe = initialStripeProducts.find((p) => p.tier === tier);
          setForms((prev) => ({
            ...prev,
            [tier]: buildFormData(result.definition, stripe),
          }));
        }
      },
    },
  );

  const createMutation = useApiMutation(
    (definition: TierDefinition) => createTier(definition),
    {
      successMessage: t("admin:tiers.messages.createSuccess"),
      errorMessage: t("admin:tiers.messages.createError"),
      onSuccess: () => {
        setShowCreateDialog(false);
        onRefresh();
      },
    },
  );

  const deleteMutation = useApiMutation((tier: string) => deleteTier(tier), {
    successMessage: t("admin:tiers.messages.deleteSuccess"),
    errorMessage: t("admin:tiers.messages.deleteError"),
    onSuccess: () => {
      setShowDeleteDialog(false);
      onRefresh();
    },
  });

  const isBusy =
    saveMutation.isPending ||
    resetMutation.isPending ||
    createMutation.isPending ||
    deleteMutation.isPending;

  const isBuiltinTier = SUBSCRIPTION_TIERS.includes(selectedTier);

  // --- Handlers ---

  const handleLimitChange = (key: keyof SubscriptionLimits, value: string) => {
    if (!form) return;
    const numValue = value === "" ? 0 : parseInt(value, 10);
    updateForm({
      limits: { ...form.limits, [key]: numValue },
    });
  };

  const handleModuleToggle = (key: keyof ModuleFlags) => {
    if (!form) return;
    updateForm({
      modules: { ...form.modules, [key]: !form.modules[key] },
    });
  };

  const handleAddonToggle = (key: keyof SubscriptionAddons) => {
    if (!form) return;
    updateForm({
      addons: { ...form.addons, [key]: !form.addons[key] },
    });
  };

  if (!form) return null;

  return (
    <div className="space-y-6">
      {/* Tier selector + Create button */}
      <div className="flex items-center gap-4">
        <Label htmlFor="tier-select" className="text-sm font-medium">
          {t("admin:tiers.labels.tier")}
        </Label>
        <Select value={selectedTier} onValueChange={(v) => setSelectedTier(v)}>
          <SelectTrigger id="tier-select" className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {initialTiers.map((tierDef) => {
              const f = forms[tierDef.tier];
              return (
                <SelectItem key={tierDef.tier} value={tierDef.tier}>
                  <span className="flex items-center gap-2">
                    {f?.name || tierDef.tier}
                    {f && !f.enabled && (
                      <Badge variant="secondary" className="text-[10px] px-1">
                        {t("admin:tiers.badges.disabled")}
                      </Badge>
                    )}
                    {f?.visibility === "hidden" && (
                      <Badge variant="outline" className="text-[10px] px-1">
                        {t("admin:tiers.badges.hidden")}
                      </Badge>
                    )}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreateDialog(true)}
          disabled={isBusy}
        >
          <Plus className="h-4 w-4 mr-1" />
          {t("admin:tiers.actions.create")}
        </Button>
      </div>

      {/* Detail card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{form.name}</CardTitle>
              <CardDescription>{form.description}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {!form.enabled && (
                <Badge variant="destructive">
                  {t("admin:tiers.badges.disabled")}
                </Badge>
              )}
              {form.visibility === "hidden" && (
                <Badge variant="outline">
                  {t("admin:tiers.badges.hidden")}
                </Badge>
              )}
              {form.isBillable && (
                <Badge variant="secondary">
                  {t("admin:tiers.badges.billable")}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* General */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">
              {t("admin:tiers.sections.general")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>{t("admin:tiers.labels.name")}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => updateForm({ name: e.target.value })}
                  disabled={isBusy}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("admin:tiers.labels.description")}</Label>
                <Input
                  value={form.description}
                  onChange={(e) => updateForm({ description: e.target.value })}
                  disabled={isBusy}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("admin:tiers.labels.price")}</Label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) =>
                    updateForm({
                      price:
                        e.target.value === ""
                          ? 0
                          : parseInt(e.target.value, 10),
                    })
                  }
                  disabled={isBusy}
                />
              </div>
            </div>
          </section>

          <Separator />

          {/* Status */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">
              {t("admin:tiers.sections.status")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="tier-enabled" className="cursor-pointer">
                  {t("admin:tiers.labels.enabled")}
                </Label>
                <Switch
                  id="tier-enabled"
                  checked={form.enabled}
                  onCheckedChange={(v) => updateForm({ enabled: v })}
                  disabled={isBusy}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="tier-billable" className="cursor-pointer">
                  {t("admin:tiers.labels.billable")}
                </Label>
                <Switch
                  id="tier-billable"
                  checked={form.isBillable}
                  onCheckedChange={(v) => updateForm({ isBillable: v })}
                  disabled={isBusy}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("admin:tiers.labels.sortOrder")}</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    updateForm({
                      sortOrder:
                        e.target.value === ""
                          ? 0
                          : parseInt(e.target.value, 10),
                    })
                  }
                  disabled={isBusy}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("admin:tiers.labels.visibility")}</Label>
                <Select
                  value={form.visibility}
                  onValueChange={(v) =>
                    updateForm({ visibility: v as "public" | "hidden" })
                  }
                  disabled={isBusy}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      {t("admin:tiers.labels.visibilityPublic")}
                    </SelectItem>
                    <SelectItem value="hidden">
                      {t("admin:tiers.labels.visibilityHidden")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Stripe Billing — only when isBillable */}
          {form.isBillable && (
            <>
              <Separator />
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                    {t("admin:tiers.sections.stripeBilling")}
                  </h3>
                  <Badge
                    variant={isStripeConfigured(form) ? "default" : "secondary"}
                  >
                    {isStripeConfigured(form) ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {t("admin:tiers.badges.configured")}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        {t("admin:tiers.badges.notConfigured")}
                      </span>
                    )}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>{t("admin:tiers.labels.stripeProductId")}</Label>
                    <Input
                      placeholder="prod_xxx"
                      value={form.stripeProductId}
                      onChange={(e) =>
                        updateForm({ stripeProductId: e.target.value })
                      }
                      disabled={isBusy}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("admin:tiers.labels.monthlyPriceId")}</Label>
                    <Input
                      placeholder="price_xxx"
                      value={form.monthPriceId}
                      onChange={(e) =>
                        updateForm({ monthPriceId: e.target.value })
                      }
                      disabled={isBusy}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("admin:tiers.labels.annualPriceId")}</Label>
                    <Input
                      placeholder="price_xxx"
                      value={form.yearPriceId}
                      onChange={(e) =>
                        updateForm({ yearPriceId: e.target.value })
                      }
                      disabled={isBusy}
                    />
                  </div>
                </div>
              </section>
            </>
          )}

          <Separator />

          {/* Limits */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">
              {t("admin:tiers.sections.numericLimits")}
            </h3>
            <SubscriptionLimitsEditor
              limits={form.limits}
              onChange={handleLimitChange}
              disabled={isBusy}
            />
          </section>

          <Separator />

          {/* Modules */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">
              {t("admin:tiers.sections.moduleFlags")}
            </h3>
            <SubscriptionModulesEditor
              modules={form.modules}
              onToggle={handleModuleToggle}
              disabled={isBusy}
            />
          </section>

          <Separator />

          {/* Add-ons */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">
              {t("admin:tiers.sections.addons")}
            </h3>
            <SubscriptionAddonsEditor
              addons={form.addons}
              onToggle={handleAddonToggle}
              disabled={isBusy}
            />
          </section>

          <Separator />

          {/* Actions */}
          <div className="flex justify-between">
            <div>
              {selectedTier !== "free" && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isBusy}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("admin:tiers.actions.delete")}
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              {isBuiltinTier && (
                <Button
                  variant="outline"
                  onClick={() => resetMutation.mutate(selectedTier)}
                  disabled={isBusy}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t("admin:tiers.actions.reset")}
                </Button>
              )}
              <Button
                onClick={() =>
                  saveMutation.mutate({ tier: selectedTier, data: form })
                }
                disabled={isBusy}
              >
                <Save className="h-4 w-4 mr-2" />
                {t("admin:tiers.actions.save")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <CreateTierDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={(def) => createMutation.mutate(def)}
        existingTierKeys={tierKeys}
        isPending={createMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("admin:tiers.dialogs.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedTier === "free"
                ? t("admin:tiers.dialogs.deleteCannotFree")
                : t("admin:tiers.dialogs.deleteConfirm", {
                    name: form?.name ?? selectedTier,
                  })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("common:buttons.cancel", { defaultValue: "Cancel" })}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(selectedTier)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {t("admin:tiers.actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------- Page Component ----------

export default function AdminTierManagementPage() {
  const { t } = useTranslation(["admin"]);

  const tiersQuery = useApiQuery<TierDefinition[]>(
    ["admin-tiers"],
    getTierDefinitions,
  );

  const stripeQuery = useApiQuery<StripeProductMapping[]>(
    ["admin-stripe-products"],
    getStripeProducts,
  );

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={t("admin:tiers.title")}
        description={t("admin:tiers.description")}
      />

      <QueryBoundary
        query={tiersQuery}
        loadingFallback={<TierLoadingSkeleton />}
      >
        {(tiers) => (
          <QueryBoundary
            query={stripeQuery}
            loadingFallback={<TierLoadingSkeleton />}
          >
            {(stripeProducts) => (
              <TierManagementContent
                initialTiers={tiers}
                initialStripeProducts={stripeProducts}
                onRefresh={() => {
                  tiersQuery.refetch();
                  stripeQuery.refetch();
                }}
              />
            )}
          </QueryBoundary>
        )}
      </QueryBoundary>
    </div>
  );
}
