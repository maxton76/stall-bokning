import { useState } from "react";
import { Save, RotateCcw } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import type {
  TierDefinition,
  SubscriptionTier,
  ModuleFlags,
  SubscriptionLimits,
  SubscriptionAddons,
} from "@stall-bokning/shared";
import {
  MODULE_LABELS,
  LIMIT_LABELS,
  ADDON_LABELS,
  SUBSCRIPTION_TIERS,
} from "@stall-bokning/shared";
import {
  getTierDefinitions,
  updateTierDefinition,
  resetTierDefaults,
} from "@/services/adminService";

function TierLoadingSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-96 w-full" />
      ))}
    </div>
  );
}

function TierManagementContent({
  initialTiers,
}: {
  initialTiers: TierDefinition[];
}) {
  const [tiers, setTiers] = useState<Record<SubscriptionTier, TierDefinition>>(
    () => {
      const tierMap = {} as Record<SubscriptionTier, TierDefinition>;
      for (const def of initialTiers) {
        tierMap[def.tier] = def;
      }
      return tierMap;
    },
  );

  const saveMutation = useApiMutation(
    ({ tier, def }: { tier: SubscriptionTier; def: TierDefinition }) => {
      const { tier: _tier, updatedAt: _at, updatedBy: _by, ...body } = def;
      return updateTierDefinition(tier, body);
    },
    {
      successMessage: "Tier updated successfully",
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
          setTiers((prev) => ({ ...prev, [tier]: result.definition }));
        }
      },
    },
  );

  const handleLimitChange = (
    tier: SubscriptionTier,
    key: keyof SubscriptionLimits,
    value: string,
  ) => {
    const numValue = value === "" ? 0 : parseInt(value, 10);
    setTiers({
      ...tiers,
      [tier]: {
        ...tiers[tier],
        limits: { ...tiers[tier].limits, [key]: numValue },
      },
    });
  };

  const handleModuleToggle = (
    tier: SubscriptionTier,
    key: keyof ModuleFlags,
  ) => {
    setTiers({
      ...tiers,
      [tier]: {
        ...tiers[tier],
        modules: { ...tiers[tier].modules, [key]: !tiers[tier].modules[key] },
      },
    });
  };

  const handleAddonToggle = (
    tier: SubscriptionTier,
    key: keyof SubscriptionAddons,
  ) => {
    setTiers({
      ...tiers,
      [tier]: {
        ...tiers[tier],
        addons: { ...tiers[tier].addons, [key]: !tiers[tier].addons[key] },
      },
    });
  };

  const handlePriceChange = (tier: SubscriptionTier, value: string) => {
    setTiers({
      ...tiers,
      [tier]: {
        ...tiers[tier],
        price: value === "" ? 0 : parseInt(value, 10),
      },
    });
  };

  const isBusy = saveMutation.isPending || resetMutation.isPending;
  const limitKeys = Object.keys(tiers.free.limits) as Array<
    keyof SubscriptionLimits
  >;
  const moduleKeys = Object.keys(tiers.free.modules) as Array<
    keyof ModuleFlags
  >;
  const addonKeys = Object.keys(tiers.free.addons) as Array<
    keyof SubscriptionAddons
  >;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {SUBSCRIPTION_TIERS.map((tier) => {
        const def = tiers[tier];
        if (!def) return null;

        return (
          <Card key={tier} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="capitalize">{def.name || tier}</CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => resetMutation.mutate(tier)}
                    disabled={isBusy}
                    title="Reset to defaults"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => saveMutation.mutate({ tier, def })}
                    disabled={isBusy}
                    title="Save changes"
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>{def.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              {/* Price */}
              <div className="space-y-1">
                <Label>Price (SEK/month)</Label>
                <Input
                  type="number"
                  value={def.price}
                  onChange={(e) => handlePriceChange(tier, e.target.value)}
                />
              </div>

              <Separator />

              {/* Limits */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Limits
                </Label>
                {limitKeys.map((key) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-xs truncate">
                      {LIMIT_LABELS[key]}
                    </span>
                    <Input
                      type="number"
                      value={def.limits[key]}
                      onChange={(e) =>
                        handleLimitChange(tier, key, e.target.value)
                      }
                      className="w-20 h-7 text-xs"
                    />
                  </div>
                ))}
              </div>

              <Separator />

              {/* Modules */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Modules
                </Label>
                {moduleKeys.map((key) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-xs truncate">
                      {MODULE_LABELS[key]}
                    </span>
                    <Switch
                      checked={def.modules[key]}
                      onCheckedChange={() => handleModuleToggle(tier, key)}
                    />
                  </div>
                ))}
              </div>

              <Separator />

              {/* Add-ons */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Add-ons (included)
                </Label>
                {addonKeys.map((key) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-xs truncate">
                      {ADDON_LABELS[key]}
                    </span>
                    <Switch
                      checked={def.addons[key]}
                      onCheckedChange={() => handleAddonToggle(tier, key)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function AdminTierManagementPage() {
  const query = useApiQuery<TierDefinition[]>(
    ["admin-tiers"],
    getTierDefinitions,
  );

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Tier Management"
        description="Define what each subscription tier includes. Changes here define the defaults for new organizations."
      />

      <QueryBoundary query={query} loadingFallback={<TierLoadingSkeleton />}>
        {(tiers) => <TierManagementContent initialTiers={tiers} />}
      </QueryBoundary>
    </div>
  );
}
