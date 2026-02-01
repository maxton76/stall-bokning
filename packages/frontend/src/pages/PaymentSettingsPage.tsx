import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import {
  CreditCard,
  Settings,
  Check,
  X,
  ExternalLink,
  Loader2,
  AlertCircle,
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import {
  getStripeSettings,
  connectStripeAccount,
  disconnectStripeAccount,
  updateStripeSettings,
  type StripeSettingsResponse,
  type UpdateStripeSettingsData,
} from "@/services/paymentService";

type PaymentMethod =
  | "card"
  | "klarna"
  | "swish"
  | "bank_transfer"
  | "sepa_debit";

const PAYMENT_METHODS: { value: PaymentMethod; labelKey: string }[] = [
  { value: "card", labelKey: "paymentMethods.card" },
  { value: "klarna", labelKey: "paymentMethods.klarna" },
  { value: "swish", labelKey: "paymentMethods.swish" },
  { value: "bank_transfer", labelKey: "paymentMethods.bank_transfer" },
  { value: "sepa_debit", labelKey: "paymentMethods.sepa_debit" },
];

export default function PaymentSettingsPage() {
  const { t } = useTranslation(["payments", "common"]);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const { organizationId } = useParams<{ organizationId: string }>();

  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [acceptedMethods, setAcceptedMethods] = useState<PaymentMethod[]>([
    "card",
  ]);
  const [passFeesToCustomer, setPassFeesToCustomer] = useState(false);
  const [payoutSchedule, setPayoutSchedule] = useState<
    "daily" | "weekly" | "monthly" | "manual"
  >("daily");
  const [statementDescriptor, setStatementDescriptor] = useState("");

  const orgId = organizationId || currentOrganization;

  const { data: settings, isLoading: loading } =
    useApiQuery<StripeSettingsResponse>(
      queryKeys.payments.stripeSettings(orgId ?? ""),
      () => getStripeSettings(orgId!),
      {
        enabled: !!orgId,
      },
    );

  // Sync fetched settings to form state
  useEffect(() => {
    if (settings) {
      setAcceptedMethods(
        (settings.acceptedPaymentMethods as PaymentMethod[]) || ["card"],
      );
      setPassFeesToCustomer(settings.passFeesToCustomer || false);
      setPayoutSchedule(settings.payoutSchedule || "daily");
      setStatementDescriptor(settings.statementDescriptor || "");
    }
  }, [settings]);

  // Handle return from Stripe onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") {
      toast({
        title: t("common:success"),
        description: t("payments:messages.connectSuccess"),
      });
      // Clean up URL params
      window.history.replaceState({}, "", window.location.pathname);
      queryClient.invalidateQueries({
        queryKey: queryKeys.payments.stripeSettings(orgId ?? ""),
      });
    } else if (params.get("refresh") === "true") {
      // User returned but onboarding not complete, reload to check status
      window.history.replaceState({}, "", window.location.pathname);
      queryClient.invalidateQueries({
        queryKey: queryKeys.payments.stripeSettings(orgId ?? ""),
      });
    }
  }, []);

  async function handleConnect() {
    if (!orgId) return;

    setConnecting(true);
    try {
      const returnUrl = `${window.location.origin}/organizations/${orgId}/settings/payments?connected=true`;
      const refreshUrl = `${window.location.origin}/organizations/${orgId}/settings/payments?refresh=true`;

      const response = await connectStripeAccount(orgId, returnUrl, refreshUrl);

      // Redirect to Stripe onboarding
      window.location.href = response.accountLinkUrl;
    } catch (error) {
      console.error("Failed to connect Stripe account:", error);
      toast({
        title: t("common:error"),
        description: t("payments:errors.paymentFailed"),
        variant: "destructive",
      });
      setConnecting(false);
    }
  }

  async function handleSaveSettings() {
    if (!orgId) return;

    setSaving(true);
    try {
      const data: UpdateStripeSettingsData = {
        acceptedPaymentMethods: acceptedMethods,
        passFeesToCustomer,
        payoutSchedule,
        statementDescriptor: statementDescriptor || undefined,
      };

      await updateStripeSettings(orgId, data);

      toast({
        title: t("common:success"),
        description: t("payments:messages.settingsUpdated"),
      });

      await queryClient.invalidateQueries({
        queryKey: queryKeys.payments.stripeSettings(orgId ?? ""),
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({
        title: t("common:error"),
        description: t("common:errorSaving"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!orgId) return;

    if (!window.confirm(t("payments:settings.confirmDisconnect"))) {
      return;
    }

    setDisconnecting(true);
    try {
      await disconnectStripeAccount(orgId);
      toast({
        title: t("common:success"),
        description: t("payments:messages.disconnectSuccess"),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.payments.stripeSettings(orgId ?? ""),
      });
    } catch (error) {
      console.error("Failed to disconnect Stripe account:", error);
      toast({
        title: t("common:error"),
        description: t("payments:errors.disconnectFailed"),
        variant: "destructive",
      });
    } finally {
      setDisconnecting(false);
    }
  }

  function togglePaymentMethod(method: PaymentMethod) {
    setAcceptedMethods((prev) =>
      prev.includes(method)
        ? prev.filter((m) => m !== method)
        : [...prev, method],
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isConnected = settings?.accountStatus === "enabled";
  const isPending = settings?.accountStatus === "pending";

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("payments:settings.title")}</h1>
        <p className="text-muted-foreground">{t("payments:description")}</p>
      </div>

      {/* Stripe Connect Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t("payments:settings.stripeConnect")}
          </CardTitle>
          <CardDescription>
            {t("payments:settings.connectDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected && !isPending ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("payments:status.not_connected")}</AlertTitle>
              <AlertDescription>
                {t("payments:settings.connectDescription")}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <span className="text-sm font-medium">
                {t("payments:settings.accountStatus")}
              </span>
              <Badge
                variant={
                  isConnected ? "default" : isPending ? "secondary" : "outline"
                }
              >
                {t(
                  `payments:status.${settings?.accountStatus || "not_connected"}`,
                )}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <span className="text-sm font-medium">
                {t("payments:settings.chargesEnabled")}
              </span>
              {settings?.chargesEnabled ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : (
                <X className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <span className="text-sm font-medium">
                {t("payments:settings.payoutsEnabled")}
              </span>
              {settings?.payoutsEnabled ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : (
                <X className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <span className="text-sm font-medium">
                {t("payments:settings.onboardingComplete")}
              </span>
              {settings?.onboardingComplete ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : (
                <X className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </div>

          {!isConnected && (
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("common:loading.default")}
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {isPending
                    ? t("payments:settings.continueOnboarding")
                    : t("payments:settings.connectAccount")}
                </>
              )}
            </Button>
          )}

          {isConnected && (
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("common:loading.default")}
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  {t("payments:settings.disconnectAccount")}
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Payment Settings */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {t("payments:settings.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Accepted Payment Methods */}
            <div className="space-y-3">
              <Label>{t("payments:settings.acceptedMethods")}</Label>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {PAYMENT_METHODS.map((method) => (
                  <div
                    key={method.value}
                    className="flex items-center space-x-2 p-3 border rounded-lg"
                  >
                    <Checkbox
                      id={method.value}
                      checked={acceptedMethods.includes(method.value)}
                      onCheckedChange={() => togglePaymentMethod(method.value)}
                    />
                    <Label htmlFor={method.value} className="cursor-pointer">
                      {t(`payments:${method.labelKey}`)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Payout Schedule */}
            <div className="space-y-2">
              <Label htmlFor="payoutSchedule">
                {t("payments:settings.payoutSchedule")}
              </Label>
              <Select
                value={payoutSchedule}
                onValueChange={(v) =>
                  setPayoutSchedule(v as typeof payoutSchedule)
                }
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">
                    {t("payments:payoutSchedule.daily")}
                  </SelectItem>
                  <SelectItem value="weekly">
                    {t("payments:payoutSchedule.weekly")}
                  </SelectItem>
                  <SelectItem value="monthly">
                    {t("payments:payoutSchedule.monthly")}
                  </SelectItem>
                  <SelectItem value="manual">
                    {t("payments:payoutSchedule.manual")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Statement Descriptor */}
            <div className="space-y-2">
              <Label htmlFor="statementDescriptor">
                {t("payments:settings.statementDescriptor")}
              </Label>
              <Input
                id="statementDescriptor"
                value={statementDescriptor}
                onChange={(e) => setStatementDescriptor(e.target.value)}
                maxLength={22}
                placeholder={t(
                  "payments:settings.statementDescriptorPlaceholder",
                )}
                className="md:w-[300px]"
              />
              <p className="text-xs text-muted-foreground">
                {t("payments:settings.statementDescriptorHelp")}
              </p>
            </div>

            {/* Pass Fees to Customer */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label>{t("payments:settings.passFeesToCustomer")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("payments:settings.passFeesDescription")}
                </p>
              </div>
              <Switch
                checked={passFeesToCustomer}
                onCheckedChange={setPassFeesToCustomer}
              />
            </div>

            <Button onClick={handleSaveSettings} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("common:saving")}
                </>
              ) : (
                t("common:save")
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
