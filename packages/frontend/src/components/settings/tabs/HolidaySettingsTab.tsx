import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, Gift, Scale } from "lucide-react";
import { ToggleSetting } from "../fields/ToggleSetting";
import { NumberField } from "../fields/NumberField";
import { SettingSection } from "../sections/SettingSection";
import { Badge } from "@/components/ui/badge";
import {
  holidayService,
  type HolidayCalendarSettings,
  DEFAULT_HOLIDAY_SETTINGS,
} from "@stall-bokning/shared";

export interface HolidaySettings extends HolidayCalendarSettings {}

interface HolidaySettingsTabProps {
  settings: HolidaySettings;
  onChange: (settings: HolidaySettings) => void;
  disabled?: boolean;
}

export function HolidaySettingsTab({
  settings,
  onChange,
  disabled = false,
}: HolidaySettingsTabProps) {
  const { t, i18n } = useTranslation(["settings", "common", "holidays"]);

  // Get upcoming holidays for the preview
  const upcomingHolidays = useMemo(() => {
    const now = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 6); // Next 6 months
    return holidayService.getHolidaysInRange(
      now,
      endDate,
      settings.countryCode,
    );
  }, [settings.countryCode]);

  const handleFieldChange = <K extends keyof HolidaySettings>(
    field: K,
    value: HolidaySettings[K],
  ) => {
    onChange({ ...settings, [field]: value });
  };

  const locale = i18n.language === "en" ? "en" : "sv";

  return (
    <div className="space-y-6">
      {/* Display Settings */}
      <SettingSection
        title={t("settings:sections.holidays.display.title")}
        description={t("settings:sections.holidays.display.description")}
        icon={Calendar}
      >
        <ToggleSetting
          id="enableHolidayDisplay"
          label={t("settings:sections.holidays.display.enableLabel")}
          description={t(
            "settings:sections.holidays.display.enableDescription",
          )}
          checked={settings.enableHolidayDisplay}
          onCheckedChange={(checked) =>
            handleFieldChange("enableHolidayDisplay", checked)
          }
          disabled={disabled}
        />
      </SettingSection>

      {/* Fairness Algorithm Settings */}
      <SettingSection
        title={t("settings:sections.holidays.fairness.title")}
        description={t("settings:sections.holidays.fairness.description")}
        icon={Scale}
      >
        <ToggleSetting
          id="enableHolidayMultiplier"
          label={t("settings:sections.holidays.fairness.enableLabel")}
          description={t(
            "settings:sections.holidays.fairness.enableDescription",
          )}
          checked={settings.enableHolidayMultiplier}
          onCheckedChange={(checked) =>
            handleFieldChange("enableHolidayMultiplier", checked)
          }
          disabled={disabled}
        />

        {settings.enableHolidayMultiplier && (
          <NumberField
            id="holidayMultiplier"
            label={t("settings:sections.holidays.fairness.multiplierLabel")}
            description={t(
              "settings:sections.holidays.fairness.multiplierDescription",
            )}
            value={settings.holidayMultiplier}
            onChange={(value) => handleFieldChange("holidayMultiplier", value)}
            min={1.0}
            max={3.0}
            step={0.1}
            disabled={disabled || !settings.enableHolidayMultiplier}
          />
        )}
      </SettingSection>

      {/* Scheduling Restrictions */}
      <SettingSection
        title={t("settings:sections.holidays.restrictions.title")}
        description={t("settings:sections.holidays.restrictions.description")}
      >
        <ToggleSetting
          id="enableSchedulingRestrictions"
          label={t("settings:sections.holidays.restrictions.enableLabel")}
          description={t(
            "settings:sections.holidays.restrictions.enableDescription",
          )}
          checked={settings.enableSchedulingRestrictions}
          onCheckedChange={(checked) =>
            handleFieldChange("enableSchedulingRestrictions", checked)
          }
          disabled={disabled}
        />
      </SettingSection>

      {/* Upcoming Holidays Preview */}
      {settings.enableHolidayDisplay && (
        <SettingSection
          title={t("settings:sections.holidays.preview.title")}
          description={t("settings:sections.holidays.preview.description")}
          icon={Gift}
        >
          <div className="space-y-2">
            {upcomingHolidays.length > 0 ? (
              <div className="grid gap-2">
                {upcomingHolidays.slice(0, 10).map((holiday) => {
                  const date = new Date(holiday.date);
                  const formattedDate = date.toLocaleDateString(
                    locale === "en" ? "en-US" : "sv-SE",
                    {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    },
                  );
                  const holidayName =
                    locale === "en" ? holiday.nameEn : holiday.name;

                  return (
                    <div
                      key={holiday.date}
                      className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {holidayName}
                        </span>
                        {holiday.isPublicHoliday && (
                          <Badge variant="secondary" className="text-xs">
                            {t(
                              "settings:sections.holidays.preview.publicHoliday",
                            )}
                          </Badge>
                        )}
                        {holiday.isHalfDay && (
                          <Badge variant="outline" className="text-xs">
                            {t("settings:sections.holidays.preview.halfDay")}
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formattedDate}
                      </span>
                    </div>
                  );
                })}
                {upcomingHolidays.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    {t("settings:sections.holidays.preview.moreHolidays", {
                      count: upcomingHolidays.length - 10,
                    })}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("settings:sections.holidays.preview.noHolidays")}
              </p>
            )}
          </div>
        </SettingSection>
      )}
    </div>
  );
}
