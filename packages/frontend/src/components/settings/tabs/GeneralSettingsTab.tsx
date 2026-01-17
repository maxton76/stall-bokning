import { useTranslation } from "react-i18next";
import { SettingField } from "../fields/SettingField";
import { SettingSection } from "../sections/SettingSection";

export interface StableInfo {
  name: string;
  description: string;
  address: string;
  city: string;
  postalCode: string;
}

interface GeneralSettingsTabProps {
  stableInfo: StableInfo;
  onChange: (info: StableInfo) => void;
  disabled?: boolean;
}

export function GeneralSettingsTab({
  stableInfo,
  onChange,
  disabled = false,
}: GeneralSettingsTabProps) {
  const { t } = useTranslation(["settings", "stables", "common"]);

  const handleFieldChange = (field: keyof StableInfo, value: string) => {
    onChange({ ...stableInfo, [field]: value });
  };

  return (
    <SettingSection
      title={t("settings:sections.general.title")}
      description={t("settings:sections.general.description")}
    >
      <SettingField
        id="name"
        label={t("stables:form.labels.name")}
        value={stableInfo.name}
        onChange={(value) => handleFieldChange("name", value)}
        placeholder={t("stables:form.placeholders.name")}
        disabled={disabled}
      />

      <SettingField
        id="description"
        label={t("stables:form.labels.description")}
        type="textarea"
        value={stableInfo.description}
        onChange={(value) => handleFieldChange("description", value)}
        placeholder={t("stables:form.placeholders.description")}
        rows={3}
        disabled={disabled}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SettingField
          id="address"
          label={t("stables:form.labels.address")}
          value={stableInfo.address}
          onChange={(value) => handleFieldChange("address", value)}
          placeholder={t("stables:form.placeholders.address")}
          disabled={disabled}
        />

        <SettingField
          id="city"
          label={t("stables:form.labels.city")}
          value={stableInfo.city}
          onChange={(value) => handleFieldChange("city", value)}
          placeholder={t("stables:form.placeholders.city")}
          disabled={disabled}
        />

        <SettingField
          id="postalCode"
          label={t("stables:form.labels.postalCode")}
          value={stableInfo.postalCode}
          onChange={(value) => handleFieldChange("postalCode", value)}
          placeholder={t("stables:form.placeholders.postalCode")}
          disabled={disabled}
        />
      </div>
    </SettingSection>
  );
}
