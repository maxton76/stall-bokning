import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import {
  CreditCard,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  Lock,
  FileText,
} from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  createCheckoutSession,
  getCheckoutSession,
} from "@/services/paymentService";
import { formatOre } from "@/utils/money";
import {
  getPortalInvoice,
  type FlattenedPortalInvoice,
} from "@/services/portalService";

export default function PortalPaymentPage() {
  const { t, i18n } = useTranslation(["payments", "portal", "common"]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [invoice, setInvoice] = useState<FlattenedPortalInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const locale = i18n.language === "sv" ? sv : enUS;
  const paymentStatus = searchParams.get("status");
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (invoiceId) {
      loadInvoice();
    }
  }, [invoiceId]);

  useEffect(() => {
    // Handle return from Stripe checkout
    if (paymentStatus === "success" && sessionId) {
      handlePaymentSuccess();
    } else if (paymentStatus === "cancelled") {
      toast({
        title: t("payments:checkout.cancelled"),
        description: t("payments:checkout.tryAgain"),
        variant: "default",
      });
    }
  }, [paymentStatus, sessionId]);

  async function loadInvoice() {
    if (!invoiceId) return;

    setLoading(true);
    try {
      const data = await getPortalInvoice(invoiceId);
      setInvoice(data);
    } catch (error) {
      console.error("Failed to load invoice:", error);
      toast({
        title: t("common:error"),
        description: t("common:errorLoading"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handlePaymentSuccess() {
    // Verify payment status and refresh invoice
    toast({
      title: t("payments:checkout.success"),
      variant: "default",
    });
    await loadInvoice();
  }

  async function handlePayNow() {
    if (!invoice || !user) return;

    setProcessing(true);
    try {
      const successUrl = `${window.location.origin}/portal/pay/${invoiceId}?status=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${window.location.origin}/portal/pay/${invoiceId}?status=cancelled`;

      const session = await createCheckoutSession(invoice.organizationId, {
        invoiceId: invoice.id,
        contactId: invoice.contactId,
        customerEmail: user.email || undefined,
        successUrl,
        cancelUrl,
        locale: i18n.language,
      });

      // Redirect to Stripe checkout
      window.location.href = session.url;
    } catch (error) {
      console.error("Failed to create checkout session:", error);
      toast({
        title: t("common:error"),
        description: t("payments:errors.paymentFailed"),
        variant: "destructive",
      });
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>{t("common:error")}</AlertTitle>
          <AlertDescription>Invoice not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const isPaid = invoice.status === "paid";
  const isOverdue = invoice.status === "overdue";
  const amountDue = invoice.total - (invoice.paidAmount || 0);

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate("/portal/invoices")}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t("common:back")}
      </Button>

      {paymentStatus === "success" && (
        <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-700 dark:text-green-400">
            {t("payments:checkout.success")}
          </AlertTitle>
          <AlertDescription className="text-green-600 dark:text-green-400">
            Your payment has been processed successfully.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>{t("payments:invoice.payInvoice")}</CardTitle>
                <CardDescription>
                  {t("payments:invoice.invoiceNumber")}: {invoice.invoiceNumber}
                </CardDescription>
              </div>
            </div>
            <Badge
              variant={
                isPaid ? "default" : isOverdue ? "destructive" : "secondary"
              }
            >
              {t(`portal:invoices.status.${invoice.status}`)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Invoice Details */}
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t("portal:invoices.issueDate")}
              </span>
              <span>
                {format(new Date(invoice.issueDate), "d MMM yyyy", { locale })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t("payments:invoice.dueDate")}
              </span>
              <span className={isOverdue ? "text-destructive font-medium" : ""}>
                {format(new Date(invoice.dueDate), "d MMM yyyy", { locale })}
              </span>
            </div>
          </div>

          <Separator />

          {/* Line Items */}
          <div className="space-y-2">
            {invoice.items?.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <div>
                  <span>{item.description}</span>
                  {item.quantity > 1 && (
                    <span className="text-muted-foreground ml-2">
                      x{item.quantity}
                    </span>
                  )}
                </div>
                <span>
                  {formatOre(
                    item.unitPrice * item.quantity * 100,
                    invoice.currency,
                  )}
                </span>
              </div>
            ))}
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t("portal:invoices.subtotal")}
              </span>
              <span>{formatOre(invoice.subtotal * 100, invoice.currency)}</span>
            </div>
            {invoice.vatBreakdown?.map((vat, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("portal:invoices.vat")} ({vat.rate}%)
                </span>
                <span>{formatOre(vat.amount * 100, invoice.currency)}</span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between font-medium text-lg">
              <span>{t("portal:invoices.total")}</span>
              <span>{formatOre(invoice.total * 100, invoice.currency)}</span>
            </div>
            {invoice.paidAmount && invoice.paidAmount > 0 && (
              <>
                <div className="flex justify-between text-sm text-green-600">
                  <span>{t("portal:invoices.paid")}</span>
                  <span>
                    -{formatOre(invoice.paidAmount * 100, invoice.currency)}
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>{t("portal:invoices.amountDue")}</span>
                  <span>{formatOre(amountDue * 100, invoice.currency)}</span>
                </div>
              </>
            )}
          </div>

          {/* Payment Button */}
          {!isPaid && amountDue > 0 && (
            <div className="pt-4 space-y-4">
              <Button
                className="w-full"
                size="lg"
                onClick={handlePayNow}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("payments:checkout.processing")}
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    {t("payments:checkout.payNow")} -{" "}
                    {formatOre(amountDue * 100, invoice.currency)}
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                {t("payments:checkout.securePayment")}
              </div>
            </div>
          )}

          {isPaid && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-700 dark:text-green-400">
                {t("portal:invoices.status.paid")}
              </AlertTitle>
              <AlertDescription className="text-green-600 dark:text-green-400">
                This invoice has been paid in full.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
