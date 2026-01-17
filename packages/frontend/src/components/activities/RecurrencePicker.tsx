import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ChevronDown, Clock, Repeat, Wand2 } from "lucide-react";
import {
  ALL_RECURRENCE_PRESETS,
  DAILY_CARE_PRESETS,
  WEEKLY_CARE_PRESETS,
  HEALTH_CARE_PRESETS,
  RRULE_FREQUENCIES,
  RRULE_DAYS,
  RECURRING_ACTIVITY_CATEGORIES,
  type RecurrencePreset,
} from "@stall-bokning/shared";
import type { RecurringActivityCategory } from "@stall-bokning/shared";

interface RecurrencePickerProps {
  value: {
    recurrenceRule: string;
    timeOfDay: string;
    duration: number;
    category: RecurringActivityCategory;
  };
  onChange: (value: {
    recurrenceRule: string;
    timeOfDay: string;
    duration: number;
    category: RecurringActivityCategory;
  }) => void;
  className?: string;
}

/**
 * Parse RRULE string to components
 */
function parseRRule(rrule: string): {
  freq: string;
  interval: number;
  byDay: string[];
} {
  const result = {
    freq: "DAILY",
    interval: 1,
    byDay: [] as string[],
  };

  const rule = rrule.replace("RRULE:", "");
  const parts = rule.split(";");

  for (const part of parts) {
    const [key, value] = part.split("=");
    switch (key) {
      case "FREQ":
        result.freq = value;
        break;
      case "INTERVAL":
        result.interval = parseInt(value, 10);
        break;
      case "BYDAY":
        result.byDay = value.split(",");
        break;
    }
  }

  return result;
}

/**
 * Build RRULE string from components
 */
function buildRRule(freq: string, interval: number, byDay: string[]): string {
  let rule = `RRULE:FREQ=${freq}`;
  if (interval > 1) {
    rule += `;INTERVAL=${interval}`;
  }
  if (byDay.length > 0 && freq === "WEEKLY") {
    rule += `;BYDAY=${byDay.join(",")}`;
  }
  return rule;
}

export function RecurrencePicker({
  value,
  onChange,
  className,
}: RecurrencePickerProps) {
  const { t } = useTranslation(["recurrence", "common"]);
  const [mode, setMode] = useState<"presets" | "custom">("presets");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  const parsed = useMemo(
    () => parseRRule(value.recurrenceRule),
    [value.recurrenceRule],
  );

  const handlePresetSelect = (preset: RecurrencePreset) => {
    setSelectedPresetId(preset.id);
    onChange({
      recurrenceRule: preset.rrule,
      timeOfDay: preset.defaultTime || value.timeOfDay,
      duration: preset.defaultDuration,
      category: preset.category,
    });
  };

  const handleFrequencyChange = (freq: string) => {
    const newRule = buildRRule(
      freq,
      parsed.interval,
      freq === "WEEKLY" ? parsed.byDay : [],
    );
    onChange({ ...value, recurrenceRule: newRule });
  };

  const handleIntervalChange = (interval: number) => {
    const newRule = buildRRule(parsed.freq, interval, parsed.byDay);
    onChange({ ...value, recurrenceRule: newRule });
  };

  const handleDayToggle = (day: string, checked: boolean) => {
    const newDays = checked
      ? [...parsed.byDay, day]
      : parsed.byDay.filter((d) => d !== day);
    const newRule = buildRRule(parsed.freq, parsed.interval, newDays);
    onChange({ ...value, recurrenceRule: newRule });
  };

  const handleTimeChange = (time: string) => {
    onChange({ ...value, timeOfDay: time });
  };

  const handleDurationChange = (duration: number) => {
    onChange({ ...value, duration });
  };

  const handleCategoryChange = (category: RecurringActivityCategory) => {
    onChange({ ...value, category });
  };

  // Get human-readable description of recurrence
  const recurrenceDescription = useMemo(() => {
    const { freq, interval, byDay } = parsed;
    let desc = "";

    switch (freq) {
      case "DAILY":
        desc =
          interval === 1
            ? t("recurrence:descriptions.daily")
            : t("recurrence:descriptions.everyNDays", { n: interval });
        break;
      case "WEEKLY":
        if (byDay.length > 0) {
          const dayNames = byDay
            .map((d) => t(`common:days.${d.toLowerCase()}`))
            .join(", ");
          desc = t("recurrence:descriptions.weeklyOn", { days: dayNames });
        } else {
          desc =
            interval === 1
              ? t("recurrence:descriptions.weekly")
              : t("recurrence:descriptions.everyNWeeks", { n: interval });
        }
        break;
      case "MONTHLY":
        desc =
          interval === 1
            ? t("recurrence:descriptions.monthly")
            : t("recurrence:descriptions.everyNMonths", { n: interval });
        break;
      case "YEARLY":
        desc =
          interval === 1
            ? t("recurrence:descriptions.yearly")
            : t("recurrence:descriptions.everyNYears", { n: interval });
        break;
    }

    return `${desc} ${t("recurrence:descriptions.at")} ${value.timeOfDay}`;
  }, [parsed, value.timeOfDay, t]);

  return (
    <div className={cn("space-y-4", className)}>
      <Tabs
        value={mode}
        onValueChange={(v) => setMode(v as "presets" | "custom")}
      >
        <TabsList className="w-full">
          <TabsTrigger value="presets" className="flex-1">
            <Wand2 className="h-4 w-4 mr-2" />
            {t("recurrence:tabs.presets")}
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex-1">
            <Repeat className="h-4 w-4 mr-2" />
            {t("recurrence:tabs.custom")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="presets" className="space-y-4">
          {/* Daily Care Presets */}
          <PresetGroup
            title={t("recurrence:presetGroups.dailyCare")}
            presets={DAILY_CARE_PRESETS}
            selectedId={selectedPresetId}
            onSelect={handlePresetSelect}
          />

          {/* Weekly Care Presets */}
          <PresetGroup
            title={t("recurrence:presetGroups.weeklyCare")}
            presets={WEEKLY_CARE_PRESETS}
            selectedId={selectedPresetId}
            onSelect={handlePresetSelect}
          />

          {/* Health Care Presets */}
          <PresetGroup
            title={t("recurrence:presetGroups.healthCare")}
            presets={HEALTH_CARE_PRESETS}
            selectedId={selectedPresetId}
            onSelect={handlePresetSelect}
          />
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          {/* Category */}
          <div className="space-y-2">
            <Label>{t("recurrence:fields.category")}</Label>
            <Select value={value.category} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECURRING_ACTIVITY_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{t(cat.labelKey)}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label>{t("recurrence:fields.frequency")}</Label>
            <Select value={parsed.freq} onValueChange={handleFrequencyChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RRULE_FREQUENCIES.map((freq) => (
                  <SelectItem key={freq.value} value={freq.value}>
                    {t(freq.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Interval */}
          <div className="space-y-2">
            <Label>{t("recurrence:fields.interval")}</Label>
            <Input
              type="number"
              min={1}
              max={52}
              value={parsed.interval}
              onChange={(e) =>
                handleIntervalChange(parseInt(e.target.value, 10) || 1)
              }
            />
          </div>

          {/* Days of Week (for weekly) */}
          {parsed.freq === "WEEKLY" && (
            <div className="space-y-2">
              <Label>{t("recurrence:fields.daysOfWeek")}</Label>
              <div className="flex flex-wrap gap-2">
                {RRULE_DAYS.map((day) => (
                  <label
                    key={day.value}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer transition-colors",
                      parsed.byDay.includes(day.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted",
                    )}
                  >
                    <Checkbox
                      checked={parsed.byDay.includes(day.value)}
                      onCheckedChange={(checked) =>
                        handleDayToggle(day.value, checked === true)
                      }
                      className="sr-only"
                    />
                    {t(day.labelKey)}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Time of Day */}
          <div className="space-y-2">
            <Label>{t("recurrence:fields.timeOfDay")}</Label>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input
                type="time"
                value={value.timeOfDay}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-32"
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>{t("recurrence:fields.duration")}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={5}
                max={480}
                step={5}
                value={value.duration}
                onChange={(e) =>
                  handleDurationChange(parseInt(e.target.value, 10) || 30)
                }
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                {t("recurrence:fields.minutes")}
              </span>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Summary */}
      <div className="p-3 bg-muted rounded-md">
        <span className="text-sm font-medium">{t("recurrence:summary")}:</span>
        <p className="text-sm text-muted-foreground mt-1">
          {recurrenceDescription}
        </p>
      </div>
    </div>
  );
}

/**
 * Preset group with collapsible content
 */
interface PresetGroupProps {
  title: string;
  presets: RecurrencePreset[];
  selectedId: string | null;
  onSelect: (preset: RecurrencePreset) => void;
}

function PresetGroup({
  title,
  presets,
  selectedId,
  onSelect,
}: PresetGroupProps) {
  const { t } = useTranslation(["recurrence"]);
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 rounded-md hover:bg-muted">
        <span className="font-medium text-sm">{title}</span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {presets.map((preset) => (
            <Button
              key={preset.id}
              variant={selectedId === preset.id ? "default" : "outline"}
              size="sm"
              className={cn(
                "justify-start h-auto py-2 px-3",
                selectedId === preset.id && "ring-2 ring-ring",
              )}
              onClick={() => onSelect(preset)}
            >
              <span className="mr-2">{preset.icon}</span>
              <div className="text-left">
                <div className="text-sm font-medium">{t(preset.labelKey)}</div>
                <div className="text-xs text-muted-foreground">
                  {preset.defaultTime}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
