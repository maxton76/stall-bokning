import { useTranslation } from "react-i18next";
import { ToggleSetting } from "../fields/ToggleSetting";
import { SettingSection } from "../sections/SettingSection";

export interface NotificationSettings {
  emailNotifications: boolean;
  shiftReminders: boolean;
  schedulePublished: boolean;
  memberJoined: boolean;
  shiftSwapRequests: boolean;
}

interface NotificationSettingsTabProps {
  settings: NotificationSettings;
  onChange: (settings: NotificationSettings) => void;
  disabled?: boolean;
}

export function NotificationSettingsTab({
  settings,
  onChange,
  disabled = false,
}: NotificationSettingsTabProps) {
  const { t } = useTranslation(["settings", "common"]);

  const handleFieldChange = <K extends keyof NotificationSettings>(
    field: K,
    value: NotificationSettings[K],
  ) => {
    // If master switch is being disabled, disable all dependent notifications
    if (field === "emailNotifications" && !value) {
      onChange({
        ...settings,
        emailNotifications: false,
        shiftReminders: false,
        schedulePublished: false,
        memberJoined: false,
        shiftSwapRequests: false,
      });
    } else {
      onChange({ ...settings, [field]: value });
    }
  };

  const masterEnabled = settings.emailNotifications;

  return (
    <SettingSection
      title={t("settings:sections.notifications.title")}
      description={t("settings:sections.notifications.description")}
    >
      <ToggleSetting
        id="emailNotifications"
        label={t("settings:sections.notifications.emailNotifications")}
        description={t("settings:sections.notifications.emailDescription")}
        checked={settings.emailNotifications}
        onCheckedChange={(checked) =>
          handleFieldChange("emailNotifications", checked)
        }
        disabled={disabled}
      />

      <div className="border-t pt-4 space-y-4">
        <p className="text-sm font-medium">
          {t("settings:sections.notifications.sendNotificationsFor")}
        </p>

        <ToggleSetting
          id="shiftReminders"
          label={t("settings:sections.notifications.shiftReminders.label")}
          description={t(
            "settings:sections.notifications.shiftReminders.description",
          )}
          checked={settings.shiftReminders}
          onCheckedChange={(checked) =>
            handleFieldChange("shiftReminders", checked)
          }
          disabled={disabled || !masterEnabled}
        />

        <ToggleSetting
          id="schedulePublished"
          label={t("settings:sections.notifications.schedulePublished.label")}
          description={t(
            "settings:sections.notifications.schedulePublished.description",
          )}
          checked={settings.schedulePublished}
          onCheckedChange={(checked) =>
            handleFieldChange("schedulePublished", checked)
          }
          disabled={disabled || !masterEnabled}
        />

        <ToggleSetting
          id="memberJoined"
          label={t("settings:sections.notifications.memberJoined.label")}
          description={t(
            "settings:sections.notifications.memberJoined.description",
          )}
          checked={settings.memberJoined}
          onCheckedChange={(checked) =>
            handleFieldChange("memberJoined", checked)
          }
          disabled={disabled || !masterEnabled}
        />

        <ToggleSetting
          id="shiftSwapRequests"
          label={t("settings:sections.notifications.shiftSwapRequests.label")}
          description={t(
            "settings:sections.notifications.shiftSwapRequests.description",
          )}
          checked={settings.shiftSwapRequests}
          onCheckedChange={(checked) =>
            handleFieldChange("shiftSwapRequests", checked)
          }
          disabled={disabled || !masterEnabled}
        />
      </div>
    </SettingSection>
  );
}
