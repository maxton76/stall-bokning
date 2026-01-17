import { useState } from "react";
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
import { Bell, Moon, Globe, Shield } from "lucide-react";
import { ToggleSetting } from "@/components/settings/fields/ToggleSetting";
import { SettingSection } from "@/components/settings/sections/SettingSection";
import {
  supportedLanguages,
  languageNames,
  languageFlags,
  type SupportedLanguage,
} from "@/i18n";

export default function SettingsPage() {
  const { t, i18n } = useTranslation(["settings", "common"]);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
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
        <Button variant="outline">{t("common:buttons.resetToDefaults")}</Button>
        <Button>{t("common:buttons.saveChanges")}</Button>
      </div>
    </div>
  );
}
