import { useTranslation, Trans } from "react-i18next";
import { NumberField } from "../fields/NumberField";
import { SelectField } from "../fields/SelectField";
import { SettingSection } from "../sections/SettingSection";

export interface WeightingSettings {
  memoryHorizonDays: number;
  resetPeriod: "monthly" | "quarterly" | "yearly" | "rolling" | "never";
  pointsMultiplier: number;
}

interface WeightingSettingsTabProps {
  settings: WeightingSettings;
  onChange: (settings: WeightingSettings) => void;
  disabled?: boolean;
}

export function WeightingSettingsTab({
  settings,
  onChange,
  disabled = false,
}: WeightingSettingsTabProps) {
  const { t } = useTranslation(["settings", "common"]);

  const RESET_PERIOD_OPTIONS = [
    {
      value: "monthly",
      label: t("settings:sections.weighting.resetPeriods.monthly"),
    },
    {
      value: "quarterly",
      label: t("settings:sections.weighting.resetPeriods.quarterly"),
    },
    {
      value: "yearly",
      label: t("settings:sections.weighting.resetPeriods.yearly"),
    },
    {
      value: "rolling",
      label: t("settings:sections.weighting.resetPeriods.rolling"),
    },
    {
      value: "never",
      label: t("settings:sections.weighting.resetPeriods.never"),
    },
  ];

  const handleFieldChange = <K extends keyof WeightingSettings>(
    field: K,
    value: WeightingSettings[K],
  ) => {
    onChange({ ...settings, [field]: value });
  };

  const getResetPeriodLabel = (period: string) => {
    return t(`settings:sections.weighting.resetPeriods.${period}`);
  };

  return (
    <SettingSection
      title={t("settings:sections.weighting.title")}
      description={t("settings:sections.weighting.description")}
    >
      <NumberField
        id="memoryHorizon"
        label={t("settings:sections.weighting.memoryHorizon.label")}
        value={settings.memoryHorizonDays}
        onChange={(value) => handleFieldChange("memoryHorizonDays", value)}
        min={30}
        max={365}
        description={t("settings:sections.weighting.memoryHorizon.description")}
        disabled={disabled}
      />

      <SelectField
        id="resetPeriod"
        label={t("settings:sections.weighting.resetPeriod.label")}
        value={settings.resetPeriod}
        onChange={(value) =>
          handleFieldChange(
            "resetPeriod",
            value as WeightingSettings["resetPeriod"],
          )
        }
        options={RESET_PERIOD_OPTIONS}
        description={t("settings:sections.weighting.resetPeriod.description")}
        disabled={disabled}
      />

      <NumberField
        id="pointsMultiplier"
        label={t("settings:sections.weighting.pointsMultiplier.label")}
        value={settings.pointsMultiplier}
        onChange={(value) => handleFieldChange("pointsMultiplier", value)}
        min={0.1}
        max={5.0}
        step={0.1}
        description={t(
          "settings:sections.weighting.pointsMultiplier.description",
        )}
        disabled={disabled}
      />

      <div className="rounded-lg bg-muted p-4">
        <h4 className="font-medium mb-2">
          {t("settings:sections.weighting.preview.title")}
        </h4>
        <p className="text-sm text-muted-foreground">
          <Trans
            i18nKey="settings:sections.weighting.preview.description"
            values={{
              days: settings.memoryHorizonDays,
              period: getResetPeriodLabel(settings.resetPeriod).toLowerCase(),
            }}
            components={{ strong: <strong /> }}
          />
        </p>
      </div>
    </SettingSection>
  );
}
