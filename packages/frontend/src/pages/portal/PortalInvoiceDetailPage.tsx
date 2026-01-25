import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import {
  ChevronLeft,
  FileText,
  Download,
  CreditCard,
  Building,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  TableFooter,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys } from "@/lib/queryClient";
import {
  getPortalInvoiceDetail,
  formatCurrency,
  getInvoiceStatusVariant,
  type PortalInvoiceDetailResponse,
} from "@/services/portalService";
import { cn } from "@/lib/utils";

export default function PortalInvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const { t, i18n } = useTranslation(["portal", "invoices", "common"]);
  const locale = i18n.language === "sv" ? sv : enUS;

  const invoiceQuery = useApiQuery<PortalInvoiceDetailResponse>(
    queryKeys.portal.invoiceDetail(invoiceId || ""),
    () => getPortalInvoiceDetail(invoiceId!),
    { enabled: !!invoiceId, staleTime: 5 * 60 * 1000 },
  );
  const invoiceDataResponse = invoiceQuery.data;
  const invoiceLoading = invoiceQuery.isLoading;
  const invoiceError = invoiceQuery.error;

  if (invoiceLoading) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invoiceError || !invoiceDataResponse) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center gap-4">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              {t("portal:invoices.notFound")}
            </p>
            <Link to="/portal/invoices">
              <Button variant="outline">{t("common:buttons.back")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { invoice: invoiceData, payments } = invoiceDataResponse;

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link to="/portal/invoices">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                {t("portal:invoices.invoice")} {invoiceData.invoiceNumber}
              </h1>
              <Badge variant={getInvoiceStatusVariant(invoiceData.status)}>
                {t(`invoices:status.${invoiceData.status}`)}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {t("portal:invoices.issuedOn", {
                date: format(new Date(invoiceData.issueDate), "PPP", {
                  locale,
                }),
              })}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {invoiceData.pdfUrl && (
            <a
              href={invoiceData.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                {t("portal:invoices.downloadPdf")}
              </Button>
            </a>
          )}
          {invoiceData.canPayOnline && invoiceData.amountDue > 0 && (
            <a
              href={invoiceData.stripeInvoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button>
                <CreditCard className="mr-2 h-4 w-4" />
                {t("portal:invoices.payNow")}
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Invoice Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("portal:invoices.details")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Organization Info */}
            <div className="flex items-start gap-3">
              <Building className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{invoiceData.organizationName}</p>
                {invoiceData.organizationAddress && (
                  <p className="text-sm text-muted-foreground">
                    {invoiceData.organizationAddress}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Invoice Items */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("invoices:fields.description")}</TableHead>
                  <TableHead className="text-right">
                    {t("invoices:fields.quantity")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("invoices:fields.unitPrice")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("invoices:fields.amount")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoiceData.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.description}</p>
                        {item.horseName && (
                          <p className="text-sm text-muted-foreground">
                            {item.horseName}
                          </p>
                        )}
                        {item.periodStart && item.periodEnd && (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(item.periodStart), "PP", {
                              locale,
                            })}{" "}
                            -{" "}
                            {format(new Date(item.periodEnd), "PP", { locale })}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.unitPrice, invoiceData.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(
                        item.quantity * item.unitPrice,
                        invoiceData.currency,
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3}>
                    {t("invoices:fields.subtotal")}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(invoiceData.subtotal, invoiceData.currency)}
                  </TableCell>
                </TableRow>
                {invoiceData.vatBreakdown?.map((vat, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={3}>
                      {t("invoices:fields.vat")} ({vat.rate}%)
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(vat.amount, invoiceData.currency)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} className="font-bold">
                    {t("invoices:fields.total")}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(invoiceData.total, invoiceData.currency)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        {/* Summary Card */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t("portal:invoices.summary")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("invoices:fields.invoiceNumber")}
                </span>
                <span className="font-medium">{invoiceData.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("invoices:fields.issueDate")}
                </span>
                <span className="font-medium">
                  {format(new Date(invoiceData.issueDate), "PP", { locale })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("invoices:fields.dueDate")}
                </span>
                <span
                  className={cn(
                    "font-medium",
                    invoiceData.isOverdue && "text-red-600",
                  )}
                >
                  {format(new Date(invoiceData.dueDate), "PP", { locale })}
                </span>
              </div>

              <Separator />

              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("invoices:fields.total")}
                </span>
                <span className="font-medium">
                  {formatCurrency(invoiceData.total, invoiceData.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("invoices:fields.amountPaid")}
                </span>
                <span className="font-medium text-green-600">
                  {formatCurrency(
                    invoiceData.total - invoiceData.amountDue,
                    invoiceData.currency,
                  )}
                </span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="font-semibold">
                  {t("invoices:fields.amountDue")}
                </span>
                <span
                  className={cn(
                    "font-bold",
                    invoiceData.amountDue > 0
                      ? "text-amber-600"
                      : "text-green-600",
                  )}
                >
                  {formatCurrency(invoiceData.amountDue, invoiceData.currency)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          {payments && payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5" />
                  {t("portal:invoices.paymentHistory")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">
                          {formatCurrency(payment.amount, invoiceData.currency)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(payment.paidAt), "PPp", { locale })}
                        </p>
                      </div>
                      <Badge variant="outline">{payment.method}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
