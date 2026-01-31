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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatSEK } from "@/lib/formatters";
import { useTierDefinitions } from "@/hooks/useTierDefinitions";
import type { BillingInterval } from "@equiduty/shared";
import { ANNUAL_DISCOUNT_PERCENT } from "@equiduty/shared";

interface PricingTableProps {
  currentTier: string;
  onSelectPlan: (tier: string, interval: BillingInterval) => void;
  loading?: boolean;
}

function PricingCardSkeleton() {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-48 mt-2" />
      </CardHeader>
      <CardContent className="flex-1">
        <Skeleton className="h-9 w-32 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );
}

export function PricingTable({
  currentTier,
  onSelectPlan,
  loading,
}: PricingTableProps) {
  const { t } = useTranslation(["organizations", "common"]);
  const [annual, setAnnual] = useState(false);
  const interval: BillingInterval = annual ? "year" : "month";
  const { tiers, isLoading } = useTierDefinitions();

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
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <PricingCardSkeleton key={i} />
            ))
          : tiers.map((tier) => {
              const isCurrent = tier.tier === currentTier;
              const isFree = tier.price === 0 && !tier.isBillable;
              const isContactSales =
                !tier.isBillable && tier.price === 0 && !tier.isDefault;
              const monthlyPrice = tier.isBillable
                ? annual
                  ? Math.round(
                      (tier.price * 100 * (100 - ANNUAL_DISCOUNT_PERCENT)) /
                        100 /
                        12,
                    ) * 100
                  : tier.price * 100 // Convert SEK to ore for formatSEK
                : 0;

              return (
                <Card
                  key={tier.tier}
                  className={cn(
                    "relative flex flex-col",
                    tier.popular && "border-primary shadow-md",
                    isCurrent && "ring-2 ring-primary",
                  )}
                >
                  {tier.popular && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      {t("organizations:subscription.pricing.popular")}
                    </Badge>
                  )}
                  <CardHeader>
                    <CardTitle className="capitalize">{tier.name}</CardTitle>
                    <CardDescription>{tier.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    {/* Price */}
                    <div className="mb-4">
                      {isFree ? (
                        <div className="text-3xl font-bold">
                          {t("organizations:subscription.pricing.free")}
                        </div>
                      ) : isContactSales ? (
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
                          {annual && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatSEK(monthlyPrice * 12, 0)}/
                              {t("organizations:subscription.pricing.perYear")}
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-2 text-sm">
                      {(tier.features ?? []).map((featureKey) => (
                        <li key={featureKey} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                          <span>
                            {t(`organizations:${featureKey}`, {
                              defaultValue: featureKey,
                            })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    {isCurrent ? (
                      <Button variant="outline" className="w-full" disabled>
                        {t("organizations:subscription.pricing.currentPlan")}
                      </Button>
                    ) : isFree ? (
                      <Button variant="ghost" className="w-full" disabled>
                        {t("organizations:subscription.pricing.free")}
                      </Button>
                    ) : isContactSales ? (
                      <Button variant="outline" className="w-full" asChild>
                        <a href="mailto:info@equiduty.com">
                          {t("organizations:subscription.pricing.contactSales")}
                        </a>
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        variant={tier.popular ? "default" : "outline"}
                        onClick={() => onSelectPlan(tier.tier, interval)}
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
