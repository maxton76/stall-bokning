import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Save,
  Sparkles,
  Users,
  Building,
  Contact,
  Shield,
  BarChart3,
  Check,
  Calendar,
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
import { useAuth } from "@/contexts/AuthContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys, cacheInvalidation } from "@/lib/queryClient";
import {
  getOrganization,
  updateOrganization,
  upgradeOrganization,
} from "@/services/organizationService";
import { useToast } from "@/hooks/use-toast";
import type { Organization, HolidayCalendarSettings } from "@equiduty/shared";
import { DEFAULT_HOLIDAY_SETTINGS } from "@equiduty/shared";
import { HolidaySettingsTab } from "@/components/settings";

const organizationSettingsSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  contactType: z.enum(["Personal", "Business"]),
  primaryEmail: z.string().email("Invalid email"),
  phoneNumber: z.string().optional(),
  timezone: z.string().default("Europe/Stockholm"),
});

type OrganizationSettingsFormData = z.infer<typeof organizationSettingsSchema>;

// Feature icons mapping
const featureIcons: Record<string, React.ElementType> = {
  users: Users,
  building: Building,
  contact: Contact,
  shield: Shield,
  chart: BarChart3,
};

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
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [savingHolidays, setSavingHolidays] = useState(false);

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

  // Upgrade benefits for personal organizations
  const upgradeBenefits = [
    {
      feature: "members",
      description: t("organizations:upgrade.benefits.members"),
      icon: "users",
    },
    {
      feature: "stables",
      description: t("organizations:upgrade.benefits.stables"),
      icon: "building",
    },
    {
      feature: "contacts",
      description: t("organizations:upgrade.benefits.contacts"),
      icon: "contact",
    },
    {
      feature: "roles",
      description: t("organizations:upgrade.benefits.roles"),
      icon: "shield",
    },
    {
      feature: "analytics",
      description: t("organizations:upgrade.benefits.analytics"),
      icon: "chart",
    },
  ];

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
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">
            {t("settings:tabs.general")}
          </TabsTrigger>
          <TabsTrigger value="stables">
            {t("common:navigation.stables")}
          </TabsTrigger>
          <TabsTrigger value="subscription">
            {t("organizations:menu.subscription")}
          </TabsTrigger>
          <TabsTrigger value="holidays" className="gap-1">
            <Calendar className="h-3 w-3" />
            {t("settings:tabs.holidays")}
          </TabsTrigger>
          {isPersonalOrg && (
            <TabsTrigger value="upgrade" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {t("organizations:upgrade.tabTitle")}
            </TabsTrigger>
          )}
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

        {/* Stables Tab */}
        <TabsContent value="stables">
          <Card>
            <CardHeader>
              <CardTitle>{t("common:navigation.stables")}</CardTitle>
              <CardDescription>{t("stables:page.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t("common:navigation.stables")}:{" "}
                {organizationData.stats.stableCount}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription">
          <Card>
            <CardHeader>
              <CardTitle>{t("organizations:subscription.title")}</CardTitle>
              <CardDescription>
                {t("organizations:subscription.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t("organizations:subscription.currentPlan")}
                  </span>
                  <span className="text-sm text-muted-foreground capitalize">
                    {organizationData.subscriptionTier}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t("organizations:menu.members")}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {organizationData.stats.totalMemberCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t("organizations:upgrade.organizationType")}
                  </span>
                  <Badge
                    variant={isPersonalOrg ? "secondary" : "default"}
                    className="capitalize"
                  >
                    {organizationData.organizationType || "personal"}
                  </Badge>
                </div>
              </div>
              {isPersonalOrg && (
                <p className="text-xs text-muted-foreground mt-4">
                  {t("organizations:upgrade.personalLimitations")}
                </p>
              )}
            </CardContent>
          </Card>
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

        {/* Upgrade Tab (for personal organizations only) */}
        {isPersonalOrg && (
          <TabsContent value="upgrade">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  {t("organizations:upgrade.title")}
                </CardTitle>
                <CardDescription>
                  {t("organizations:upgrade.description")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Benefits List */}
                <div className="space-y-4">
                  <h4 className="font-medium">
                    {t("organizations:upgrade.benefitsTitle")}
                  </h4>
                  <div className="grid gap-3">
                    {upgradeBenefits.map((benefit) => {
                      const IconComponent =
                        featureIcons[benefit.icon] || Shield;
                      return (
                        <div
                          key={benefit.feature}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex-shrink-0 p-2 bg-primary/10 rounded-md">
                            <IconComponent className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">{benefit.description}</p>
                          </div>
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Upgrade Button */}
                <div className="flex flex-col items-center gap-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground text-center">
                    {t("organizations:upgrade.upgradeNote")}
                  </p>
                  <Button
                    onClick={handleUpgrade}
                    disabled={upgrading}
                    size="lg"
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    {upgrading
                      ? t("common:labels.loading")
                      : t("organizations:upgrade.upgradeButton")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
