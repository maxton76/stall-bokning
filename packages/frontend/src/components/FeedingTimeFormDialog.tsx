import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { BaseFormDialog } from "@/components/BaseFormDialog";
import { useFormDialog } from "@/hooks/useFormDialog";
import { FormInput } from "@/components/form";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FeedingTime, CreateFeedingTimeData } from "@shared/types";

const HOURS = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, "0"),
);
const MINUTES = ["00", "15", "30", "45"];

const feedingTimeSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must be 50 characters or less"),
  hour: z.string(),
  minute: z.string(),
});

type FeedingTimeFormData = z.infer<typeof feedingTimeSchema>;

interface FeedingTimeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedingTime?: FeedingTime;
  onSave: (data: CreateFeedingTimeData) => Promise<void>;
}

export function FeedingTimeFormDialog({
  open,
  onOpenChange,
  feedingTime,
  onSave,
}: FeedingTimeFormDialogProps) {
  const { t } = useTranslation(["feeding", "common"]);
  const isEditMode = !!feedingTime;

  const { form, handleSubmit, resetForm } = useFormDialog<FeedingTimeFormData>({
    schema: feedingTimeSchema,
    defaultValues: {
      name: "",
      hour: "07",
      minute: "00",
    },
    onSubmit: async (data) => {
      const time = `${data.hour}:${data.minute}`;
      await onSave({
        name: data.name.trim(),
        time,
      });
    },
    onSuccess: () => {
      onOpenChange(false);
    },
    successMessage: isEditMode
      ? t("feeding:feedingTimes.messages.updateSuccess")
      : t("feeding:feedingTimes.messages.createSuccess"),
    errorMessage: isEditMode
      ? t("feeding:feedingTimes.messages.updateError")
      : t("feeding:feedingTimes.messages.createError"),
  });

  // Reset form when dialog opens with feeding time data
  useEffect(() => {
    if (feedingTime) {
      const [hour, minute] = feedingTime.time.split(":");
      resetForm({
        name: feedingTime.name,
        hour: hour || "07",
        minute: minute || "00",
      });
    } else {
      resetForm({
        name: "",
        hour: "07",
        minute: "00",
      });
    }
  }, [feedingTime, open]);

  const dialogTitle = isEditMode
    ? t("feeding:feedingTimes.form.title.edit")
    : t("feeding:feedingTimes.form.title.create");
  const dialogDescription = isEditMode
    ? t("feeding:feedingTimes.form.description.edit")
    : t("feeding:feedingTimes.form.description.create");

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={dialogTitle}
      description={dialogDescription}
      form={form}
      onSubmit={handleSubmit}
      submitLabel={
        isEditMode ? t("common:buttons.update") : t("common:buttons.create")
      }
      maxWidth="sm:max-w-[400px]"
    >
      <FormInput
        name="name"
        label={t("feeding:feedingTimes.form.labels.name")}
        form={form}
        placeholder={t("feeding:feedingTimes.form.placeholders.name")}
        required
      />

      <div className="space-y-2">
        <Label>
          {t("feeding:feedingTimes.form.labels.time")}{" "}
          <span className="text-destructive ml-1">*</span>
        </Label>
        <div className="flex gap-2">
          <Select
            value={form.watch("hour")}
            onValueChange={(value) => form.setValue("hour", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={t("feeding:feedingTimes.form.labels.hour")}
              />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map((hour) => (
                <SelectItem key={hour} value={hour}>
                  {hour}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="flex items-center text-muted-foreground">:</span>
          <Select
            value={form.watch("minute")}
            onValueChange={(value) => form.setValue("minute", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={t("feeding:feedingTimes.form.labels.minute")}
              />
            </SelectTrigger>
            <SelectContent>
              {MINUTES.map((minute) => (
                <SelectItem key={minute} value={minute}>
                  {minute}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("feeding:feedingTimes.form.selectedTime")} {form.watch("hour")}:
          {form.watch("minute")}
        </p>
      </div>
    </BaseFormDialog>
  );
}
