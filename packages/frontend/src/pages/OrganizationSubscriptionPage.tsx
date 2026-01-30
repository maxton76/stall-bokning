import { useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CreditCard,
  AlertCircle,
  ExternalLink,
  FileText,
  Loader2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useSubscriptionDetails,
  useCustomerPortal,
  useCancelSubscription,
  useResumeSubscription,
  useBillingHistory,
  useCreateCheckout,
} from "@/hooks/useSubscription";
import { PricingTable } from "@/components/subscription/PricingTable";
import { formatSEK, formatDateSV } from "@/lib/formatters";
import {
  statusBadgeVariant,
  getTrialDaysRemaining,
} from "@/lib/subscriptionUI";
import type { SubscriptionTier, BillingInterval } from "@equiduty/shared";

export default function OrganizationSubscriptionPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { t } = useTranslation(["organizations", "common"]);
  const [pricingOpen, setPricingOpen] = useState(false);

  const { data: subData, isLoading } = useSubscriptionDetails(
    organizationId ?? null,
  );
  const { data: billingData } = useBillingHistory(organizationId ?? null);

  const checkoutMutation = useCreateCheckout(organizationId ?? "");
  const portalMutation = useCustomerPortal(organizationId ?? "");
  const cancelMutation = useCancelSubscription(organizationId ?? "");
  const resumeMutation = useResumeSubscription(organizationId ?? "");

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const subscription = subData?.subscription;
  const tier = subData?.tier ?? "free";
  const isFreeTier = tier === "free" && !subscription?.status;
  const isTrialing = subscription?.status === "trialing";
  const isPastDue = subscription?.status === "past_due";
  const isCanceling = subscription?.cancelAtPeriodEnd === true;

  const trialDaysLeft = getTrialDaysRemaining(subscription?.trialEnd);

  const handleSelectPlan = (
    tier: SubscriptionTier,
    interval: BillingInterval,
  ) => {
    setPricingOpen(false);
    checkoutMutation.mutate({ tier, billingInterval: interval });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("organizations:subscription.title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("organizations:subscription.pageDescription")}
        </p>
      </div>

      {/* Trial Alert */}
      {isTrialing && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>{t("organizations:subscription.trial.title")}</AlertTitle>
          <AlertDescription>
            {t("organizations:subscription.trial.description", {
              days: trialDaysLeft,
            })}
          </AlertDescription>
        </Alert>
      )}

      {/* Past Due Alert */}
      {isPastDue && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {t("organizations:subscription.pastDue.title")}
          </AlertTitle>
          <AlertDescription>
            {t("organizations:subscription.pastDue.description")}
            <Button
              variant="link"
              className="p-0 h-auto ml-1"
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
            >
              {t("organizations:subscription.pastDue.updatePayment")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Canceling Alert */}
      {isCanceling && subscription && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {t("organizations:subscription.canceling.title")}
          </AlertTitle>
          <AlertDescription>
            {t("organizations:subscription.canceling.description", {
              date: formatDateSV(subscription.currentPeriodEnd),
            })}
            <Button
              variant="link"
              className="p-0 h-auto ml-1"
              onClick={() => resumeMutation.mutate()}
              disabled={resumeMutation.isPending}
            >
              {t("organizations:subscription.canceling.resume")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {t("organizations:subscription.currentPlan")}
              </CardTitle>
              <CardDescription>
                {t("organizations:subscription.currentPlanDescription")}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {subscription?.status && (
                <Badge variant={statusBadgeVariant(subscription.status)}>
                  {t(
                    `organizations:subscription.status.${subscription.status}`,
                  )}
                </Badge>
              )}
              <Badge variant="outline" className="text-lg px-4 py-2 capitalize">
                {t(`organizations:subscription.tiers.${tier}.name`)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {subscription?.currentPeriodEnd && !isFreeTier && (
              <div className="text-sm text-muted-foreground">
                {t("organizations:subscription.billingPeriod")}:{" "}
                {formatDateSV(subscription.currentPeriodStart)} -{" "}
                {formatDateSV(subscription.currentPeriodEnd)}
                {subscription.billingInterval && (
                  <span className="ml-2">
                    (
                    {t(
                      `organizations:subscription.pricing.${subscription.billingInterval === "year" ? "annual" : "monthly"}`,
                    )}
                    )
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              {isFreeTier ? (
                <Dialog open={pricingOpen} onOpenChange={setPricingOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      {t("organizations:subscription.buttons.upgradeNow")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {t("organizations:subscription.pricing.title")}
                      </DialogTitle>
                    </DialogHeader>
                    <PricingTable
                      currentTier={tier}
                      onSelectPlan={handleSelectPlan}
                      loading={checkoutMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => portalMutation.mutate()}
                    disabled={portalMutation.isPending}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t("organizations:subscription.buttons.manageBilling")}
                  </Button>
                  <Dialog open={pricingOpen} onOpenChange={setPricingOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        {t("organizations:subscription.buttons.changePlan")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {t("organizations:subscription.pricing.title")}
                        </DialogTitle>
                      </DialogHeader>
                      <PricingTable
                        currentTier={tier}
                        onSelectPlan={handleSelectPlan}
                        loading={checkoutMutation.isPending}
                      />
                    </DialogContent>
                  </Dialog>
                  {!isCanceling && subscription?.status !== "canceled" && (
                    <Button
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => cancelMutation.mutate()}
                      disabled={cancelMutation.isPending}
                    >
                      {t(
                        "organizations:subscription.buttons.cancelSubscription",
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      {subscription?.paymentMethod && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {t("organizations:subscription.payment.title")}
                </CardTitle>
                <CardDescription>
                  {t("organizations:subscription.payment.description")}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
              >
                {t("organizations:subscription.payment.update")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="flex items-center justify-center w-12 h-12 bg-accent rounded">
                <CreditCard className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="font-semibold capitalize">
                  {subscription.paymentMethod.brand} ****{" "}
                  {subscription.paymentMethod.last4}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("organizations:subscription.payment.expires", {
                    month: String(subscription.paymentMethod.expMonth).padStart(
                      2,
                      "0",
                    ),
                    year: subscription.paymentMethod.expYear,
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>{t("organizations:subscription.history.title")}</CardTitle>
          <CardDescription>
            {t("organizations:subscription.history.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {billingData?.invoices && billingData.invoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {t("organizations:subscription.history.date")}
                  </TableHead>
                  <TableHead>
                    {t("organizations:subscription.history.amount")}
                  </TableHead>
                  <TableHead>
                    {t("organizations:subscription.history.status")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("organizations:subscription.history.invoice")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingData.invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{formatDateSV(invoice.created)}</TableCell>
                    <TableCell>{formatSEK(invoice.amountPaid)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          invoice.status === "paid" ? "default" : "outline"
                        }
                      >
                        {t(
                          `organizations:subscription.invoiceStatus.${invoice.status}`,
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {invoice.invoicePdf && (
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={invoice.invoicePdf}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FileText className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                {t("organizations:subscription.history.emptyState")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
