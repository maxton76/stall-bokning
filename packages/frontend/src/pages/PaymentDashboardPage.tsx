import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import {
  DollarSign,
  ArrowDownLeft,
  TrendingUp,
  Percent,
  CalendarDays,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys } from "@/lib/queryClient";
import { useOrganization } from "@/contexts/OrganizationContext";
import { formatOre } from "@/utils/money";
import {
  getPaymentAnalytics,
  type PaymentDashboardData,
} from "@/services/paymentDashboardService";

type PeriodPreset = "this_month" | "last_month" | "last_3_months" | "custom";

function getDateRange(preset: PeriodPreset): { start: string; end: string } {
  const now = new Date();
  switch (preset) {
    case "this_month":
      return {
        start: format(startOfMonth(now), "yyyy-MM-dd"),
        end: format(endOfMonth(now), "yyyy-MM-dd"),
      };
    case "last_month": {
      const lastMonth = subMonths(now, 1);
      return {
        start: format(startOfMonth(lastMonth), "yyyy-MM-dd"),
        end: format(endOfMonth(lastMonth), "yyyy-MM-dd"),
      };
    }
    case "last_3_months": {
      const threeMonthsAgo = subMonths(now, 3);
      return {
        start: format(startOfMonth(threeMonthsAgo), "yyyy-MM-dd"),
        end: format(endOfMonth(now), "yyyy-MM-dd"),
      };
    }
    default:
      return {
        start: format(startOfMonth(now), "yyyy-MM-dd"),
        end: format(endOfMonth(now), "yyyy-MM-dd"),
      };
  }
}

function getStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "succeeded":
      return "default";
    case "failed":
    case "cancelled":
      return "destructive";
    case "processing":
    case "requires_action":
      return "secondary";
    default:
      return "outline";
  }
}

export default function PaymentDashboardPage() {
  const { t, i18n } = useTranslation(["payments", "common"]);
  const { currentOrganizationId } = useOrganization();
  const dateLocale = i18n.language === "sv" ? sv : enUS;

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const dateRange = useMemo(() => {
    if (periodPreset === "custom" && customStart && customEnd) {
      return { start: customStart, end: customEnd };
    }
    return getDateRange(periodPreset);
  }, [periodPreset, customStart, customEnd]);

  const {
    data: analytics,
    isLoading,
    error,
  } = useApiQuery<PaymentDashboardData>(
    [
      ...queryKeys.payments.byOrganization(currentOrganizationId ?? ""),
      "analytics",
      dateRange.start,
      dateRange.end,
    ],
    () =>
      getPaymentAnalytics(
        currentOrganizationId!,
        dateRange.start,
        dateRange.end,
      ),
    { enabled: !!currentOrganizationId },
  );

  if (!currentOrganizationId) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("payments:dashboard.title")}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Select
            value={periodPreset}
            onValueChange={(val) => setPeriodPreset(val as PeriodPreset)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("payments:dashboard.period")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">
                {t("payments:dashboard.thisMonth")}
              </SelectItem>
              <SelectItem value="last_month">
                {t("payments:dashboard.lastMonth")}
              </SelectItem>
              <SelectItem value="last_3_months">
                {t("payments:dashboard.last3Months")}
              </SelectItem>
              <SelectItem value="custom">
                {t("payments:dashboard.custom")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Custom date range */}
      {periodPreset === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="w-auto"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="w-auto"
          />
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title={t("payments:dashboard.totalRevenue")}
          value={isLoading ? undefined : (analytics?.summary.totalAmount ?? 0)}
          currency={analytics?.summary.currency}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
        />
        <SummaryCard
          title={t("payments:dashboard.totalRefunds")}
          value={
            isLoading ? undefined : (analytics?.summary.totalRefundAmount ?? 0)
          }
          currency={analytics?.summary.currency}
          icon={<ArrowDownLeft className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
        />
        <SummaryCard
          title={t("payments:dashboard.netAmount")}
          value={isLoading ? undefined : (analytics?.summary.netAmount ?? 0)}
          currency={analytics?.summary.currency}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
        />
        <SummaryCard
          title={t("payments:dashboard.applicationFees")}
          value={
            isLoading
              ? undefined
              : (analytics?.summary.totalApplicationFees ?? 0)
          }
          currency={analytics?.summary.currency}
          icon={<Percent className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
        />
      </div>

      {error && (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            {error.message}
          </CardContent>
        </Card>
      )}

      {!isLoading && analytics && (
        <>
          {/* Payment Method & Status Breakdown */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* By Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("payments:dashboard.byMethod")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.byPaymentMethod.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("payments:dashboard.noData")}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          {t("payments:paymentMethods.title")}
                        </TableHead>
                        <TableHead className="text-right">#</TableHead>
                        <TableHead className="text-right">
                          {t("payments:invoice.amount")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.byPaymentMethod.map((item) => (
                        <TableRow key={item.method}>
                          <TableCell className="capitalize">
                            {t(
                              `payments:paymentMethods.${item.method}`,
                              item.method,
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.count}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatOre(item.amount, analytics.summary.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* By Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("payments:dashboard.byStatus")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.byStatus.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("payments:dashboard.noData")}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("common:status")}</TableHead>
                        <TableHead className="text-right">#</TableHead>
                        <TableHead className="text-right">
                          {t("payments:invoice.amount")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.byStatus.map((item) => (
                        <TableRow key={item.status}>
                          <TableCell>
                            <Badge variant={getStatusVariant(item.status)}>
                              {t(`payments:status.${item.status}`, item.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {item.count}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatOre(item.amount, analytics.summary.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Daily Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("payments:dashboard.dailyTrend")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.dailyTrend.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("payments:dashboard.noData")}
                </p>
              ) : (
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("common:date")}</TableHead>
                        <TableHead className="text-right">#</TableHead>
                        <TableHead className="text-right">
                          {t("payments:invoice.amount")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.dailyTrend.map((day) => (
                        <TableRow key={day.date}>
                          <TableCell>
                            {format(new Date(day.date), "d MMM yyyy", {
                              locale: dateLocale,
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            {day.count}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatOre(day.amount, analytics.summary.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("payments:dashboard.recentPayments")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.recentPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("payments:dashboard.noData")}
                </p>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>{t("payments:invoice.amount")}</TableHead>
                        <TableHead>{t("common:status")}</TableHead>
                        <TableHead>{t("common:contact")}</TableHead>
                        <TableHead>
                          {t("payments:invoice.invoiceNumber")}
                        </TableHead>
                        <TableHead>
                          {t("payments:paymentMethods.title")}
                        </TableHead>
                        <TableHead>{t("common:date")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.recentPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono text-xs">
                            {payment.id.slice(-8)}
                          </TableCell>
                          <TableCell>
                            {formatOre(payment.amount, payment.currency)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(payment.status)}>
                              {t(
                                `payments:status.${payment.status}`,
                                payment.status,
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>{payment.contactName ?? "-"}</TableCell>
                          <TableCell>{payment.invoiceNumber ?? "-"}</TableCell>
                          <TableCell className="capitalize">
                            {payment.paymentMethodType
                              ? t(
                                  `payments:paymentMethods.${payment.paymentMethodType}`,
                                  payment.paymentMethodType,
                                )
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {format(
                              new Date(payment.createdAt),
                              "d MMM yyyy HH:mm",
                              { locale: dateLocale },
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// -- Summary Card subcomponent --

interface SummaryCardProps {
  title: string;
  value?: number;
  currency?: string;
  icon: React.ReactNode;
  isLoading: boolean;
}

function SummaryCard({
  title,
  value,
  currency = "SEK",
  icon,
  isLoading,
}: SummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <div className="text-2xl font-bold">
            {formatOre(value ?? 0, currency)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
