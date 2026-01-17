import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import {
  Send,
  CreditCard,
  Ban,
  FileText,
  User,
  Calendar,
  Receipt,
} from "lucide-react";
import { toDate } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, getStatusColor } from "@/services/invoiceService";
import type { Invoice } from "@stall-bokning/shared";

interface InvoiceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  onSend: (invoice: Invoice) => void;
  onRecordPayment: (invoice: Invoice) => void;
  onCancel: (invoice: Invoice) => void;
}

export function InvoiceDetailDialog({
  open,
  onOpenChange,
  invoice,
  onSend,
  onRecordPayment,
  onCancel,
}: InvoiceDetailDialogProps) {
  const { t, i18n } = useTranslation(["invoices", "common"]);
  const locale = i18n.language === "sv" ? sv : enUS;

  if (!invoice) return null;

  const canSend = ["draft", "pending"].includes(invoice.status);
  const canRecordPayment = !["paid", "cancelled", "void"].includes(
    invoice.status,
  );
  const canCancel = !["paid", "cancelled", "void"].includes(invoice.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-muted-foreground" />
              <div>
                <DialogTitle className="text-xl">
                  {invoice.invoiceNumber}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {invoice.contactName}
                </p>
              </div>
            </div>
            <Badge variant={getStatusColor(invoice.status)} className="text-sm">
              {t(`invoices:status.${invoice.status}`)}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-4">
            {/* Header Info */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{t("invoices:fields.contact")}</span>
                </div>
                <p className="font-medium">{invoice.contactName}</p>
                {invoice.contactEmail && (
                  <p className="text-sm text-muted-foreground">
                    {invoice.contactEmail}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{t("invoices:fields.issueDate")}</span>
                </div>
                <p className="font-medium">
                  {format(toDate(invoice.issueDate), "PP", { locale })}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{t("invoices:fields.dueDate")}</span>
                </div>
                <p className="font-medium">
                  {format(toDate(invoice.dueDate), "PP", { locale })}
                </p>
              </div>
            </div>

            <Separator />

            {/* Line Items */}
            <div>
              <h3 className="font-semibold mb-3">
                {t("invoices:fields.items")}
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("invoices:item.description")}</TableHead>
                    <TableHead>{t("invoices:item.type")}</TableHead>
                    <TableHead className="text-right">
                      {t("invoices:item.quantity")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("invoices:item.unitPrice")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("invoices:item.vatRate")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("invoices:item.lineTotal")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item, index) => (
                    <TableRow key={item.id || index}>
                      <TableCell>
                        <span className="font-medium">{item.description}</span>
                        {item.horseName && (
                          <span className="block text-xs text-muted-foreground">
                            {item.horseName}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {t(`invoices:itemTypes.${item.itemType}`)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity}{" "}
                        {item.unit &&
                          t(`invoices:units.${item.unit}`, item.unit)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unitPrice, invoice.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.vatRate}%
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.lineTotal, invoice.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("invoices:fields.subtotal")}
                  </span>
                  <span>
                    {formatCurrency(invoice.subtotal, invoice.currency)}
                  </span>
                </div>
                {invoice.vatBreakdown.map((vat, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("invoices:fields.vat")} ({vat.rate}%)
                    </span>
                    <span>
                      {formatCurrency(vat.vatAmount, invoice.currency)}
                    </span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>{t("invoices:fields.total")}</span>
                  <span>{formatCurrency(invoice.total, invoice.currency)}</span>
                </div>
                {invoice.amountPaid > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>{t("invoices:fields.amountPaid")}</span>
                      <span>
                        -{formatCurrency(invoice.amountPaid, invoice.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-amber-600">
                      <span>{t("invoices:fields.amountDue")}</span>
                      <span>
                        {formatCurrency(invoice.amountDue, invoice.currency)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Payments */}
            {invoice.payments && invoice.payments.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    {t("invoices:payment.title")}
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("invoices:payment.paidAt")}</TableHead>
                        <TableHead>{t("invoices:payment.method")}</TableHead>
                        <TableHead>{t("invoices:payment.reference")}</TableHead>
                        <TableHead className="text-right">
                          {t("invoices:payment.amount")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {format(toDate(payment.paidAt), "PP", { locale })}
                          </TableCell>
                          <TableCell>
                            {t(`invoices:paymentMethods.${payment.method}`)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {payment.reference || "-"}
                          </TableCell>
                          <TableCell className="text-right text-green-600 font-medium">
                            {formatCurrency(payment.amount, invoice.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}

            {/* Notes */}
            {(invoice.customerNotes || invoice.internalNotes) && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  {invoice.customerNotes && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">
                        {t("invoices:fields.customerNotes")}
                      </h4>
                      <p className="text-sm">{invoice.customerNotes}</p>
                    </div>
                  )}
                  {invoice.internalNotes && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">
                        {t("invoices:fields.internalNotes")}
                      </h4>
                      <p className="text-sm italic">{invoice.internalNotes}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          {canSend && (
            <Button
              variant="outline"
              onClick={() => {
                onSend(invoice);
                onOpenChange(false);
              }}
            >
              <Send className="mr-2 h-4 w-4" />
              {t("invoices:actions.send")}
            </Button>
          )}
          {canRecordPayment && (
            <Button
              onClick={() => {
                onRecordPayment(invoice);
                onOpenChange(false);
              }}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {t("invoices:actions.recordPayment")}
            </Button>
          )}
          {canCancel && (
            <Button
              variant="destructive"
              onClick={() => {
                onCancel(invoice);
                onOpenChange(false);
              }}
            >
              <Ban className="mr-2 h-4 w-4" />
              {t("invoices:actions.cancel")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
