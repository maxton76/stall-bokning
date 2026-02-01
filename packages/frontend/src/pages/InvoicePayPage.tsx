import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { CreditCard, Loader2, ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { formatOre } from "@/utils/money";
import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys } from "@/lib/queryClient";
import {
  createInvoiceCheckout,
  getInvoicePaymentStatus,
  type PaymentStatusResponse,
} from "@/services/invoicePaymentService";

export default function InvoicePayPage() {
  const { t } = useTranslation(["payments", "invoices", "common"]);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const { organizationId, invoiceId } = useParams<{
    organizationId: string;
    invoiceId: string;
  }>();

  const [paying, setPaying] = useState(false);

  const orgId = organizationId || currentOrganization;

  const { data: paymentStatus, isLoading: loading } =
    useApiQuery<PaymentStatusResponse>(
      queryKeys.payments.invoicePaymentStatus(orgId ?? "", invoiceId ?? ""),
      () => getInvoicePaymentStatus(orgId!, invoiceId!),
      {
        enabled: !!orgId && !!invoiceId,
      },
    );

  async function handlePayNow() {
    if (!orgId || !invoiceId) return;

    setPaying(true);
    try {
      const baseUrl = window.location.origin;
      const response = await createInvoiceCheckout(orgId, invoiceId, {
        successUrl: `${baseUrl}/organizations/${orgId}/invoices/${invoiceId}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/organizations/${orgId}/invoices/${invoiceId}/payment-cancel`,
      });

      // Redirect to Stripe Checkout
      window.location.href = response.url;
    } catch (error) {
      console.error("Checkout creation failed:", error);
      toast({
        title: t("common:error"),
        description: t("payments:errors.paymentFailed"),
        variant: "destructive",
      });
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!paymentStatus) {
    return null;
  }

  const isPaid = paymentStatus.invoiceStatus === "paid";

  return (
    <div className="container mx-auto py-6 max-w-lg space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t("payments:invoice.payInvoice")}
          </CardTitle>
          <CardDescription>
            {t("payments:checkout.securePayment")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Invoice summary */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t("payments:invoice.invoiceNumber")}
              </span>
              <span className="font-medium">{invoiceId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t("payments:invoice.amount")}
              </span>
              <span className="font-medium">
                {formatOre(paymentStatus.total, paymentStatus.currency)}
              </span>
            </div>
            {paymentStatus.amountPaid > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("invoices:fields.amountPaid")}
                </span>
                <span className="font-medium text-green-600">
                  {formatOre(paymentStatus.amountPaid, paymentStatus.currency)}
                </span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>{t("invoices:fields.amountDue")}</span>
              <span>
                {formatOre(paymentStatus.amountDue, paymentStatus.currency)}
              </span>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex justify-center">
            <Badge variant={isPaid ? "default" : "secondary"}>
              {t(`payments:status.${paymentStatus.invoiceStatus}`)}
            </Badge>
          </div>

          {/* Payment button */}
          {!isPaid && paymentStatus.amountDue > 0 && (
            <Button
              onClick={handlePayNow}
              disabled={paying}
              className="w-full"
              size="lg"
            >
              {paying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("payments:checkout.redirecting")}
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t("payments:checkout.payNow")} -{" "}
                  {formatOre(paymentStatus.amountDue, paymentStatus.currency)}
                </>
              )}
            </Button>
          )}

          {isPaid && (
            <div className="text-center text-green-600 font-medium">
              {t("payments:checkout.success")}
            </div>
          )}

          {/* Previous payments */}
          {paymentStatus.payments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                {t("payments:history.title")}
              </h3>
              {paymentStatus.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex justify-between text-sm p-2 bg-muted rounded"
                >
                  <span>{formatOre(payment.amount, payment.currency)}</span>
                  <Badge
                    variant={
                      payment.status === "succeeded" ? "default" : "secondary"
                    }
                  >
                    {t(`payments:status.${payment.status}`)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
