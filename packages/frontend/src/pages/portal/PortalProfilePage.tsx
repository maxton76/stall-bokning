import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { User, Mail, Phone, Building, Bell, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAsyncData } from "@/hooks/useAsyncData";
import {
  getPortalProfile,
  updatePortalNotificationPreferences,
  type PortalProfileResponse,
} from "@/services/portalService";

export default function PortalProfilePage() {
  const { t } = useTranslation(["portal", "common"]);
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    emailEnabled: true,
    emailOnInvoice: true,
    emailOnPaymentConfirmation: true,
    emailOnActivityReminder: true,
    emailOnHealthUpdate: true,
    emailOnMessage: true,
    pushEnabled: false,
  });

  const profile = useAsyncData<PortalProfileResponse>({
    loadFn: getPortalProfile,
  });

  useEffect(() => {
    profile.load();
  }, []);

  useEffect(() => {
    if (profile.data?.notificationPreferences) {
      setPreferences({
        emailEnabled: profile.data.notificationPreferences.emailEnabled ?? true,
        emailOnInvoice:
          profile.data.notificationPreferences.emailOnInvoice ?? true,
        emailOnPaymentConfirmation:
          profile.data.notificationPreferences.emailOnPaymentConfirmation ??
          true,
        emailOnActivityReminder:
          profile.data.notificationPreferences.emailOnActivityReminder ?? true,
        emailOnHealthUpdate:
          profile.data.notificationPreferences.emailOnHealthUpdate ?? true,
        emailOnMessage:
          profile.data.notificationPreferences.emailOnMessage ?? true,
        pushEnabled: profile.data.notificationPreferences.pushEnabled ?? false,
      });
    }
  }, [profile.data]);

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      await updatePortalNotificationPreferences(preferences);
      toast({
        title: t("portal:profile.preferencesSaved"),
      });
    } catch {
      toast({
        title: t("common:errors.generic"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (profile.isLoading) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const contact = profile.data?.contact;

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("portal:profile.title")}</h1>
        <p className="text-muted-foreground">
          {t("portal:profile.description")}
        </p>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t("portal:profile.personalInfo")}
          </CardTitle>
          <CardDescription>
            {t("portal:profile.personalInfoDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">
                {t("common:fields.name")}
              </Label>
              <p className="font-medium">
                {contact?.contactType === "Personal"
                  ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                  : contact?.businessName || "-"}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">
                {t("common:fields.email")}
              </Label>
              <p className="font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {contact?.email || "-"}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">
                {t("common:fields.phone")}
              </Label>
              <p className="font-medium flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {contact?.phoneNumber || "-"}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">
                {t("portal:profile.organization")}
              </Label>
              <p className="font-medium flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                {profile.data?.organization.name || "-"}
              </p>
            </div>
          </div>

          {contact?.address && (
            <>
              <Separator />
              <div>
                <Label className="text-muted-foreground">
                  {t("common:fields.address")}
                </Label>
                <p className="font-medium">
                  {contact.address.street} {contact.address.houseNumber}
                  <br />
                  {contact.address.postcode} {contact.address.city}
                  <br />
                  {contact.address.country}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t("portal:profile.notificationPreferences")}
          </CardTitle>
          <CardDescription>
            {t("portal:profile.notificationDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Notifications */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("portal:profile.emailNotifications")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("portal:profile.emailNotificationsDescription")}
                </p>
              </div>
              <Switch
                checked={preferences.emailEnabled}
                onCheckedChange={(checked) =>
                  setPreferences((p) => ({ ...p, emailEnabled: checked }))
                }
              />
            </div>

            {preferences.emailEnabled && (
              <div className="mt-4 ml-4 space-y-4 border-l-2 pl-4">
                <div className="flex items-center justify-between">
                  <Label className="font-normal">
                    {t("portal:profile.emailOnInvoice")}
                  </Label>
                  <Switch
                    checked={preferences.emailOnInvoice}
                    onCheckedChange={(checked) =>
                      setPreferences((p) => ({ ...p, emailOnInvoice: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal">
                    {t("portal:profile.emailOnPayment")}
                  </Label>
                  <Switch
                    checked={preferences.emailOnPaymentConfirmation}
                    onCheckedChange={(checked) =>
                      setPreferences((p) => ({
                        ...p,
                        emailOnPaymentConfirmation: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal">
                    {t("portal:profile.emailOnActivity")}
                  </Label>
                  <Switch
                    checked={preferences.emailOnActivityReminder}
                    onCheckedChange={(checked) =>
                      setPreferences((p) => ({
                        ...p,
                        emailOnActivityReminder: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal">
                    {t("portal:profile.emailOnHealth")}
                  </Label>
                  <Switch
                    checked={preferences.emailOnHealthUpdate}
                    onCheckedChange={(checked) =>
                      setPreferences((p) => ({
                        ...p,
                        emailOnHealthUpdate: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal">
                    {t("portal:profile.emailOnMessage")}
                  </Label>
                  <Switch
                    checked={preferences.emailOnMessage}
                    onCheckedChange={(checked) =>
                      setPreferences((p) => ({
                        ...p,
                        emailOnMessage: checked,
                      }))
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSavePreferences} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {t("common:buttons.save")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
