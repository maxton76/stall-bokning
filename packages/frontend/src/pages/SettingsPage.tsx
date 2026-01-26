import { useState, useEffect } from "react";
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
import { Bell, Moon, Globe, Shield, Loader2, Settings2 } from "lucide-react";
import { ToggleSetting } from "@/components/settings/fields/ToggleSetting";
import { SettingSection } from "@/components/settings/sections/SettingSection";
import {
  supportedLanguages,
  languageNames,
  languageFlags,
  type SupportedLanguage,
} from "@/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { authFetchJSON } from "@/utils/authFetch";
import { useToast } from "@/hooks/use-toast";
import { useUserStables } from "@/hooks/useUserStables";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useLanguageSync } from "@/hooks/useLanguageSync";

interface UserSettings {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  darkMode?: boolean;
  timezone?: string;
}

export default function SettingsPage() {
  const { t, i18n } = useTranslation(["settings", "common"]);
  const { user } = useAuth();
  const { toast } = useToast();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // User preferences (default stable, language sync)
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);
  const {
    preferences,
    isLoading: preferencesLoading,
    setDefaultStable,
    isUpdating: preferencesUpdating,
  } = useUserPreferences();
  const { changeLanguageAndSync } = useLanguageSync();

  // Load user settings on mount
  useEffect(() => {
    async function loadSettings() {
      if (!user) return;
      try {
        const response = await authFetchJSON<{
          id: string;
          settings?: UserSettings;
        }>(`${import.meta.env.VITE_API_URL}/api/v1/auth/me`, { method: "GET" });

        if (response?.settings) {
          setEmailNotifications(response.settings.emailNotifications ?? true);
          setPushNotifications(response.settings.pushNotifications ?? false);
          setDarkMode(response.settings.darkMode ?? false);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [user]);

  const handleLanguageChange = async (lang: string) => {
    // Use the sync function to persist language to Firestore
    await changeLanguageAndSync(lang as "sv" | "en");
  };

  const handleDefaultStableChange = async (stableId: string) => {
    try {
      // "none" means clear the default
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

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await authFetchJSON(
        `${import.meta.env.VITE_API_URL}/api/v1/auth/me/settings`,
        {
          method: "PATCH",
          body: JSON.stringify({
            emailNotifications,
            pushNotifications,
            darkMode,
          }),
        },
      );
      toast({
        title: t("common:messages.success"),
        description: t("settings:messages.saved"),
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({
        title: t("common:messages.error"),
        description: t("common:messages.saveFailed"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    setEmailNotifications(true);
    setPushNotifications(false);
    setDarkMode(false);
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
          checked={emailNotifications}
          onCheckedChange={setEmailNotifications}
        />

        <ToggleSetting
          id="push-notifications"
          label={t("settings:sections.notifications.pushNotifications")}
          description={t("settings:sections.notifications.pushDescription")}
          checked={pushNotifications}
          onCheckedChange={setPushNotifications}
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
          checked={darkMode}
          onCheckedChange={setDarkMode}
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
          <Select defaultValue="europe-stockholm" disabled>
            <SelectTrigger id="timezone">
              <SelectValue
                placeholder={t("settings:sections.language.selectTimezone")}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="europe-stockholm">
                {t("settings:timezones.europe_stockholm")}
              </SelectItem>
              <SelectItem value="utc">{t("settings:timezones.utc")}</SelectItem>
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

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={handleResetToDefaults}
          disabled={saving}
        >
          {t("common:buttons.resetToDefaults")}
        </Button>
        <Button onClick={handleSaveSettings} disabled={saving || loading}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("common:buttons.saveChanges")}
        </Button>
      </div>
    </div>
  );
}
