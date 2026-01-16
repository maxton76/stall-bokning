import { useEffect, useState } from "react";
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

const reportSickSchema = z.object({
  firstSickDay: z.string().min(1, "First sick day is required"),
  note: z.string().optional(),
});

type ReportSickFormData = z.infer<typeof reportSickSchema>;

type DateOption = "yesterday" | "today" | "other";

interface ReportSickDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: ReportSickFormData) => Promise<void>;
  organizationId: string;
}

export function ReportSickDialog({
  open,
  onOpenChange,
  onSave,
  organizationId,
}: ReportSickDialogProps) {
  const [dateOption, setDateOption] = useState<DateOption>("today");
  const [showDatePicker, setShowDatePicker] = useState(false);

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
          <DialogTitle>Report sick leave</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          <div className="space-y-3">
            <Label>
              First sick day <span className="text-destructive">*</span>
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
                Yesterday
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
                Today
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
                Other
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
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              {...register("note")}
              placeholder="Optional note..."
              rows={4}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
