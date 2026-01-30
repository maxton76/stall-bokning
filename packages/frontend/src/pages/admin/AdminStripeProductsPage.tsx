import { useState } from "react";
import { Save, CheckCircle2, XCircle } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import type { StripeProductMapping } from "@equiduty/shared";
import {
  getStripeProducts,
  updateStripeProduct,
} from "@/services/adminService";

const BILLABLE_TIERS = ["standard", "pro"] as const;
type BillableTier = (typeof BILLABLE_TIERS)[number];

const TIER_LABELS: Record<BillableTier, string> = {
  standard: "Standard",
  pro: "Pro",
};

interface TierFormState {
  stripeProductId: string;
  monthPriceId: string;
  yearPriceId: string;
}

function StripeProductsLoadingSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <Skeleton key={i} className="h-72 w-full" />
      ))}
    </div>
  );
}

function isConfigured(form: TierFormState): boolean {
  return !!(form.stripeProductId && form.monthPriceId && form.yearPriceId);
}

function StripeProductsContent({
  initialProducts,
}: {
  initialProducts: StripeProductMapping[];
}) {
  const [forms, setForms] = useState<Record<BillableTier, TierFormState>>(
    () => {
      const state = {} as Record<BillableTier, TierFormState>;
      for (const tier of BILLABLE_TIERS) {
        const existing = initialProducts.find((p) => p.tier === tier);
        state[tier] = {
          stripeProductId: existing?.stripeProductId || "",
          monthPriceId: existing?.prices?.month || "",
          yearPriceId: existing?.prices?.year || "",
        };
      }
      return state;
    },
  );

  const saveMutation = useApiMutation(
    ({ tier, form }: { tier: BillableTier; form: TierFormState }) =>
      updateStripeProduct(tier, {
        stripeProductId: form.stripeProductId,
        prices: {
          month: form.monthPriceId,
          year: form.yearPriceId,
        },
      }),
    {
      successMessage: "Stripe product mapping saved",
      errorMessage: "Failed to save Stripe product mapping",
    },
  );

  const handleChange = (
    tier: BillableTier,
    field: keyof TierFormState,
    value: string,
  ) => {
    setForms((prev) => ({
      ...prev,
      [tier]: { ...prev[tier], [field]: value },
    }));
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {BILLABLE_TIERS.map((tier) => {
        const form = forms[tier];
        const configured = isConfigured(form);

        return (
          <Card key={tier}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{TIER_LABELS[tier]}</CardTitle>
                <Badge variant={configured ? "default" : "secondary"}>
                  {configured ? (
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
              <CardDescription>
                Stripe Product and Price IDs for the {TIER_LABELS[tier]} tier
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`${tier}-product`}>Stripe Product ID</Label>
                <Input
                  id={`${tier}-product`}
                  placeholder="prod_xxx"
                  value={form.stripeProductId}
                  onChange={(e) =>
                    handleChange(tier, "stripeProductId", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${tier}-month`}>Monthly Price ID</Label>
                <Input
                  id={`${tier}-month`}
                  placeholder="price_xxx"
                  value={form.monthPriceId}
                  onChange={(e) =>
                    handleChange(tier, "monthPriceId", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${tier}-year`}>Annual Price ID</Label>
                <Input
                  id={`${tier}-year`}
                  placeholder="price_xxx"
                  value={form.yearPriceId}
                  onChange={(e) =>
                    handleChange(tier, "yearPriceId", e.target.value)
                  }
                />
              </div>

              <Button
                className="w-full"
                onClick={() => saveMutation.mutate({ tier, form })}
                disabled={saveMutation.isPending || !isConfigured(form)}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function AdminStripeProductsPage() {
  const query = useApiQuery<StripeProductMapping[]>(
    ["admin-stripe-products"],
    getStripeProducts,
  );

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Stripe Products"
        description="Map Stripe Product and Price IDs to subscription tiers. Get these IDs from your Stripe Dashboard."
      />

      <QueryBoundary
        query={query}
        loadingFallback={<StripeProductsLoadingSkeleton />}
      >
        {(products) => <StripeProductsContent initialProducts={products} />}
      </QueryBoundary>
    </div>
  );
}
