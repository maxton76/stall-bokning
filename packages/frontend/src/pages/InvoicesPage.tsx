import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import {
  Plus,
  FileText,
  AlertTriangle,
  Search,
  MoreHorizontal,
  Send,
  CreditCard,
  Ban,
  Eye,
  Trash2,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  getOrganizationInvoices,
  getOverdueInvoices,
  sendInvoice,
  cancelInvoice,
  deleteInvoice,
  formatCurrency,
  getStatusColor,
} from "@/services/invoiceService";
import { CreateInvoiceDialog } from "@/components/invoices/CreateInvoiceDialog";
import { RecordPaymentDialog } from "@/components/invoices/RecordPaymentDialog";
import { InvoiceDetailDialog } from "@/components/invoices/InvoiceDetailDialog";
import type { Invoice, InvoiceStatus } from "@stall-bokning/shared";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: InvoiceStatus[] = [
  "draft",
  "pending",
  "sent",
  "paid",
  "partially_paid",
  "overdue",
  "cancelled",
];

export default function InvoicesPage() {
  const { t, i18n } = useTranslation(["invoices", "common"]);
  const { toast } = useToast();
  const { selectedOrganization } = useOrganization();
  const locale = i18n.language === "sv" ? sv : enUS;

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">(
    "all",
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Data
  const invoices = useAsyncData<Invoice[]>({
    loadFn: async () => {
      if (!selectedOrganization?.id) return [];
      return getOrganizationInvoices(
        selectedOrganization.id,
        statusFilter !== "all" ? { status: statusFilter } : undefined,
      );
    },
  });

  const overdueData = useAsyncData<{
    count: number;
    totalOverdue: number;
    currency: string;
    invoices: (Invoice & { daysOverdue: number })[];
  }>({
    loadFn: async () => {
      if (!selectedOrganization?.id)
        return { count: 0, totalOverdue: 0, currency: "SEK", invoices: [] };
      return getOverdueInvoices(selectedOrganization.id);
    },
  });

  // Load data when organization changes
  useEffect(() => {
    if (selectedOrganization?.id) {
      invoices.load();
      overdueData.load();
    }
  }, [selectedOrganization?.id, statusFilter]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    if (!invoices.data) return [];
    if (!searchQuery) return invoices.data;

    const query = searchQuery.toLowerCase();
    return invoices.data.filter(
      (invoice) =>
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        invoice.contactName.toLowerCase().includes(query),
    );
  }, [invoices.data, searchQuery]);

  // Summary calculations
  const summary = useMemo(() => {
    if (!invoices.data) {
      return { totalInvoiced: 0, totalPaid: 0, totalOutstanding: 0, count: 0 };
    }

    return invoices.data.reduce(
      (acc, inv) => {
        if (!["cancelled", "void"].includes(inv.status)) {
          acc.totalInvoiced += inv.total;
          acc.totalPaid += inv.amountPaid;
          acc.totalOutstanding += inv.amountDue;
          acc.count++;
        }
        return acc;
      },
      { totalInvoiced: 0, totalPaid: 0, totalOutstanding: 0, count: 0 },
    );
  }, [invoices.data]);

  // Actions
  const handleSend = async (invoice: Invoice) => {
    try {
      await sendInvoice(invoice.id);
      toast({ title: t("invoices:messages.sendSuccess") });
      invoices.load();
    } catch {
      toast({ title: t("invoices:errors.sendFailed"), variant: "destructive" });
    }
  };

  const handleCancel = async (invoice: Invoice) => {
    try {
      await cancelInvoice(invoice.id);
      toast({ title: t("invoices:messages.cancelSuccess") });
      invoices.load();
      overdueData.load();
    } catch {
      toast({ title: t("common:errors.generic"), variant: "destructive" });
    }
  };

  const handleDelete = async (invoice: Invoice) => {
    try {
      await deleteInvoice(invoice.id);
      toast({ title: t("invoices:messages.deleteSuccess") });
      invoices.load();
    } catch {
      toast({ title: t("common:errors.generic"), variant: "destructive" });
    }
  };

  const handleRecordPayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentDialogOpen(true);
  };

  const handleViewDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDetailDialogOpen(true);
  };

  const handleRefresh = () => {
    invoices.load();
    overdueData.load();
  };

  if (!selectedOrganization) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">
              {t("common:labels.selectStable")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("invoices:title")}</h1>
          <p className="text-muted-foreground">
            {t("invoices:pageDescription")}
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("invoices:createInvoice")}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {t("invoices:summary.totalInvoiced")}
            </CardDescription>
            <CardTitle className="text-2xl">
              {invoices.isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                formatCurrency(summary.totalInvoiced)
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("invoices:summary.totalPaid")}</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {invoices.isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                formatCurrency(summary.totalPaid)
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {t("invoices:summary.totalOutstanding")}
            </CardDescription>
            <CardTitle className="text-2xl text-amber-600">
              {invoices.isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                formatCurrency(summary.totalOutstanding)
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card
          className={cn(
            overdueData.data?.count &&
              overdueData.data.count > 0 &&
              "border-red-200 bg-red-50",
          )}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              {overdueData.data?.count && overdueData.data.count > 0 && (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <CardDescription>
                {t("invoices:summary.totalOverdue")}
              </CardDescription>
            </div>
            <CardTitle className="text-2xl text-red-600">
              {overdueData.isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                formatCurrency(overdueData.data?.totalOverdue || 0)
              )}
            </CardTitle>
            {overdueData.data?.count && overdueData.data.count > 0 && (
              <p className="text-xs text-muted-foreground">
                {overdueData.data.count}{" "}
                {t("invoices:summary.overdueCount").toLowerCase()}
              </p>
            )}
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
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value as InvoiceStatus | "all")
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("invoices:filters.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("invoices:filters.allStatuses")}
            </SelectItem>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`invoices:status.${status}`)}
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
                <TableHead>{t("invoices:fields.contact")}</TableHead>
                <TableHead>{t("invoices:fields.issueDate")}</TableHead>
                <TableHead>{t("invoices:fields.dueDate")}</TableHead>
                <TableHead className="text-right">
                  {t("invoices:fields.total")}
                </TableHead>
                <TableHead className="text-right">
                  {t("invoices:fields.amountDue")}
                </TableHead>
                <TableHead>{t("common:labels.status")}</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {searchQuery
                          ? t("common:messages.noResults")
                          : t("invoices:noInvoices")}
                      </p>
                      {!searchQuery && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCreateDialogOpen(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          {t("invoices:createInvoice")}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>{invoice.contactName}</TableCell>
                    <TableCell>
                      {format(new Date(invoice.issueDate), "PP", { locale })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(invoice.dueDate), "PP", { locale })}
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
                      <Badge variant={getStatusColor(invoice.status)}>
                        {t(`invoices:status.${invoice.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleViewDetails(invoice)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            {t("invoices:actions.viewDetails")}
                          </DropdownMenuItem>

                          {["draft", "pending"].includes(invoice.status) && (
                            <DropdownMenuItem
                              onClick={() => handleSend(invoice)}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              {t("invoices:actions.send")}
                            </DropdownMenuItem>
                          )}

                          {!["paid", "cancelled", "void"].includes(
                            invoice.status,
                          ) && (
                            <DropdownMenuItem
                              onClick={() => handleRecordPayment(invoice)}
                            >
                              <CreditCard className="mr-2 h-4 w-4" />
                              {t("invoices:actions.recordPayment")}
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          {!["paid", "cancelled", "void"].includes(
                            invoice.status,
                          ) && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleCancel(invoice)}
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              {t("invoices:actions.cancel")}
                            </DropdownMenuItem>
                          )}

                          {invoice.status === "draft" && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(invoice)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t("invoices:actions.delete")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateInvoiceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        organizationId={selectedOrganization.id}
        onSuccess={handleRefresh}
      />

      <RecordPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        invoice={selectedInvoice}
        onSuccess={handleRefresh}
      />

      <InvoiceDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        invoice={selectedInvoice}
        onSend={handleSend}
        onRecordPayment={handleRecordPayment}
        onCancel={handleCancel}
      />
    </div>
  );
}
