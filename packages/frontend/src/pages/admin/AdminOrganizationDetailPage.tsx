import { useState } from "react";
import { useParams } from "react-router-dom";
import { Save, Building2 } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  AdminOrganizationDetail,
  OrganizationSubscription,
  SubscriptionTier,
  ModuleFlags,
  SubscriptionLimits,
  SubscriptionAddons,
} from "@equiduty/shared";
import {
  MODULE_LABELS,
  LIMIT_LABELS,
  ADDON_LABELS,
  DEFAULT_TIER_DEFINITIONS,
  SUBSCRIPTION_TIERS,
} from "@equiduty/shared";
import {
  getOrganization,
  updateOrganizationSubscription,
} from "@/services/adminService";

function DetailLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full" />
      ))}
    </div>
  );
}

function OrgDetailContent({ org }: { org: AdminOrganizationDetail }) {
  const [subscription, setSubscription] = useState<OrganizationSubscription>(
    org.subscription,
  );

  const saveMutation = useApiMutation(
    (sub: OrganizationSubscription) =>
      updateOrganizationSubscription(org.id, sub),
    {
      successMessage: "Subscription updated successfully",
      errorMessage: "Failed to save subscription",
    },
  );

  const handleTierChange = (tier: SubscriptionTier) => {
    const defaults = DEFAULT_TIER_DEFINITIONS[tier];
    setSubscription({
      tier,
      limits: { ...defaults.limits },
      modules: { ...defaults.modules },
      addons: { ...defaults.addons },
    });
  };

  const handleLimitChange = (key: keyof SubscriptionLimits, value: string) => {
    const numValue = value === "" ? 0 : parseInt(value, 10);
    setSubscription({
      ...subscription,
      limits: { ...subscription.limits, [key]: numValue },
    });
  };

  const handleModuleToggle = (key: keyof ModuleFlags) => {
    setSubscription({
      ...subscription,
      modules: { ...subscription.modules, [key]: !subscription.modules[key] },
    });
  };

  const handleAddonToggle = (key: keyof SubscriptionAddons) => {
    setSubscription({
      ...subscription,
      addons: { ...subscription.addons, [key]: !subscription.addons[key] },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={org.name}
        description={org.ownerEmail}
        badge={<Building2 className="h-6 w-6 text-muted-foreground" />}
        backLink={{ href: "/admin/organizations", label: "Organizations" }}
        action={{
          label: saveMutation.isPending ? "Saving..." : "Save Changes",
          icon: <Save className="h-4 w-4 mr-2" />,
          onClick: () => saveMutation.mutate(subscription),
        }}
      />

      {/* Org Info */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Members</span>
              <p className="font-medium">{org.memberCount}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Horses</span>
              <p className="font-medium">{org.horseCount}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Stables</span>
              <p className="font-medium">{org.stableCount}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Owner</span>
              <p className="font-medium">{org.ownerName || org.ownerId}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Tier */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Tier</CardTitle>
          <CardDescription>
            Changing the tier will reset limits and modules to tier defaults
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={subscription.tier}
            onValueChange={(v) => handleTierChange(v as SubscriptionTier)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUBSCRIPTION_TIERS.map((tier) => (
                <SelectItem key={tier} value={tier}>
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Numeric Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Numeric Limits</CardTitle>
          <CardDescription>-1 = unlimited</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(
              Object.keys(subscription.limits) as Array<
                keyof SubscriptionLimits
              >
            ).map((key) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={`limit-${key}`}>{LIMIT_LABELS[key]}</Label>
                <Input
                  id={`limit-${key}`}
                  type="number"
                  value={subscription.limits[key]}
                  onChange={(e) => handleLimitChange(key, e.target.value)}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Module Flags */}
      <Card>
        <CardHeader>
          <CardTitle>Module Flags</CardTitle>
          <CardDescription>Enable or disable feature modules</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(
              Object.keys(subscription.modules) as Array<keyof ModuleFlags>
            ).map((key) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <Label htmlFor={`module-${key}`} className="cursor-pointer">
                  {MODULE_LABELS[key]}
                </Label>
                <Switch
                  id={`module-${key}`}
                  checked={subscription.modules[key]}
                  onCheckedChange={() => handleModuleToggle(key)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add-ons */}
      <Card>
        <CardHeader>
          <CardTitle>Add-ons</CardTitle>
          <CardDescription>Business add-on features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(
              Object.keys(subscription.addons) as Array<
                keyof SubscriptionAddons
              >
            ).map((key) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <Label htmlFor={`addon-${key}`} className="cursor-pointer">
                  {ADDON_LABELS[key]}
                </Label>
                <Switch
                  id={`addon-${key}`}
                  checked={subscription.addons[key]}
                  onCheckedChange={() => handleAddonToggle(key)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminOrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();

  const query = useApiQuery<AdminOrganizationDetail>(
    ["admin-org", id],
    () => getOrganization(id!),
    { enabled: !!id },
  );

  return (
    <div className="p-6">
      <QueryBoundary query={query} loadingFallback={<DetailLoadingSkeleton />}>
        {(org) => <OrgDetailContent org={org} />}
      </QueryBoundary>
    </div>
  );
}
