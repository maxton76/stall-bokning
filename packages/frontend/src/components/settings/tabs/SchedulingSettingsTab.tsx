import { useTranslation } from "react-i18next";
import { NumberField } from "../fields/NumberField";
import { ToggleSetting } from "../fields/ToggleSetting";
import { SettingSection } from "../sections/SettingSection";

export interface SchedulingSettings {
  scheduleHorizonDays: number;
  autoAssignment: boolean;
  allowSwaps: boolean;
  requireApproval: boolean;
}

interface SchedulingSettingsTabProps {
  settings: SchedulingSettings;
  onChange: (settings: SchedulingSettings) => void;
  disabled?: boolean;
}

export function SchedulingSettingsTab({
  settings,
  onChange,
  disabled = false,
}: SchedulingSettingsTabProps) {
  const { t } = useTranslation(["settings", "common"]);

  const handleFieldChange = <K extends keyof SchedulingSettings>(
    field: K,
    value: SchedulingSettings[K],
  ) => {
    onChange({ ...settings, [field]: value });
  };

  return (
    <SettingSection
      title={t("settings:sections.scheduling.title")}
      description={t("settings:sections.scheduling.description")}
    >
      <NumberField
        id="scheduleHorizon"
        label={t("settings:sections.scheduling.scheduleHorizon.label")}
        value={settings.scheduleHorizonDays}
        onChange={(value) => handleFieldChange("scheduleHorizonDays", value)}
        min={7}
        max={90}
        description={t(
          "settings:sections.scheduling.scheduleHorizon.description",
        )}
        disabled={disabled}
      />

      <ToggleSetting
        id="autoAssignment"
        label={t("settings:sections.scheduling.autoAssignment.label")}
        description={t(
          "settings:sections.scheduling.autoAssignment.description",
        )}
        checked={settings.autoAssignment}
        onCheckedChange={(checked) =>
          handleFieldChange("autoAssignment", checked)
        }
        disabled={disabled}
      />

      <ToggleSetting
        id="allowSwaps"
        label={t("settings:sections.scheduling.allowSwaps.label")}
        description={t("settings:sections.scheduling.allowSwaps.description")}
        checked={settings.allowSwaps}
        onCheckedChange={(checked) => handleFieldChange("allowSwaps", checked)}
        disabled={disabled}
      />

      <ToggleSetting
        id="requireApproval"
        label={t("settings:sections.scheduling.requireApproval.label")}
        description={t(
          "settings:sections.scheduling.requireApproval.description",
        )}
        checked={settings.requireApproval}
        onCheckedChange={(checked) =>
          handleFieldChange("requireApproval", checked)
        }
        disabled={disabled || !settings.allowSwaps}
      />
    </SettingSection>
  );
}
