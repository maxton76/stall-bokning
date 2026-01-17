import { useEffect } from "react";
import { z } from "zod";
import { format, differenceInDays } from "date-fns";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { PartialDayType } from "@stall-bokning/shared";

const requestLeaveSchema = z
  .object({
    firstDay: z.string().min(1, "First day is required"),
    lastDay: z.string().min(1, "Last day is required"),
    note: z.string().optional(),
    isPartialDay: z.boolean().default(false),
    partialDayType: z.enum(["morning", "afternoon", "custom"]).optional(),
    partialDayStartTime: z.string().optional(),
    partialDayEndTime: z.string().optional(),
  })
  .refine(
    (data) => {
      const first = new Date(data.firstDay);
      const last = new Date(data.lastDay);
      return last >= first;
    },
    {
      message: "Last day must be on or after first day",
      path: ["lastDay"],
    },
  )
  .refine(
    (data) => {
      // If partial day is enabled, must select a type
      if (data.isPartialDay && !data.partialDayType) {
        return false;
      }
      return true;
    },
    {
      message: "Please select a partial day type",
      path: ["partialDayType"],
    },
  )
  .refine(
    (data) => {
      // If custom partial day, must have both times
      if (data.isPartialDay && data.partialDayType === "custom") {
        return data.partialDayStartTime && data.partialDayEndTime;
      }
      return true;
    },
    {
      message: "Please specify start and end times",
      path: ["partialDayStartTime"],
    },
  )
  .refine(
    (data) => {
      // If custom times, end must be after start
      if (
        data.isPartialDay &&
        data.partialDayType === "custom" &&
        data.partialDayStartTime &&
        data.partialDayEndTime
      ) {
        return data.partialDayEndTime > data.partialDayStartTime;
      }
      return true;
    },
    {
      message: "End time must be after start time",
      path: ["partialDayEndTime"],
    },
  )
  .refine(
    (data) => {
      // If partial day, first and last day must be the same
      if (data.isPartialDay && data.firstDay !== data.lastDay) {
        return false;
      }
      return true;
    },
    {
      message: "Partial day leave must be for a single day",
      path: ["lastDay"],
    },
  );

type RequestLeaveFormData = z.infer<typeof requestLeaveSchema>;

interface RequestLeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: RequestLeaveFormData) => Promise<void>;
  organizationId: string;
}

export function RequestLeaveDialog({
  open,
  onOpenChange,
  onSave,
}: RequestLeaveDialogProps) {
  const { t } = useTranslation(["availability", "common"]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RequestLeaveFormData>({
    resolver: zodResolver(requestLeaveSchema as any) as any,
    defaultValues: {
      firstDay: "",
      lastDay: "",
      note: "",
      isPartialDay: false,
      partialDayType: undefined,
      partialDayStartTime: "",
      partialDayEndTime: "",
    },
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      reset({
        firstDay: "",
        lastDay: "",
        note: "",
        isPartialDay: false,
        partialDayType: undefined,
        partialDayStartTime: "",
        partialDayEndTime: "",
      });
    }
  }, [open, reset]);

  const firstDay = watch("firstDay");
  const lastDay = watch("lastDay");
  const isPartialDay = watch("isPartialDay");
  const partialDayType = watch("partialDayType");

  // Calculate duration if both dates are set
  const duration =
    firstDay && lastDay
      ? differenceInDays(new Date(lastDay), new Date(firstDay)) + 1
      : 0;

  // When partial day is toggled on, sync lastDay with firstDay
  useEffect(() => {
    if (isPartialDay && firstDay) {
      setValue("lastDay", firstDay);
    }
  }, [isPartialDay, firstDay, setValue]);

  // Set default times based on partial day type
  useEffect(() => {
    if (partialDayType === "morning") {
      setValue("partialDayStartTime", "06:00");
      setValue("partialDayEndTime", "12:00");
    } else if (partialDayType === "afternoon") {
      setValue("partialDayStartTime", "12:00");
      setValue("partialDayEndTime", "18:00");
    }
  }, [partialDayType, setValue]);

  const onSubmit = async (data: RequestLeaveFormData) => {
    await onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("availability:leave.requestTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          {/* Partial Day Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isPartialDay">
                {t("availability:leave.partialDay")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("availability:leave.partialDayDescription")}
              </p>
            </div>
            <Controller
              name="isPartialDay"
              control={control}
              render={({ field }) => (
                <Switch
                  id="isPartialDay"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          {/* Date Inputs */}
          <div className="space-y-2">
            <Label htmlFor="firstDay">
              {isPartialDay
                ? t("availability:leave.date")
                : t("availability:leave.firstDay")}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="firstDay"
              type="date"
              {...register("firstDay")}
              min={format(new Date(), "yyyy-MM-dd")}
            />
            {errors.firstDay && (
              <p className="text-sm text-destructive">
                {errors.firstDay.message}
              </p>
            )}
          </div>

          {!isPartialDay && (
            <div className="space-y-2">
              <Label htmlFor="lastDay">
                {t("availability:leave.lastDay")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastDay"
                type="date"
                {...register("lastDay")}
                min={firstDay || format(new Date(), "yyyy-MM-dd")}
              />
              {errors.lastDay && (
                <p className="text-sm text-destructive">
                  {errors.lastDay.message}
                </p>
              )}
              {duration > 0 && (
                <p className="text-sm text-muted-foreground">
                  {t("availability:leave.durationDays", { count: duration })}
                </p>
              )}
            </div>
          )}

          {/* Partial Day Options */}
          {isPartialDay && (
            <>
              <div className="space-y-2">
                <Label htmlFor="partialDayType">
                  {t("availability:leave.partialDayType")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="partialDayType"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || ""}
                      onValueChange={(value) =>
                        field.onChange(value as PartialDayType)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            "availability:leave.selectPartialDayType",
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">
                          {t("availability:leave.morning")}
                        </SelectItem>
                        <SelectItem value="afternoon">
                          {t("availability:leave.afternoon")}
                        </SelectItem>
                        <SelectItem value="custom">
                          {t("availability:leave.custom")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.partialDayType && (
                  <p className="text-sm text-destructive">
                    {errors.partialDayType.message}
                  </p>
                )}
              </div>

              {/* Custom Time Inputs */}
              {partialDayType === "custom" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="partialDayStartTime">
                      {t("availability:leave.startTime")}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="partialDayStartTime"
                      type="time"
                      {...register("partialDayStartTime")}
                    />
                    {errors.partialDayStartTime && (
                      <p className="text-sm text-destructive">
                        {errors.partialDayStartTime.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partialDayEndTime">
                      {t("availability:leave.endTime")}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="partialDayEndTime"
                      type="time"
                      {...register("partialDayEndTime")}
                    />
                    {errors.partialDayEndTime && (
                      <p className="text-sm text-destructive">
                        {errors.partialDayEndTime.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Show times for preset options */}
              {partialDayType && partialDayType !== "custom" && (
                <p className="text-sm text-muted-foreground">
                  {partialDayType === "morning"
                    ? t("availability:leave.morningHours")
                    : t("availability:leave.afternoonHours")}
                </p>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="note">{t("availability:leave.note")}</Label>
            <Textarea
              id="note"
              {...register("note")}
              placeholder={t("availability:leave.notePlaceholder")}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common:buttons.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? t("common:labels.loading")
                : t("common:buttons.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
