import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { recordPayment, formatCurrency } from "@/services/invoiceService";
import type { Invoice, PaymentMethod } from "@stall-bokning/shared";
import { cn } from "@/lib/utils";

const PAYMENT_METHODS: PaymentMethod[] = [
  "bank_transfer",
  "swish",
  "card",
  "cash",
  "stripe",
  "other",
];

const recordPaymentSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  method: z.string().min(1, "Payment method is required"),
  reference: z.string().optional(),
  paidAt: z.date(),
  notes: z.string().optional(),
});

type RecordPaymentFormData = z.infer<typeof recordPaymentSchema>;

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  onSuccess: () => void;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  invoice,
  onSuccess,
}: RecordPaymentDialogProps) {
  const { t } = useTranslation(["invoices", "common"]);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RecordPaymentFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(recordPaymentSchema as any),
    defaultValues: {
      amount: invoice?.amountDue || 0,
      method: "bank_transfer",
      reference: "",
      paidAt: new Date(),
      notes: "",
    },
  });

  // Reset form when invoice changes
  if (invoice && form.getValues("amount") !== invoice.amountDue) {
    form.setValue("amount", invoice.amountDue);
  }

  const onSubmit = async (data: RecordPaymentFormData) => {
    if (!invoice) return;

    setIsSubmitting(true);
    try {
      await recordPayment(invoice.id, {
        amount: data.amount,
        method: data.method as PaymentMethod,
        reference: data.reference || undefined,
        paidAt: data.paidAt.toISOString(),
        notes: data.notes || undefined,
      });

      toast({ title: t("invoices:messages.paymentSuccess") });
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch {
      toast({
        title: t("invoices:errors.paymentFailed"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("invoices:dialogs.payment.title")}</DialogTitle>
          <DialogDescription>
            {t("invoices:dialogs.payment.description")}
          </DialogDescription>
        </DialogHeader>

        {/* Invoice Info */}
        <div className="rounded-lg bg-muted p-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t("invoices:fields.invoiceNumber")}
            </span>
            <span className="font-medium">{invoice.invoiceNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t("invoices:fields.contact")}
            </span>
            <span>{invoice.contactName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t("invoices:fields.total")}
            </span>
            <span>{formatCurrency(invoice.total, invoice.currency)}</span>
          </div>
          <div className="flex justify-between text-sm font-medium border-t pt-2 mt-2">
            <span>{t("invoices:fields.amountDue")}</span>
            <span className="text-amber-600">
              {formatCurrency(invoice.amountDue, invoice.currency)}
            </span>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">{t("invoices:payment.amount")} *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={invoice.amountDue}
              {...form.register("amount", { valueAsNumber: true })}
            />
            {form.formState.errors.amount && (
              <p className="text-sm text-red-500">
                {form.formState.errors.amount.message}
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>{t("invoices:payment.method")} *</Label>
            <Select
              value={form.watch("method")}
              onValueChange={(value) => form.setValue("method", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>
                    {t(`invoices:paymentMethods.${method}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label>{t("invoices:payment.paidAt")} *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !form.watch("paidAt") && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.watch("paidAt")
                    ? format(form.watch("paidAt"), "PP")
                    : t("common:labels.select")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={form.watch("paidAt")}
                  onSelect={(date) => date && form.setValue("paidAt", date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Reference */}
          <div className="space-y-2">
            <Label htmlFor="reference">{t("invoices:payment.reference")}</Label>
            <Input
              id="reference"
              {...form.register("reference")}
              placeholder={t("invoices:payment.reference")}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t("invoices:payment.notes")}</Label>
            <Textarea id="notes" {...form.register("notes")} rows={2} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common:actions.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? t("common:actions.saving")
                : t("invoices:actions.recordPayment")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
