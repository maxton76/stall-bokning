import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatSEK } from "@/lib/formatters";
import type { SubscriptionTier, BillingInterval } from "@equiduty/shared";
import { TIER_PRICING, ANNUAL_DISCOUNT_PERCENT } from "@equiduty/shared";

interface PricingTableProps {
  currentTier: SubscriptionTier;
  onSelectPlan: (tier: SubscriptionTier, interval: BillingInterval) => void;
  loading?: boolean;
}

interface TierCard {
  tier: SubscriptionTier;
  popular?: boolean;
}

const TIERS: TierCard[] = [
  { tier: "free" },
  { tier: "standard", popular: true },
  { tier: "pro" },
  { tier: "enterprise" },
];

const TIER_FEATURES: Record<SubscriptionTier, string[]> = {
  free: [
    "subscription.features.members_3",
    "subscription.features.stables_1",
    "subscription.features.horses_5",
    "subscription.features.basicScheduling",
  ],
  standard: [
    "subscription.features.members_15",
    "subscription.features.stables_3",
    "subscription.features.horses_25",
    "subscription.features.analytics",
    "subscription.features.selectionProcess",
    "subscription.features.locationHistory",
    "subscription.features.photoEvidence",
  ],
  pro: [
    "subscription.features.members_50",
    "subscription.features.stables_10",
    "subscription.features.horses_75",
    "subscription.features.allStandardFeatures",
    "subscription.features.leaveManagement",
    "subscription.features.inventory",
    "subscription.features.lessons",
    "subscription.features.staffMatrix",
    "subscription.features.integrations",
    "subscription.features.aiAssistant",
  ],
  enterprise: [
    "subscription.features.unlimitedEverything",
    "subscription.features.allProFeatures",
    "subscription.features.portal",
    "subscription.features.invoicing",
    "subscription.features.dedicatedSupport",
    "subscription.features.customIntegrations",
  ],
};

export function PricingTable({
  currentTier,
  onSelectPlan,
  loading,
}: PricingTableProps) {
  const { t } = useTranslation(["organizations", "common"]);
  const [annual, setAnnual] = useState(false);
  const interval: BillingInterval = annual ? "year" : "month";

  return (
    <div className="space-y-6">
      {/* Billing interval toggle */}
      <div className="flex items-center justify-center gap-3">
        <Label htmlFor="billing-toggle" className="text-sm">
          {t("organizations:subscription.pricing.monthly")}
        </Label>
        <Switch
          id="billing-toggle"
          checked={annual}
          onCheckedChange={setAnnual}
        />
        <Label htmlFor="billing-toggle" className="text-sm">
          {t("organizations:subscription.pricing.annual")}
        </Label>
        {annual && (
          <Badge variant="secondary" className="ml-2">
            {t("organizations:subscription.pricing.savePercent", {
              percent: ANNUAL_DISCOUNT_PERCENT,
            })}
          </Badge>
        )}
      </div>

      {/* Tier cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {TIERS.map(({ tier, popular }) => {
          const isCurrent = tier === currentTier;
          const isPaidTier = tier === "standard" || tier === "pro";
          const pricing = isPaidTier ? TIER_PRICING[tier] : null;
          const monthlyPrice = pricing
            ? annual
              ? Math.round(pricing.year / 12)
              : pricing.month
            : 0;

          return (
            <Card
              key={tier}
              className={cn(
                "relative flex flex-col",
                popular && "border-primary shadow-md",
                isCurrent && "ring-2 ring-primary",
              )}
            >
              {popular && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  {t("organizations:subscription.pricing.popular")}
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="capitalize">
                  {t(`organizations:subscription.tiers.${tier}.name`)}
                </CardTitle>
                <CardDescription>
                  {t(`organizations:subscription.tiers.${tier}.description`)}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                {/* Price */}
                <div className="mb-4">
                  {tier === "free" ? (
                    <div className="text-3xl font-bold">
                      {t("organizations:subscription.pricing.free")}
                    </div>
                  ) : tier === "enterprise" ? (
                    <div className="text-lg font-semibold text-muted-foreground">
                      {t("organizations:subscription.pricing.contactSales")}
                    </div>
                  ) : (
                    <>
                      <span className="text-3xl font-bold">
                        {formatSEK(monthlyPrice, 0)}
                      </span>
                      <span className="text-muted-foreground">
                        /{t("organizations:subscription.pricing.perMonth")}
                      </span>
                      {annual && pricing && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatSEK(pricing.year, 0)}/
                          {t("organizations:subscription.pricing.perYear")}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2 text-sm">
                  {TIER_FEATURES[tier].map((featureKey) => (
                    <li key={featureKey} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <span>{t(`organizations:${featureKey}`)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    {t("organizations:subscription.pricing.currentPlan")}
                  </Button>
                ) : tier === "free" ? (
                  <Button variant="ghost" className="w-full" disabled>
                    {t("organizations:subscription.pricing.free")}
                  </Button>
                ) : tier === "enterprise" ? (
                  <Button variant="outline" className="w-full" asChild>
                    <a href="mailto:info@equiduty.com">
                      {t("organizations:subscription.pricing.contactSales")}
                    </a>
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={popular ? "default" : "outline"}
                    onClick={() => onSelectPlan(tier, interval)}
                    disabled={loading}
                  >
                    {t("organizations:subscription.pricing.selectPlan")}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
