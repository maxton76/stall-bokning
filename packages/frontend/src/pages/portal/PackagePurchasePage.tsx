import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Package, Loader2, ShoppingCart } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys } from "@/lib/queryClient";
import { apiClient } from "@/lib/apiClient";
import { formatOre } from "@/utils/money";
import type { PackageDefinition } from "@equiduty/shared";

interface PortalPackagesResponse {
  packages: PackageDefinition[];
}

interface PurchaseResponse {
  checkoutUrl: string;
}

export default function PackagePurchasePage() {
  const { t } = useTranslation(["payments", "common"]);
  const { toast } = useToast();
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const {
    data: packagesResponse,
    isLoading,
    error,
  } = useApiQuery<PortalPackagesResponse>(
    [...queryKeys.portal.all, "packages"],
    () => apiClient.get<PortalPackagesResponse>("/portal/packages"),
  );

  const packages = packagesResponse?.packages ?? [];

  async function handlePurchase(packageId: string) {
    setPurchasingId(packageId);
    try {
      const response = await apiClient.post<PurchaseResponse>(
        `/portal/packages/${packageId}/purchase`,
      );

      toast({
        title: t("payments:packages.purchaseSuccess"),
      });

      // Redirect to Stripe Checkout
      window.location.href = response.checkoutUrl;
    } catch (err) {
      toast({
        title: t("payments:packages.purchaseFailed"),
        description:
          err instanceof Error ? err.message : t("common:errors.unknown"),
        variant: "destructive",
      });
      setPurchasingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("payments:packages.title")}
        </h1>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            {error.message}
          </CardContent>
        </Card>
      )}

      {/* Empty */}
      {!isLoading && !error && packages.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              {t("payments:packages.noPackages")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Package Cards */}
      {!isLoading && packages.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <Card key={pkg.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">{pkg.name}</CardTitle>
                {pkg.description && (
                  <CardDescription>{pkg.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <div className="text-2xl font-bold">{formatOre(pkg.price)}</div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {t("payments:packages.units", { count: pkg.totalUnits })}
                  </Badge>
                  {pkg.validityDays ? (
                    <Badge variant="outline">
                      {t("payments:packages.validFor", {
                        days: pkg.validityDays,
                      })}
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      {t("payments:packages.noExpiry")}
                    </Badge>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={purchasingId !== null}
                >
                  {purchasingId === pkg.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("payments:checkout.processing")}
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      {t("payments:packages.buyNow")}
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
