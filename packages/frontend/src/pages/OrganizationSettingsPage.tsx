import { useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Save,
  Sparkles,
  Users,
  Building2,
  Calendar,
  CreditCard,
  AlertCircle,
  ExternalLink,
  FileText,
  Loader2,
  Clock,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys, cacheInvalidation } from "@/lib/queryClient";
import {
  getOrganization,
  updateOrganization,
  upgradeOrganization,
} from "@/services/organizationService";
import { useToast } from "@/hooks/use-toast";
import type {
  Organization,
  HolidayCalendarSettings,
  SubscriptionTier,
  BillingInterval,
} from "@equiduty/shared";
import { DEFAULT_HOLIDAY_SETTINGS } from "@equiduty/shared";
import { HolidaySettingsTab } from "@/components/settings";
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
import { useTierDefinitions } from "@/hooks/useTierDefinitions";

const organizationSettingsSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  contactType: z.enum(["Personal", "Business"]),
  primaryEmail: z.string().email("Invalid email"),
  phoneNumber: z.string().optional(),
  timezone: z.string().default("Europe/Stockholm"),
});

type OrganizationSettingsFormData = z.infer<typeof organizationSettingsSchema>;

// Common timezone options (IANA identifiers)
const TIMEZONE_OPTIONS = [
  "Europe/Stockholm",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Amsterdam",
  "Europe/Oslo",
  "Europe/Copenhagen",
  "Europe/Helsinki",
  "Europe/Warsaw",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Zurich",
  "Europe/Vienna",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
] as const;

export default function OrganizationSettingsPage() {
  const { t } = useTranslation(["organizations", "common", "settings"]);
  const { organizationId } = useParams<{ organizationId: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [savingHolidays, setSavingHolidays] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);

  // Get initial tab from URL query params (for redirect from old subscription route)
  const initialTab = searchParams.get("tab") || "general";

  // Organization data
  const organizationQuery = useApiQuery<Organization | null>(
    queryKeys.organizations.detail(organizationId || ""),
    () => getOrganization(organizationId!),
    {
      enabled: !!organizationId,
      staleTime: 5 * 60 * 1000,
    },
  );
  const organizationData = organizationQuery.data ?? null;
  const organizationLoading = organizationQuery.isLoading;

  // Subscription hooks
  const { data: subData, isLoading: subLoading } = useSubscriptionDetails(
    organizationId ?? null,
  );
  const { data: billingData } = useBillingHistory(organizationId ?? null);
  const checkoutMutation = useCreateCheckout(organizationId ?? "");
  const portalMutation = useCustomerPortal(organizationId ?? "");
  const cancelMutation = useCancelSubscription(organizationId ?? "");
  const resumeMutation = useResumeSubscription(organizationId ?? "");
  const { getTier } = useTierDefinitions();

  // Holiday settings state - initialize from organization or defaults
  const [holidaySettings, setHolidaySettings] =
    useState<HolidayCalendarSettings>(
      () =>
        organizationData?.settings?.holidayCalendar ?? DEFAULT_HOLIDAY_SETTINGS,
    );

  // Update holiday settings when organization data loads
  const currentHolidaySettings =
    organizationData?.settings?.holidayCalendar ?? DEFAULT_HOLIDAY_SETTINGS;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<OrganizationSettingsFormData>({
    resolver: zodResolver(organizationSettingsSchema as any) as any,
    defaultValues: {
      name: "",
      description: "",
      contactType: "Personal",
      primaryEmail: "",
      phoneNumber: "",
      timezone: "Europe/Stockholm",
    },
    values: organizationData
      ? {
          name: organizationData.name,
          description: organizationData.description || "",
          contactType: organizationData.contactType,
          primaryEmail: organizationData.primaryEmail,
          phoneNumber: organizationData.phoneNumber || "",
          timezone: organizationData.timezone,
        }
      : undefined,
  });

  const contactType = watch("contactType");

  const onSubmit = async (data: OrganizationSettingsFormData) => {
    if (!organizationId || !user) return;

    setLoading(true);
    try {
      await updateOrganization(organizationId, user.uid, data);
      await cacheInvalidation.organizations.all();
      toast({
        title: t("organizations:messages.updateSuccess"),
        description: t("organizations:messages.updateSuccess"),
      });
    } catch (error) {
      console.error("Failed to update organization:", error);
      toast({
        title: t("common:messages.error"),
        description: t("common:messages.saveFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!organizationId || !user) return;

    setUpgrading(true);
    try {
      await upgradeOrganization(organizationId);
      await cacheInvalidation.organizations.all();
      toast({
        title: t("organizations:upgrade.success"),
        description: t("organizations:upgrade.successDescription"),
      });
    } catch (error: any) {
      console.error("Failed to upgrade organization:", error);
      toast({
        title: t("common:messages.error"),
        description:
          error.message || t("organizations:upgrade.errorDescription"),
        variant: "destructive",
      });
    } finally {
      setUpgrading(false);
    }
  };

  const handleSaveHolidaySettings = async () => {
    if (!organizationId || !user) return;

    setSavingHolidays(true);
    try {
      await updateOrganization(organizationId, user.uid, {
        settings: {
          ...organizationData?.settings,
          holidayCalendar: holidaySettings,
        },
      });
      await cacheInvalidation.organizations.all();
      toast({
        title: t("organizations:messages.updateSuccess"),
        description: t("settings:sections.holidays.messages.saved"),
      });
    } catch (error) {
      console.error("Failed to save holiday settings:", error);
      toast({
        title: t("common:messages.error"),
        description: t("common:messages.saveFailed"),
        variant: "destructive",
      });
    } finally {
      setSavingHolidays(false);
    }
  };

  // Check if organization is personal type
  const isPersonalOrg = organizationData?.organizationType === "personal";

  // Subscription computed values
  const subscription = subData?.subscription;
  const tier = subData?.tier ?? "";
  const tierDef = tier ? getTier(tier) : undefined;
  const isFreeTier =
    !subscription?.status && (!tier || tierDef?.isBillable === false);
  const isTrialing = subscription?.status === "trialing";
  const isPastDue = subscription?.status === "past_due";
  const isPaused = subscription?.status === "paused";
  const isCanceling = subscription?.cancelAtPeriodEnd === true;
  const hasNoPaymentMethod = !subscription?.paymentMethod;
  const trialDaysLeft = getTrialDaysRemaining(subscription?.trialEnd);

  const handleSelectPlan = (
    selectedTier: SubscriptionTier,
    interval: BillingInterval,
  ) => {
    setPricingOpen(false);
    checkoutMutation.mutate({ tier: selectedTier, billingInterval: interval });
  };

  if (organizationLoading || !organizationData) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">{t("common:labels.loading")}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        {organizationId && (
          <Link to={`/organizations/${organizationId}`}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("common:navigation.organizations")}
            </Button>
          </Link>
        )}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("organizations:menu.settings")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("organizations:page.description")}
          </p>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue={initialTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">
            {t("settings:tabs.general")}
          </TabsTrigger>
          <TabsTrigger value="subscription">
            {t("organizations:menu.subscription")}
          </TabsTrigger>
          <TabsTrigger value="holidays" className="gap-1">
            <Calendar className="h-3 w-3" />
            {t("settings:tabs.holidays")}
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <form onSubmit={handleSubmit(onSubmit as any)}>
            <Card>
              <CardHeader>
                <CardTitle>{t("settings:tabs.general")}</CardTitle>
                <CardDescription>
                  {t("organizations:form.description.edit")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Organization Type */}
                <div className="space-y-2">
                  <Label>{t("organizations:upgrade.organizationType")}</Label>
                  <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                    <div className="flex items-center gap-2">
                      {isPersonalOrg ? (
                        <>
                          <Users className="h-4 w-4" />
                          <span>
                            {t(
                              "organizations:upgrade.organizationTypes.personal",
                            )}
                          </span>
                        </>
                      ) : (
                        <>
                          <Building2 className="h-4 w-4" />
                          <span>
                            {t(
                              "organizations:upgrade.organizationTypes.business",
                            )}
                          </span>
                        </>
                      )}
                    </div>
                    {isPersonalOrg && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowUpgradeDialog(true)}
                        disabled={upgrading}
                        className="gap-1"
                      >
                        <Sparkles className="h-3 w-3" />
                        {upgrading
                          ? t("common:labels.loading")
                          : t("organizations:upgrade.upgradeToBusiness")}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Organization Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    {t("organizations:form.labels.name")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder={t("organizations:form.placeholders.name")}
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">
                    {t("organizations:form.labels.description")}
                  </Label>
                  <Textarea
                    id="description"
                    placeholder={t(
                      "organizations:form.placeholders.description",
                    )}
                    rows={3}
                    {...register("description")}
                  />
                </div>

                {/* Contact Type */}
                <div className="space-y-2">
                  <Label>{t("organizations:invite.contactType")}</Label>
                  <RadioGroup
                    value={contactType ?? "Personal"}
                    onValueChange={(value) =>
                      setValue("contactType", value as "Personal" | "Business")
                    }
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Personal" id="personal" />
                      <Label htmlFor="personal" className="font-normal">
                        {t("organizations:invite.contactTypes.personal")}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Business" id="business" />
                      <Label htmlFor="business" className="font-normal">
                        {t("organizations:invite.contactTypes.business")}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Primary Email */}
                <div className="space-y-2">
                  <Label htmlFor="primaryEmail">
                    {t("organizations:form.labels.email")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="primaryEmail"
                    type="email"
                    placeholder={t("organizations:invite.emailPlaceholder")}
                    {...register("primaryEmail")}
                  />
                  {errors.primaryEmail && (
                    <p className="text-sm text-destructive">
                      {errors.primaryEmail.message}
                    </p>
                  )}
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">
                    {t("organizations:form.labels.phone")}
                  </Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder={t("organizations:invite.phonePlaceholder")}
                    {...register("phoneNumber")}
                  />
                </div>

                {/* Timezone */}
                <div className="space-y-2">
                  <Label htmlFor="timezone">
                    {t("organizations:form.timezone.label")}
                  </Label>
                  <Select
                    value={watch("timezone")}
                    onValueChange={(value) => setValue("timezone", value)}
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue
                        placeholder={t(
                          "organizations:form.timezone.placeholder",
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {t(`organizations:form.timezone.zones.${tz}`, {
                            defaultValue: tz,
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t("organizations:form.timezone.description")}
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => reset()}
                    disabled={loading}
                  >
                    {t("common:buttons.resetToDefaults")}
                  </Button>
                  <Button type="submit" disabled={loading}>
                    <Save className="mr-2 h-4 w-4" />
                    {loading
                      ? t("common:labels.loading")
                      : t("common:buttons.saveChanges")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          {subLoading ? (
            <div className="flex items-center justify-center min-h-[20vh]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Trial Alert */}
              {isTrialing && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertTitle>
                    {t("organizations:subscription.trial.title")}
                  </AlertTitle>
                  <AlertDescription>
                    {hasNoPaymentMethod
                      ? t(
                          "organizations:subscription.trial.descriptionNoCard",
                          {
                            days: trialDaysLeft,
                          },
                        )
                      : t("organizations:subscription.trial.description", {
                          days: trialDaysLeft,
                        })}
                    {hasNoPaymentMethod && (
                      <Button
                        variant="link"
                        className="p-0 h-auto ml-1"
                        onClick={() => portalMutation.mutate()}
                        disabled={portalMutation.isPending}
                      >
                        {t("organizations:subscription.trial.addPaymentMethod")}
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Paused Alert (trial ended without payment method) */}
              {isPaused && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>
                    {t("organizations:subscription.paused.title")}
                  </AlertTitle>
                  <AlertDescription>
                    {t("organizations:subscription.paused.description")}
                    <Button
                      variant="link"
                      className="p-0 h-auto ml-1"
                      onClick={() => portalMutation.mutate()}
                      disabled={portalMutation.isPending}
                    >
                      {t("organizations:subscription.paused.addPaymentMethod")}
                    </Button>
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
                        <Badge
                          variant={statusBadgeVariant(subscription.status)}
                        >
                          {t(
                            `organizations:subscription.status.${subscription.status}`,
                          )}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className="text-lg px-4 py-2 capitalize"
                      >
                        {tierDef?.name ??
                          t(`organizations:subscription.tiers.${tier}.name`)}
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
                        <Dialog
                          open={pricingOpen}
                          onOpenChange={setPricingOpen}
                        >
                          <DialogTrigger asChild>
                            <Button>
                              {t(
                                "organizations:subscription.buttons.upgradeNow",
                              )}
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
                            {t(
                              "organizations:subscription.buttons.manageBilling",
                            )}
                          </Button>
                          <Dialog
                            open={pricingOpen}
                            onOpenChange={setPricingOpen}
                          >
                            <DialogTrigger asChild>
                              <Button variant="outline">
                                {t(
                                  "organizations:subscription.buttons.changePlan",
                                )}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>
                                  {t(
                                    "organizations:subscription.pricing.title",
                                  )}
                                </DialogTitle>
                              </DialogHeader>
                              <PricingTable
                                currentTier={tier}
                                onSelectPlan={handleSelectPlan}
                                loading={checkoutMutation.isPending}
                              />
                            </DialogContent>
                          </Dialog>
                          {!isCanceling &&
                            subscription?.status !== "canceled" && (
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
                            month: String(
                              subscription.paymentMethod.expMonth,
                            ).padStart(2, "0"),
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
                  <CardTitle>
                    {t("organizations:subscription.history.title")}
                  </CardTitle>
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
                            <TableCell>
                              {formatDateSV(invoice.created)}
                            </TableCell>
                            <TableCell>
                              {formatSEK(invoice.amountPaid)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  invoice.status === "paid"
                                    ? "default"
                                    : "outline"
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
            </>
          )}
        </TabsContent>

        {/* Holidays Tab */}
        <TabsContent value="holidays">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t("settings:sections.holidays.title")}
              </CardTitle>
              <CardDescription>
                {t("settings:sections.holidays.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HolidaySettingsTab
                settings={holidaySettings}
                onChange={setHolidaySettings}
                disabled={savingHolidays}
              />
              <div className="flex justify-end gap-2 pt-6 border-t mt-6">
                <Button
                  variant="outline"
                  onClick={() => setHolidaySettings(currentHolidaySettings)}
                  disabled={savingHolidays}
                >
                  {t("common:buttons.resetToDefaults")}
                </Button>
                <Button
                  onClick={handleSaveHolidaySettings}
                  disabled={savingHolidays}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {savingHolidays
                    ? t("common:labels.loading")
                    : t("common:buttons.saveChanges")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upgrade Confirmation Dialog */}
      <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t("organizations:upgrade.confirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>{t("organizations:upgrade.confirmDescription")}</p>
                <div className="space-y-2">
                  <p className="font-medium text-foreground">
                    {t("organizations:upgrade.benefitsTitle")}
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>{t("organizations:upgrade.benefits.activities")}</li>
                    <li>{t("organizations:upgrade.benefits.scheduling")}</li>
                    <li>{t("organizations:upgrade.benefits.lessons")}</li>
                    <li>{t("organizations:upgrade.benefits.memberRoles")}</li>
                  </ul>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("organizations:upgrade.confirmNote")}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={upgrading}>
              {t("common:buttons.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowUpgradeDialog(false);
                handleUpgrade();
              }}
              disabled={upgrading}
            >
              {upgrading
                ? t("common:labels.loading")
                : t("organizations:upgrade.confirmButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
