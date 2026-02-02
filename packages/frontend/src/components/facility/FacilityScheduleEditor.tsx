import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { TimeBlockList } from "./TimeBlockList";
import { DayScheduleRow } from "./DayScheduleRow";
import type {
  DayOfWeek,
  WeeklySchedule,
  TimeBlock,
  FacilityDaySchedule,
} from "@/types/facility";
import { DAYS_OF_WEEK } from "@equiduty/shared";

interface FacilityScheduleEditorProps {
  schedule: WeeklySchedule;
  onChange: (schedule: WeeklySchedule) => void;
}

export function FacilityScheduleEditor({
  schedule,
  onChange,
}: FacilityScheduleEditorProps) {
  const { t } = useTranslation("facilities");

  const handleDefaultBlocksChange = (blocks: TimeBlock[]) => {
    onChange({ ...schedule, defaultTimeBlocks: blocks });
  };

  const handleDayChange = (
    day: DayOfWeek,
    daySchedule: FacilityDaySchedule,
  ) => {
    onChange({
      ...schedule,
      days: { ...schedule.days, [day]: daySchedule },
    });
  };

  return (
    <div className="space-y-4">
      {/* Default time blocks */}
      <div className="space-y-2">
        <Label className="font-medium">{t("schedule.defaultHours")}</Label>
        <p className="text-xs text-muted-foreground">
          {t("schedule.defaultHoursDescription")}
        </p>
        <TimeBlockList
          blocks={schedule.defaultTimeBlocks}
          onChange={handleDefaultBlocksChange}
        />
      </div>

      {/* Per-day schedule */}
      <div className="space-y-2">
        <Label className="font-medium">{t("schedule.weeklySchedule")}</Label>
        <div className="space-y-2">
          {DAYS_OF_WEEK.map((day) => (
            <DayScheduleRow
              key={day}
              day={day}
              schedule={schedule.days[day]}
              onChange={(ds) => handleDayChange(day, ds)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
