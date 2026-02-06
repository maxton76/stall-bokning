import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import {
  Package,
  Search,
  AlertTriangle,
  UserX,
  Calendar,
  Ticket,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys } from "@/lib/queryClient";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import {
  getMyPackages,
  type MyPackagesResponse,
} from "@/services/packageService";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = ["all", "active", "expired", "depleted"] as const;

const getStatusVariant = (
  status: string,
): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "active":
      return "default";
    case "expired":
      return "destructive";
    case "depleted":
      return "secondary";
    default:
      return "outline";
  }
};

export default function MyPackagesPage() {
  const { t, i18n } = useTranslation(["common"]);
  const locale = i18n.language === "sv" ? sv : enUS;
  const { currentOrganizationId } = useOrganizationContext();
  const organizationId = currentOrganizationId;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const packagesQuery = useApiQuery<MyPackagesResponse>(
    queryKeys.memberPackages.my(
      organizationId ?? "",
      statusFilter !== "all" ? statusFilter : undefined,
    ),
    () =>
      getMyPackages(organizationId!, {
        status: statusFilter !== "all" ? statusFilter : undefined,
        limit: 50,
      }),
    { enabled: !!organizationId },
  );

  const packagesData = packagesQuery.data;
  const isLoading = packagesQuery.isLoading;

  // Filter packages by search
  const filteredPackages = useMemo(() => {
    if (!packagesData?.packages) return [];
    if (!searchQuery) return packagesData.packages;

    const query = searchQuery.toLowerCase();
    return packagesData.packages.filter((pkg) =>
      pkg.packageName.toLowerCase().includes(query),
    );
  }, [packagesData?.packages, searchQuery]);

  // Summary calculations
  const summary = useMemo(() => {
    if (!packagesData?.packages) {
      return { activeCount: 0, totalRemaining: 0, expiringSoonCount: 0 };
    }

    return packagesData.packages.reduce(
      (acc, pkg) => {
        if (pkg.status === "active") {
          acc.activeCount++;
          acc.totalRemaining += pkg.remainingUnits;
          if (pkg.daysUntilExpiry !== null && pkg.daysUntilExpiry < 30) {
            acc.expiringSoonCount++;
          }
        }
        return acc;
      },
      { activeCount: 0, totalRemaining: 0, expiringSoonCount: 0 },
    );
  }, [packagesData?.packages]);

  // No member state
  if (!isLoading && packagesData?.memberId === null) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">
            {t("common:myPage.packages.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("common:myPage.packages.subtitle")}
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <UserX className="h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-medium">
              {t("common:myPage.packages.noMember")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("common:myPage.packages.noMemberDescription")}
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
        <h1 className="text-2xl font-bold">
          {t("common:myPage.packages.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("common:myPage.packages.subtitle")}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {t("common:myPage.packages.activePackages")}
            </CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                summary.activeCount
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {t("common:myPage.packages.remainingUnits")}
            </CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                summary.totalRemaining
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card
          className={cn(
            summary.expiringSoonCount > 0 && "border-amber-200 bg-amber-50",
          )}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              {summary.expiringSoonCount > 0 && (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              )}
              <CardDescription>
                {t("common:myPage.packages.expiringSoon")}
              </CardDescription>
            </div>
            <CardTitle className="text-2xl text-amber-600">
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                summary.expiringSoonCount
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common:search.placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("common:labels.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {status === "all"
                  ? t("common:labels.allStatuses")
                  : t(`common:labels.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Packages Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredPackages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Package className="h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-medium">
              {searchQuery
                ? t("common:messages.noResults")
                : t("common:myPage.packages.noPackages")}
            </p>
            {!searchQuery && (
              <p className="text-sm text-muted-foreground">
                {t("common:myPage.packages.noPackagesDescription")}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPackages.map((pkg) => {
            const progressPercentage =
              (pkg.remainingUnits / pkg.totalUnits) * 100;
            const showExpiryWarning =
              pkg.daysUntilExpiry !== null && pkg.daysUntilExpiry < 30;

            return (
              <Card
                key={pkg.id}
                className={cn(
                  pkg.isExpired && "border-red-200 bg-red-50",
                  showExpiryWarning && !pkg.isExpired && "border-amber-200",
                )}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg">
                        {pkg.packageName}
                      </CardTitle>
                      {pkg.packageDescription && (
                        <CardDescription className="text-xs line-clamp-2">
                          {pkg.packageDescription}
                        </CardDescription>
                      )}
                    </div>
                    <Badge variant={getStatusVariant(pkg.status)}>
                      {pkg.isExpired
                        ? t("common:myPage.packages.expired")
                        : pkg.status === "depleted"
                          ? t("common:myPage.packages.depleted")
                          : t(`common:labels.${pkg.status}`)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Ticket className="h-3 w-3" />
                        {t("common:myPage.packages.unitsRemaining", {
                          remaining: pkg.remainingUnits,
                          total: pkg.totalUnits,
                        })}
                      </span>
                      <span className="font-medium">
                        {Math.round(progressPercentage)}%
                      </span>
                    </div>
                    <Progress
                      value={progressPercentage}
                      className={cn(
                        pkg.isExpired && "[&>div]:bg-red-500",
                        pkg.status === "depleted" && "[&>div]:bg-gray-400",
                      )}
                    />
                  </div>

                  {/* Expiry Info */}
                  {pkg.expiresAt && (
                    <div
                      className={cn(
                        "flex items-center gap-2 text-sm",
                        pkg.isExpired && "text-red-600",
                        showExpiryWarning && !pkg.isExpired && "text-amber-600",
                      )}
                    >
                      <Calendar className="h-3 w-3" />
                      {pkg.isExpired ? (
                        <span className="font-medium">
                          {t("common:myPage.packages.expired")}
                        </span>
                      ) : pkg.daysUntilExpiry !== null ? (
                        <span>
                          {t("common:myPage.packages.daysUntilExpiry", {
                            days: pkg.daysUntilExpiry,
                          })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {t("common:myPage.packages.expiresOn", {
                            date: format(new Date(pkg.expiresAt), "PP", {
                              locale,
                            }),
                          })}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Purchase Date */}
                  <div className="text-xs text-muted-foreground">
                    {t("common:labels.purchased")}:{" "}
                    {format(new Date(pkg.purchaseDate), "PP", { locale })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
