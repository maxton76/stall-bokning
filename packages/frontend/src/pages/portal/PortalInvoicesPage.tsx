import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import {
  FileText,
  Search,
  AlertTriangle,
  CreditCard,
  ExternalLink,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys } from "@/lib/queryClient";
import {
  getPortalInvoices,
  formatCurrency,
  getInvoiceStatusVariant,
  type PortalInvoicesResponse,
} from "@/services/portalService";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  "all",
  "sent",
  "pending",
  "paid",
  "partially_paid",
  "overdue",
] as const;

export default function PortalInvoicesPage() {
  const { t, i18n } = useTranslation(["portal", "invoices", "common"]);
  const locale = i18n.language === "sv" ? sv : enUS;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const invoicesQuery = useApiQuery<PortalInvoicesResponse>(
    queryKeys.portal.invoices(
      statusFilter !== "all" ? statusFilter : undefined,
    ),
    () =>
      getPortalInvoices({
        status: statusFilter !== "all" ? statusFilter : undefined,
        limit: 50,
      }),
    { staleTime: 5 * 60 * 1000 },
  );
  const invoicesData = invoicesQuery.data;
  const invoicesLoading = invoicesQuery.isLoading;

  // Filter invoices by search
  const filteredInvoices = useMemo(() => {
    if (!invoicesData?.invoices) return [];
    if (!searchQuery) return invoicesData.invoices;

    const query = searchQuery.toLowerCase();
    return invoicesData.invoices.filter(
      (invoice) =>
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        invoice.horsesIncluded?.some((h) => h.toLowerCase().includes(query)),
    );
  }, [invoicesData?.invoices, searchQuery]);

  // Summary calculations
  const summary = useMemo(() => {
    if (!invoicesData?.invoices) {
      return { totalDue: 0, overdueCount: 0 };
    }

    return invoicesData.invoices.reduce(
      (acc, inv) => {
        if (!["paid", "cancelled"].includes(inv.status)) {
          acc.totalDue += inv.amountDue;
          if (inv.isOverdue) acc.overdueCount++;
        }
        return acc;
      },
      { totalDue: 0, overdueCount: 0 },
    );
  }, [invoicesData?.invoices]);

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("portal:invoices.title")}</h1>
        <p className="text-muted-foreground">
          {t("portal:invoices.pageDescription")}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("portal:invoices.totalDue")}</CardDescription>
            <CardTitle className="text-2xl text-amber-600">
              {invoicesLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                formatCurrency(summary.totalDue)
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card
          className={cn(summary.overdueCount > 0 && "border-red-200 bg-red-50")}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              {summary.overdueCount > 0 && (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <CardDescription>{t("portal:invoices.overdue")}</CardDescription>
            </div>
            <CardTitle className="text-2xl text-red-600">
              {invoicesLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                summary.overdueCount
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
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
            <SelectValue placeholder={t("invoices:filters.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {status === "all"
                  ? t("invoices:filters.allStatuses")
                  : t(`invoices:status.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("invoices:fields.invoiceNumber")}</TableHead>
                <TableHead>{t("invoices:fields.issueDate")}</TableHead>
                <TableHead>{t("invoices:fields.dueDate")}</TableHead>
                <TableHead className="text-right">
                  {t("invoices:fields.total")}
                </TableHead>
                <TableHead className="text-right">
                  {t("invoices:fields.amountDue")}
                </TableHead>
                <TableHead>{t("common:labels.status")}</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoicesLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {searchQuery
                          ? t("common:messages.noResults")
                          : t("portal:invoices.noInvoices")}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>
                      {format(new Date(invoice.issueDate), "PP", { locale })}
                    </TableCell>
                    <TableCell
                      className={cn(invoice.isOverdue && "text-red-600")}
                    >
                      {format(new Date(invoice.dueDate), "PP", { locale })}
                      {invoice.isOverdue && (
                        <span className="ml-1 text-xs">
                          (
                          {t("portal:invoices.daysOverdue", {
                            days: invoice.daysOverdue,
                          })}
                          )
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {invoice.amountDue > 0 ? (
                        <span className="text-amber-600">
                          {formatCurrency(invoice.amountDue, invoice.currency)}
                        </span>
                      ) : (
                        <span className="text-green-600">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getInvoiceStatusVariant(invoice.status)}>
                        {t(`invoices:status.${invoice.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link to={`/portal/invoices/${invoice.id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {invoice.canPayOnline && invoice.amountDue > 0 && (
                          <a
                            href={invoice.stripeInvoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="icon">
                              <CreditCard className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
