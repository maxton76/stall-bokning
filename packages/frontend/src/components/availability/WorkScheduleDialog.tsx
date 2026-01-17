import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import type { DaySchedule, WorkScheduleDisplay } from "@stall-bokning/shared";
import { DEFAULT_SCHEDULE } from "@/lib/availabilityConstants";

// Weekday keys for translation lookup (Sunday-first order)
const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

interface WorkScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    weeklySchedule: DaySchedule[];
    effectiveFrom: string;
    effectiveUntil?: string;
  }) => Promise<void>;
  existingSchedule?: WorkScheduleDisplay | null;
  userName?: string;
  isLoading?: boolean;
}

export function WorkScheduleDialog({
  open,
  onOpenChange,
  onSave,
  existingSchedule,
  userName,
  isLoading,
}: WorkScheduleDialogProps) {
  const { t } = useTranslation(["availability", "common"]);

  const dayScheduleSchema = z.object({
    dayOfWeek: z.number().min(0).max(6),
    startTime: z
      .string()
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    hours: z.number().min(0).max(24),
    isWorkDay: z.boolean(),
  });

  const workScheduleSchema = z.object({
    effectiveFrom: z
      .string()
      .min(1, t("workScheduleDialog.validation.effectiveFromRequired")),
    effectiveUntil: z.string().optional(),
    weeklySchedule: z.array(dayScheduleSchema).length(7),
  });

  type WorkScheduleFormData = z.infer<typeof workScheduleSchema>;

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<WorkScheduleFormData>({
    resolver: zodResolver(workScheduleSchema as any) as any,
    defaultValues: {
      effectiveFrom: format(new Date(), "yyyy-MM-dd"),
      effectiveUntil: "",
      weeklySchedule: DEFAULT_SCHEDULE,
    },
  });

  const { fields } = useFieldArray({
    control,
    name: "weeklySchedule",
  });

  // Reset form when dialog opens or existing schedule changes
  useEffect(() => {
    if (open) {
      if (existingSchedule) {
        reset({
          effectiveFrom: format(existingSchedule.effectiveFrom, "yyyy-MM-dd"),
          effectiveUntil: existingSchedule.effectiveUntil
            ? format(existingSchedule.effectiveUntil, "yyyy-MM-dd")
            : "",
          weeklySchedule: existingSchedule.weeklySchedule,
        });
      } else {
        reset({
          effectiveFrom: format(new Date(), "yyyy-MM-dd"),
          effectiveUntil: "",
          weeklySchedule: DEFAULT_SCHEDULE,
        });
      }
    }
  }, [open, existingSchedule, reset]);

  const weeklySchedule = watch("weeklySchedule");

  const totalHours = weeklySchedule.reduce(
    (sum, day) => sum + (day.isWorkDay ? day.hours : 0),
    0,
  );

  const onSubmit = async (data: WorkScheduleFormData) => {
    await onSave({
      weeklySchedule: data.weeklySchedule as DaySchedule[],
      effectiveFrom: data.effectiveFrom,
      effectiveUntil: data.effectiveUntil || undefined,
    });
  };

  const handleWorkDayToggle = (index: number, checked: boolean) => {
    setValue(`weeklySchedule.${index}.isWorkDay`, checked);
    if (!checked) {
      setValue(`weeklySchedule.${index}.hours`, 0);
    } else {
      setValue(`weeklySchedule.${index}.hours`, 8);
    }
  };

  // Get translated weekday name
  const getWeekdayName = (dayOfWeek: number): string => {
    return t(`weekdays.${WEEKDAY_KEYS[dayOfWeek]}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {existingSchedule
              ? t("workScheduleDialog.editTitle")
              : t("workScheduleDialog.setTitle")}
          </DialogTitle>
          <DialogDescription>
            {userName
              ? t("workScheduleDialog.description", { name: userName })
              : t("workScheduleDialog.descriptionGeneric")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Effective Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="effectiveFrom">
                {t("workScheduleDialog.effectiveFrom")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="effectiveFrom"
                type="date"
                {...register("effectiveFrom")}
              />
              {errors.effectiveFrom && (
                <p className="text-sm text-destructive">
                  {errors.effectiveFrom.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="effectiveUntil">
                {t("workScheduleDialog.effectiveUntil")}
              </Label>
              <Input
                id="effectiveUntil"
                type="date"
                {...register("effectiveUntil")}
              />
            </div>
          </div>

          {/* Weekly Schedule */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t("workScheduleDialog.weeklySchedule")}</Label>
              <span className="text-sm text-muted-foreground">
                {t("workScheduleDialog.totalHours", { hours: totalHours })}
              </span>
            </div>

            <div className="border rounded-lg divide-y">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-4 p-3">
                  <div className="w-24">
                    <span className="font-medium text-sm">
                      {getWeekdayName(field.dayOfWeek)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={weeklySchedule[index]?.isWorkDay ?? false}
                      onCheckedChange={(checked) =>
                        handleWorkDayToggle(index, checked)
                      }
                    />
                    <span className="text-sm text-muted-foreground w-16">
                      {weeklySchedule[index]?.isWorkDay
                        ? t("workScheduleDialog.workDay")
                        : t("workScheduleDialog.off")}
                    </span>
                  </div>

                  {weeklySchedule[index]?.isWorkDay && (
                    <>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground">
                          {t("workScheduleDialog.start")}
                        </Label>
                        <Input
                          type="time"
                          className="w-28"
                          {...register(`weeklySchedule.${index}.startTime`)}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground">
                          {t("workScheduleDialog.hours")}
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={24}
                          step={0.5}
                          className="w-20"
                          {...register(`weeklySchedule.${index}.hours`, {
                            valueAsNumber: true,
                          })}
                        />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting || isLoading}
            >
              {t("common:buttons.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoading}>
              {(isSubmitting || isLoading) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("workScheduleDialog.saveSchedule")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
