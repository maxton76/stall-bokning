import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Bell, Moon, Globe, Shield, Settings2 } from "lucide-react";
import { ToggleSetting } from "@/components/settings/fields/ToggleSetting";
import { SettingSection } from "@/components/settings/sections/SettingSection";
import {
  supportedLanguages,
  languageNames,
  languageFlags,
  type SupportedLanguage,
} from "@/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUserStables } from "@/hooks/useUserStables";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useLanguageSync } from "@/hooks/useLanguageSync";

export default function SettingsPage() {
  const { t, i18n } = useTranslation(["settings", "common"]);
  const { user } = useAuth();
  const { toast } = useToast();

  // User preferences — single source of truth for all settings
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);
  const {
    preferences,
    isLoading: preferencesLoading,
    setDefaultStable,
    setTimezone,
    setNotifications,
    isUpdating: preferencesUpdating,
  } = useUserPreferences();
  const { changeLanguageAndSync } = useLanguageSync();

  const handleLanguageChange = async (lang: string) => {
    await changeLanguageAndSync(lang as "sv" | "en");
  };

  const handleDefaultStableChange = async (stableId: string) => {
    try {
      await setDefaultStable(stableId === "none" ? null : stableId);
      toast({
        title: t("common:messages.success"),
        description: t("settings:messages.saved"),
      });
    } catch (error) {
      console.error("Failed to update default stable:", error);
      toast({
        title: t("common:messages.error"),
        description: t("common:messages.saveFailed"),
        variant: "destructive",
      });
    }
  };

  const handleTimezoneChange = async (tz: string) => {
    try {
      await setTimezone(tz);
      toast({
        title: t("common:messages.success"),
        description: t("settings:messages.saved"),
      });
    } catch (error) {
      console.error("Failed to update timezone:", error);
      toast({
        title: t("common:messages.error"),
        description: t("common:messages.saveFailed"),
        variant: "destructive",
      });
    }
  };

  const handleNotificationToggle = async (
    key: "email" | "push" | "routines" | "feeding" | "activities",
    value: boolean,
  ) => {
    try {
      await setNotifications({ [key]: value });
    } catch (error) {
      console.error("Failed to update notification:", error);
      toast({
        title: t("common:messages.error"),
        description: t("common:messages.saveFailed"),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("settings:page.title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("settings:page.description")}
        </p>
      </div>

      {/* Default Selections */}
      <SettingSection
        title={t("settings:sections.defaults.title")}
        description={t("settings:sections.defaults.description")}
        icon={Settings2}
      >
        <div className="space-y-2">
          <Label htmlFor="default-stable">
            {t("settings:sections.defaults.defaultStable.label")}
          </Label>
          <Select
            value={preferences?.defaultStableId || "none"}
            onValueChange={handleDefaultStableChange}
            disabled={
              stablesLoading || preferencesLoading || preferencesUpdating
            }
          >
            <SelectTrigger id="default-stable">
              <SelectValue
                placeholder={t(
                  "settings:sections.defaults.defaultStable.placeholder",
                )}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                {t("settings:sections.defaults.defaultStable.noStable")}
              </SelectItem>
              {stables.map((stable) => (
                <SelectItem key={stable.id} value={stable.id}>
                  {stable.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {t("settings:sections.defaults.defaultStable.description")}
          </p>
        </div>
      </SettingSection>

      {/* Notifications */}
      <SettingSection
        title={t("settings:sections.notifications.title")}
        description={t("settings:sections.notifications.description")}
        icon={Bell}
      >
        <ToggleSetting
          id="email-notifications"
          label={t("settings:sections.notifications.emailNotifications")}
          description={t("settings:sections.notifications.emailDescription")}
          checked={preferences?.notifications?.email ?? true}
          onCheckedChange={(v) => handleNotificationToggle("email", v)}
          disabled={preferencesLoading || preferencesUpdating}
        />

        <ToggleSetting
          id="push-notifications"
          label={t("settings:sections.notifications.pushNotifications")}
          description={t("settings:sections.notifications.pushDescription")}
          checked={preferences?.notifications?.push ?? false}
          onCheckedChange={(v) => handleNotificationToggle("push", v)}
          disabled={preferencesLoading || preferencesUpdating}
        />

        <ToggleSetting
          id="routine-notifications"
          label={t("settings:sections.notifications.routineNotifications")}
          description={t("settings:sections.notifications.routineDescription")}
          checked={preferences?.notifications?.routines ?? true}
          onCheckedChange={(v) => handleNotificationToggle("routines", v)}
          disabled={preferencesLoading || preferencesUpdating}
        />

        <ToggleSetting
          id="feeding-notifications"
          label={t("settings:sections.notifications.feedingNotifications")}
          description={t("settings:sections.notifications.feedingDescription")}
          checked={preferences?.notifications?.feeding ?? true}
          onCheckedChange={(v) => handleNotificationToggle("feeding", v)}
          disabled={preferencesLoading || preferencesUpdating}
        />

        <ToggleSetting
          id="activity-notifications"
          label={t("settings:sections.notifications.activityNotifications")}
          description={t("settings:sections.notifications.activityDescription")}
          checked={preferences?.notifications?.activities ?? true}
          onCheckedChange={(v) => handleNotificationToggle("activities", v)}
          disabled={preferencesLoading || preferencesUpdating}
        />
      </SettingSection>

      {/* Appearance */}
      <SettingSection
        title={t("settings:sections.appearance.title")}
        description={t("settings:sections.appearance.description")}
        icon={Moon}
      >
        <ToggleSetting
          id="dark-mode"
          label={t("settings:sections.appearance.darkMode")}
          description={t("settings:sections.appearance.darkModeDescription")}
          checked={false}
          onCheckedChange={() => {}}
          disabled
        />
        <p className="text-xs text-muted-foreground">
          {t("settings:sections.appearance.comingSoon")}
        </p>
      </SettingSection>

      {/* Language & Region */}
      <SettingSection
        title={t("settings:sections.language.title")}
        description={t("settings:sections.language.description")}
        icon={Globe}
      >
        <div className="space-y-2">
          <Label htmlFor="language">
            {t("settings:sections.language.language")}
          </Label>
          <Select value={i18n.language} onValueChange={handleLanguageChange}>
            <SelectTrigger id="language">
              <SelectValue
                placeholder={t("settings:sections.language.selectLanguage")}
              />
            </SelectTrigger>
            <SelectContent>
              {supportedLanguages.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  <span className="flex items-center gap-2">
                    <span>{languageFlags[lang as SupportedLanguage]}</span>
                    <span>{languageNames[lang as SupportedLanguage]}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">
            {t("settings:sections.language.timezone")}
          </Label>
          <Select
            value={preferences?.timezone || "Europe/Stockholm"}
            onValueChange={handleTimezoneChange}
            disabled={preferencesLoading || preferencesUpdating}
          >
            <SelectTrigger id="timezone">
              <SelectValue
                placeholder={t("settings:sections.language.selectTimezone")}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Europe/Stockholm">
                {t("settings:timezones.europe_stockholm")}
              </SelectItem>
              <SelectItem value="Europe/Helsinki">
                {t("settings:timezones.europe_helsinki")}
              </SelectItem>
              <SelectItem value="Europe/Oslo">
                {t("settings:timezones.europe_oslo")}
              </SelectItem>
              <SelectItem value="Europe/Copenhagen">
                {t("settings:timezones.europe_copenhagen")}
              </SelectItem>
              <SelectItem value="Europe/London">
                {t("settings:timezones.europe_london")}
              </SelectItem>
              <SelectItem value="Europe/Berlin">
                {t("settings:timezones.europe_berlin")}
              </SelectItem>
              <SelectItem value="UTC">{t("settings:timezones.utc")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SettingSection>

      {/* Privacy & Security */}
      <SettingSection
        title={t("settings:sections.privacy.title")}
        description={t("settings:sections.privacy.description")}
        icon={Shield}
      >
        <div className="space-y-2">
          <Button variant="outline" disabled>
            {t("settings:sections.privacy.changePassword")}
          </Button>
          <p className="text-xs text-muted-foreground">
            {t("settings:sections.privacy.changePasswordDescription")}
          </p>
        </div>

        <div className="space-y-2">
          <Button variant="outline" disabled>
            {t("settings:sections.privacy.twoFactor")}
          </Button>
          <p className="text-xs text-muted-foreground">
            {t("settings:sections.privacy.twoFactorDescription")}
          </p>
        </div>
      </SettingSection>

      {/* All settings save immediately on change */}
    </div>
  );
}
