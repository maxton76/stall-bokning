import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TimeBlockList } from "./TimeBlockList";
import type {
  DayOfWeek,
  FacilityDaySchedule,
  TimeBlock,
} from "@/types/facility";

interface DayScheduleRowProps {
  day: DayOfWeek;
  schedule: FacilityDaySchedule;
  onChange: (schedule: FacilityDaySchedule) => void;
}

export function DayScheduleRow({
  day,
  schedule,
  onChange,
}: DayScheduleRowProps) {
  const { t } = useTranslation("facilities");
  const hasOverride = schedule.timeBlocks.length > 0;

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`day-${day}`}
            checked={schedule.available}
            onCheckedChange={(checked) =>
              onChange({ ...schedule, available: checked === true })
            }
          />
          <Label htmlFor={`day-${day}`} className="font-medium cursor-pointer">
            {t(`daysLong.${day}`)}
          </Label>
        </div>

        {schedule.available && (
          <div className="flex items-center gap-2">
            <Label
              htmlFor={`override-${day}`}
              className="text-xs text-muted-foreground cursor-pointer"
            >
              {t("schedule.customHours")}
            </Label>
            <Switch
              id={`override-${day}`}
              checked={hasOverride}
              onCheckedChange={(checked) => {
                if (checked) {
                  onChange({
                    ...schedule,
                    timeBlocks: [{ from: "08:00", to: "20:00" }],
                  });
                } else {
                  onChange({ ...schedule, timeBlocks: [] });
                }
              }}
            />
          </div>
        )}
      </div>

      {schedule.available && hasOverride && (
        <div className="pl-6">
          <TimeBlockList
            blocks={schedule.timeBlocks}
            onChange={(blocks: TimeBlock[]) =>
              onChange({ ...schedule, timeBlocks: blocks })
            }
          />
        </div>
      )}

      {schedule.available && !hasOverride && (
        <p className="pl-6 text-xs text-muted-foreground">
          {t("schedule.usesDefault")}
        </p>
      )}
    </div>
  );
}
