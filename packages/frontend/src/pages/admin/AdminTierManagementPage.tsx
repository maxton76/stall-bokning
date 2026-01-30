import { useState } from "react";
import { Save, RotateCcw, CheckCircle2, XCircle } from "lucide-react";
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
import { PageHeader } from "@/components/PageHeader";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { SubscriptionLimitsEditor } from "@/components/subscription/SubscriptionLimitsEditor";
import { SubscriptionModulesEditor } from "@/components/subscription/SubscriptionModulesEditor";
import { SubscriptionAddonsEditor } from "@/components/subscription/SubscriptionAddonsEditor";
import type {
  TierDefinition,
  SubscriptionTier,
  SubscriptionLimits,
  ModuleFlags,
  SubscriptionAddons,
  StripeProductMapping,
} from "@equiduty/shared";
import { SUBSCRIPTION_TIERS, DEFAULT_TIER_DEFINITIONS } from "@equiduty/shared";
import {
  getTierDefinitions,
  updateTierDefinition,
  resetTierDefaults,
  getStripeProducts,
  updateStripeProduct,
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
  tierIndex: number,
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
    sortOrder: tier.sortOrder ?? tierIndex,
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
}: {
  initialTiers: TierDefinition[];
  initialStripeProducts: StripeProductMapping[];
}) {
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(
    SUBSCRIPTION_TIERS[0] as SubscriptionTier,
  );

  const [forms, setForms] = useState<Record<SubscriptionTier, TierFormData>>(
    () => {
      const result = {} as Record<SubscriptionTier, TierFormData>;
      for (const [index, tierKey] of SUBSCRIPTION_TIERS.entries()) {
        const tierDef =
          initialTiers.find((t) => t.tier === tierKey) ??
          DEFAULT_TIER_DEFINITIONS[tierKey];
        const stripe = initialStripeProducts.find((p) => p.tier === tierKey);
        result[tierKey] = buildFormData(tierDef, index, stripe);
      }
      return result;
    },
  );

  const form = forms[selectedTier];

  const updateForm = (patch: Partial<TierFormData>) => {
    setForms((prev) => ({
      ...prev,
      [selectedTier]: { ...prev[selectedTier], ...patch },
    }));
  };

  // --- Mutations ---

  const saveMutation = useApiMutation(
    async ({ tier, data }: { tier: SubscriptionTier; data: TierFormData }) => {
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

      const promises: Promise<unknown>[] = [
        updateTierDefinition(tier, tierPayload),
      ];

      if (data.isBillable && isStripeConfigured(data)) {
        promises.push(
          updateStripeProduct(tier, {
            stripeProductId: data.stripeProductId,
            prices: {
              month: data.monthPriceId,
              year: data.yearPriceId,
            },
          }),
        );
      }

      await Promise.all(promises);
      return { success: true };
    },
    {
      successMessage: "Tier saved successfully",
      errorMessage: "Failed to save tier",
    },
  );

  const resetMutation = useApiMutation(
    (tier: SubscriptionTier) => resetTierDefaults(tier),
    {
      successMessage: "Tier reset to defaults",
      errorMessage: "Failed to reset tier",
      onSuccess: (result, tier) => {
        if (result.definition) {
          const index = SUBSCRIPTION_TIERS.indexOf(tier);
          const stripe = initialStripeProducts.find((p) => p.tier === tier);
          setForms((prev) => ({
            ...prev,
            [tier]: buildFormData(result.definition, index, stripe),
          }));
        }
      },
    },
  );

  const isBusy = saveMutation.isPending || resetMutation.isPending;

  // --- Handlers ---

  const handleLimitChange = (key: keyof SubscriptionLimits, value: string) => {
    const numValue = value === "" ? 0 : parseInt(value, 10);
    updateForm({
      limits: { ...form.limits, [key]: numValue },
    });
  };

  const handleModuleToggle = (key: keyof ModuleFlags) => {
    updateForm({
      modules: { ...form.modules, [key]: !form.modules[key] },
    });
  };

  const handleAddonToggle = (key: keyof SubscriptionAddons) => {
    updateForm({
      addons: { ...form.addons, [key]: !form.addons[key] },
    });
  };

  if (!form) return null;

  return (
    <div className="space-y-6">
      {/* Tier selector */}
      <div className="flex items-center gap-4">
        <Label htmlFor="tier-select" className="text-sm font-medium">
          Tier
        </Label>
        <Select
          value={selectedTier}
          onValueChange={(v) => setSelectedTier(v as SubscriptionTier)}
        >
          <SelectTrigger id="tier-select" className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUBSCRIPTION_TIERS.map((tier) => {
              const f = forms[tier];
              return (
                <SelectItem key={tier} value={tier}>
                  <span className="flex items-center gap-2">
                    {f?.name || tier}
                    {f && !f.enabled && (
                      <Badge variant="secondary" className="text-[10px] px-1">
                        Disabled
                      </Badge>
                    )}
                    {f?.visibility === "hidden" && (
                      <Badge variant="outline" className="text-[10px] px-1">
                        Hidden
                      </Badge>
                    )}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
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
              {!form.enabled && <Badge variant="destructive">Disabled</Badge>}
              {form.visibility === "hidden" && (
                <Badge variant="outline">Hidden</Badge>
              )}
              {form.isBillable && <Badge variant="secondary">Billable</Badge>}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* General */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">
              General
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => updateForm({ name: e.target.value })}
                  disabled={isBusy}
                />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => updateForm({ description: e.target.value })}
                  disabled={isBusy}
                />
              </div>
              <div className="space-y-1">
                <Label>Price (SEK/month)</Label>
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
              Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="tier-enabled" className="cursor-pointer">
                  Enabled
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
                  Billable
                </Label>
                <Switch
                  id="tier-billable"
                  checked={form.isBillable}
                  onCheckedChange={(v) => updateForm({ isBillable: v })}
                  disabled={isBusy}
                />
              </div>
              <div className="space-y-1">
                <Label>Sort Order</Label>
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
                <Label>Visibility</Label>
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
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="hidden">Hidden</SelectItem>
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
                    Stripe Billing
                  </h3>
                  <Badge
                    variant={isStripeConfigured(form) ? "default" : "secondary"}
                  >
                    {isStripeConfigured(form) ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Configured
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Not configured
                      </span>
                    )}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>Stripe Product ID</Label>
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
                    <Label>Monthly Price ID</Label>
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
                    <Label>Annual Price ID</Label>
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
              Numeric Limits
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
              Module Flags
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
              Add-ons
            </h3>
            <SubscriptionAddonsEditor
              addons={form.addons}
              onToggle={handleAddonToggle}
              disabled={isBusy}
            />
          </section>

          <Separator />

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => resetMutation.mutate(selectedTier)}
              disabled={isBusy}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button
              onClick={() =>
                saveMutation.mutate({ tier: selectedTier, data: form })
              }
              disabled={isBusy}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- Page Component ----------

export default function AdminTierManagementPage() {
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
        title="Tier Management"
        description="Define what each subscription tier includes, configure Stripe billing, and manage tier visibility."
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
              />
            )}
          </QueryBoundary>
        )}
      </QueryBoundary>
    </div>
  );
}
