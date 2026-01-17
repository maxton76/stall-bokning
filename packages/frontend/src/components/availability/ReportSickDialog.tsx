import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { format, subDays } from "date-fns";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";

type DateOption = "yesterday" | "today" | "other";

interface ReportSickDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { firstSickDay: string; note?: string }) => Promise<void>;
  organizationId: string;
}

export function ReportSickDialog({
  open,
  onOpenChange,
  onSave,
  organizationId,
}: ReportSickDialogProps) {
  const { t } = useTranslation(["availability", "common"]);
  const [dateOption, setDateOption] = useState<DateOption>("today");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const reportSickSchema = z.object({
    firstSickDay: z
      .string()
      .min(1, t("reportSick.validation.firstSickDayRequired")),
    note: z.string().optional(),
  });

  type ReportSickFormData = z.infer<typeof reportSickSchema>;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReportSickFormData>({
    resolver: zodResolver(reportSickSchema as any) as any,
    defaultValues: {
      firstSickDay: format(new Date(), "yyyy-MM-dd"),
      note: "",
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setDateOption("today");
      setShowDatePicker(false);
      reset({
        firstSickDay: format(new Date(), "yyyy-MM-dd"),
        note: "",
      });
    }
  }, [open, reset]);

  // Update date when option changes
  const handleDateOptionChange = (option: DateOption) => {
    setDateOption(option);
    if (option === "yesterday") {
      setValue("firstSickDay", format(subDays(new Date(), 1), "yyyy-MM-dd"));
      setShowDatePicker(false);
    } else if (option === "today") {
      setValue("firstSickDay", format(new Date(), "yyyy-MM-dd"));
      setShowDatePicker(false);
    } else {
      setShowDatePicker(true);
    }
  };

  const onSubmit = async (data: ReportSickFormData) => {
    await onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("reportSick.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          <div className="space-y-3">
            <Label>
              {t("reportSick.firstSickDay")}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={dateOption === "yesterday" ? "default" : "outline"}
                className={cn(
                  "flex-1",
                  dateOption === "yesterday" && "ring-2 ring-primary",
                )}
                onClick={() => handleDateOptionChange("yesterday")}
              >
                {t("reportSick.yesterday")}
              </Button>
              <Button
                type="button"
                variant={dateOption === "today" ? "default" : "outline"}
                className={cn(
                  "flex-1",
                  dateOption === "today" && "ring-2 ring-primary",
                )}
                onClick={() => handleDateOptionChange("today")}
              >
                {t("reportSick.today")}
              </Button>
              <Button
                type="button"
                variant={dateOption === "other" ? "default" : "outline"}
                className={cn(
                  "flex-1",
                  dateOption === "other" && "ring-2 ring-primary",
                )}
                onClick={() => handleDateOptionChange("other")}
              >
                {t("reportSick.other")}
              </Button>
            </div>
            {showDatePicker && (
              <Input
                type="date"
                {...register("firstSickDay")}
                max={format(new Date(), "yyyy-MM-dd")}
              />
            )}
            {errors.firstSickDay && (
              <p className="text-sm text-destructive">
                {errors.firstSickDay.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">{t("reportSick.note")}</Label>
            <Textarea
              id="note"
              {...register("note")}
              placeholder={t("reportSick.notePlaceholder")}
              rows={4}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? t("common:actions.saving")
                : t("common:buttons.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
