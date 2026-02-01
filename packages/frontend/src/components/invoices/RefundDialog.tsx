import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { cacheInvalidation } from "@/lib/queryClient";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { createRefund } from "@/services/paymentService";
import { formatOre, oreToSek, sekToOre } from "@/utils/money";

type RefundReason =
  | "duplicate"
  | "fraudulent"
  | "requested_by_customer"
  | "other";

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  invoiceId: string;
  paymentIntentId: string;
  amountPaid: number; // in ore
  alreadyRefunded: number; // in ore
  currency?: string;
}

export function RefundDialog({
  open,
  onOpenChange,
  organizationId,
  invoiceId,
  paymentIntentId,
  amountPaid,
  alreadyRefunded,
  currency = "SEK",
}: RefundDialogProps) {
  const { t } = useTranslation(["payments", "common"]);
  const { toast } = useToast();

  const maxRefundable = amountPaid - alreadyRefunded;

  const [refundType, setRefundType] = useState<"full" | "partial">("full");
  const [partialAmountSek, setPartialAmountSek] = useState("");
  const [reason, setReason] = useState<RefundReason>("requested_by_customer");

  const refundMutation = useMutation({
    mutationFn: async () => {
      const refundAmountOre =
        refundType === "full"
          ? undefined
          : sekToOre(parseFloat(partialAmountSek));

      return createRefund(organizationId, {
        paymentIntentId,
        amount: refundAmountOre,
        reason,
      });
    },
    onSuccess: async () => {
      toast({ title: t("payments:refund.success") });
      await Promise.all([
        cacheInvalidation.invoices.all(),
        cacheInvalidation.payments.byOrganization(organizationId),
      ]);
      resetAndClose();
    },
    onError: () => {
      toast({
        title: t("payments:refund.failed"),
        variant: "destructive",
      });
    },
  });

  function resetAndClose() {
    setRefundType("full");
    setPartialAmountSek("");
    setReason("requested_by_customer");
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (refundType === "partial") {
      const parsedAmount = parseFloat(partialAmountSek);
      if (isNaN(parsedAmount) || parsedAmount <= 0) return;
      if (sekToOre(parsedAmount) > maxRefundable) return;
    }

    refundMutation.mutate();
  }

  const isPartialValid =
    refundType === "full" ||
    (partialAmountSek !== "" &&
      !isNaN(parseFloat(partialAmountSek)) &&
      parseFloat(partialAmountSek) > 0 &&
      sekToOre(parseFloat(partialAmountSek)) <= maxRefundable);

  const canSubmit = isPartialValid && !refundMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("payments:refund.create")}</DialogTitle>
          <DialogDescription>{t("payments:refund.title")}</DialogDescription>
        </DialogHeader>

        {/* Payment summary */}
        <div className="rounded-lg bg-muted p-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t("payments:invoice.amount")}
            </span>
            <span className="font-medium">
              {formatOre(amountPaid, currency)}
            </span>
          </div>
          {alreadyRefunded > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t("payments:status.partially_refunded")}
              </span>
              <span className="text-amber-600">
                -{formatOre(alreadyRefunded, currency)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm font-medium border-t pt-2 mt-2">
            <span>{t("payments:refund.amount")}</span>
            <span>
              {refundType === "full"
                ? formatOre(maxRefundable, currency)
                : partialAmountSek && !isNaN(parseFloat(partialAmountSek))
                  ? formatOre(sekToOre(parseFloat(partialAmountSek)), currency)
                  : formatOre(0, currency)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full vs Partial */}
          <div className="space-y-3">
            <Label>{t("payments:refund.amount")}</Label>
            <RadioGroup
              value={refundType}
              onValueChange={(val) => setRefundType(val as "full" | "partial")}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full" id="refund-full" />
                <Label
                  htmlFor="refund-full"
                  className="font-normal cursor-pointer"
                >
                  {t("payments:refund.fullRefund")} (
                  {formatOre(maxRefundable, currency)})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="partial" id="refund-partial" />
                <Label
                  htmlFor="refund-partial"
                  className="font-normal cursor-pointer"
                >
                  {t("payments:refund.partialRefund")}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Partial amount input */}
          {refundType === "partial" && (
            <div className="space-y-2">
              <Label htmlFor="partial-amount">
                {t("payments:refund.amount")} ({currency})
              </Label>
              <Input
                id="partial-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={oreToSek(maxRefundable)}
                value={partialAmountSek}
                onChange={(e) => setPartialAmountSek(e.target.value)}
                placeholder={`0.00 - ${oreToSek(maxRefundable).toFixed(2)}`}
                autoFocus
              />
              {partialAmountSek &&
                !isNaN(parseFloat(partialAmountSek)) &&
                sekToOre(parseFloat(partialAmountSek)) > maxRefundable && (
                  <p className="text-sm text-red-500">
                    {t("payments:errors.invalidAmount")}
                  </p>
                )}
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label>{t("payments:refund.reason")}</Label>
            <Select
              value={reason}
              onValueChange={(val) => setReason(val as RefundReason)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="requested_by_customer">
                  {t("payments:refund.reasons.requested_by_customer")}
                </SelectItem>
                <SelectItem value="duplicate">
                  {t("payments:refund.reasons.duplicate")}
                </SelectItem>
                <SelectItem value="fraudulent">
                  {t("payments:refund.reasons.fraudulent")}
                </SelectItem>
                <SelectItem value="other">
                  {t("payments:refund.reasons.other")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={resetAndClose}
              disabled={refundMutation.isPending}
            >
              {t("common:actions.cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={!canSubmit}>
              {refundMutation.isPending
                ? t("common:actions.saving")
                : t("payments:refund.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
