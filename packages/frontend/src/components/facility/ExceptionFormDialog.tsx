import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { BaseFormDialog } from "@/components/BaseFormDialog";
import { useFormDialog } from "@/hooks/useFormDialog";
import { FormSelect, FormInput } from "@/components/form";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { TimeBlockList } from "./TimeBlockList";
import type { TimeBlock } from "@/types/facility";
import { useState } from "react";

type ExceptionType = "closed" | "modified";

interface ExceptionFormData {
  date: Date;
  type: ExceptionType;
  reason?: string;
}

interface ExceptionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    date: string;
    type: ExceptionType;
    timeBlocks: TimeBlock[];
    reason?: string;
  }) => Promise<void>;
  existingDates?: string[];
}

export function ExceptionFormDialog({
  open,
  onOpenChange,
  onSave,
  existingDates = [],
}: ExceptionFormDialogProps) {
  const { t } = useTranslation("facilities");
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([
    { from: "08:00", to: "20:00" },
  ]);

  const schema = useMemo(
    () =>
      z.object({
        date: z.date({ message: t("schedule.validation.dateRequired") }),
        type: z.enum(["closed", "modified"]),
        reason: z.string().optional(),
      }),
    [t],
  );

  const typeOptions = useMemo(
    () => [
      { value: "closed", label: t("schedule.exceptionType.closed") },
      { value: "modified", label: t("schedule.exceptionType.modified") },
    ],
    [t],
  );

  const { form, handleSubmit, resetForm } = useFormDialog<ExceptionFormData>({
    schema,
    defaultValues: {
      date: new Date(),
      type: "closed" as ExceptionType,
      reason: "",
    },
    onSubmit: async (data) => {
      const dateStr = format(data.date, "yyyy-MM-dd");

      if (existingDates.includes(dateStr)) {
        throw new Error(t("schedule.validation.duplicateException"));
      }

      await onSave({
        date: dateStr,
        type: data.type,
        timeBlocks: data.type === "modified" ? timeBlocks : [],
        reason: data.reason || undefined,
      });
    },
    onSuccess: () => {
      onOpenChange(false);
      resetForm();
      setTimeBlocks([{ from: "08:00", to: "20:00" }]);
    },
    successMessage: t("schedule.messages.exceptionAdded"),
    errorMessage: t("schedule.messages.exceptionError"),
  });

  const watchedType = form.watch("type");
  const watchedDate = form.watch("date");

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("schedule.addException")}
      description={t("schedule.addExceptionDescription")}
      form={form}
      onSubmit={handleSubmit}
      submitLabel={t("schedule.addException")}
      maxWidth="sm:max-w-[450px]"
    >
      {/* Date Picker */}
      <div className="space-y-2">
        <Label>
          {t("reservation.labels.date")}{" "}
          <span className="text-destructive">*</span>
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !watchedDate && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {watchedDate
                ? format(watchedDate, "PPP")
                : t("reservation.placeholders.date")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={watchedDate}
              onSelect={(date) => date && form.setValue("date", date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <FormSelect
        name="type"
        label={t("schedule.exceptionTypeLabel")}
        form={form}
        options={typeOptions}
        required
      />

      {watchedType === "modified" && (
        <div className="space-y-2">
          <Label>{t("schedule.customHours")}</Label>
          <TimeBlockList blocks={timeBlocks} onChange={setTimeBlocks} />
        </div>
      )}

      <FormInput
        name="reason"
        label={t("schedule.reason")}
        form={form}
        placeholder={t("schedule.reasonPlaceholder")}
      />
    </BaseFormDialog>
  );
}
