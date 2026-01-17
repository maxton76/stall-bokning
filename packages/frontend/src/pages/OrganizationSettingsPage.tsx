import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Save } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import {
  getOrganization,
  updateOrganization,
} from "@/services/organizationService";
import { useToast } from "@/hooks/use-toast";

const organizationSettingsSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  contactType: z.enum(["Personal", "Business"]),
  primaryEmail: z.string().email("Invalid email"),
  phoneNumber: z.string().optional(),
  timezone: z.string().default("Europe/Stockholm"),
});

type OrganizationSettingsFormData = z.infer<typeof organizationSettingsSchema>;

export default function OrganizationSettingsPage() {
  const { t } = useTranslation(["organizations", "common", "settings"]);
  const { organizationId } = useParams<{ organizationId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Organization data
  const organization = useAsyncData({
    loadFn: async () => {
      if (!organizationId) return null;
      return await getOrganization(organizationId);
    },
  });

  // Load organization when organizationId changes
  useEffect(() => {
    organization.load();
  }, [organizationId]);

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
    values: organization.data
      ? {
          name: organization.data.name,
          description: organization.data.description || "",
          contactType: organization.data.contactType,
          primaryEmail: organization.data.primaryEmail,
          phoneNumber: organization.data.phoneNumber || "",
          timezone: organization.data.timezone,
        }
      : undefined,
  });

  const contactType = watch("contactType");

  const onSubmit = async (data: OrganizationSettingsFormData) => {
    if (!organizationId || !user) return;

    setLoading(true);
    try {
      await updateOrganization(organizationId, user.uid, data);
      await organization.reload();
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

  if (organization.loading || !organization.data) {
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
                    value={contactType}
                    onValueChange={(value) =>
                      setValue("contactType", value as "Personal" | "Business")
                    }
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Personal" id="personal" />
                      <Label htmlFor="personal" className="font-normal">
                        Personal
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Business" id="business" />
                      <Label htmlFor="business" className="font-normal">
                        Business
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
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    placeholder="Europe/Stockholm"
                    {...register("timezone")}
                  />
                  <p className="text-xs text-muted-foreground">
                    IANA timezone identifier (e.g., Europe/Stockholm,
                    America/New_York)
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
                {organization.data.stats.stableCount}
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
                    {organization.data.subscriptionTier}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t("organizations:menu.members")}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {organization.data.stats.totalMemberCount}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
