import { useEffect } from "react";
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
  sortOrder: z.number().int().min(0).max(100),
});

type FeedingTimeFormData = z.infer<typeof feedingTimeSchema>;

interface FeedingTimeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedingTime?: FeedingTime;
  onSave: (data: CreateFeedingTimeData) => Promise<void>;
  existingCount?: number;
}

export function FeedingTimeFormDialog({
  open,
  onOpenChange,
  feedingTime,
  onSave,
  existingCount = 0,
}: FeedingTimeFormDialogProps) {
  const isEditMode = !!feedingTime;

  const { form, handleSubmit, resetForm } = useFormDialog<FeedingTimeFormData>({
    schema: feedingTimeSchema,
    defaultValues: {
      name: "",
      hour: "07",
      minute: "00",
      sortOrder: existingCount,
    },
    onSubmit: async (data) => {
      const time = `${data.hour}:${data.minute}`;
      await onSave({
        name: data.name.trim(),
        time,
        sortOrder: data.sortOrder,
      });
    },
    onSuccess: () => {
      onOpenChange(false);
    },
    successMessage: isEditMode
      ? "Feeding time updated successfully"
      : "Feeding time created successfully",
    errorMessage: isEditMode
      ? "Failed to update feeding time"
      : "Failed to create feeding time",
  });

  // Reset form when dialog opens with feeding time data
  useEffect(() => {
    if (feedingTime) {
      const [hour, minute] = feedingTime.time.split(":");
      resetForm({
        name: feedingTime.name,
        hour: hour || "07",
        minute: minute || "00",
        sortOrder: feedingTime.sortOrder,
      });
    } else {
      resetForm({
        name: "",
        hour: "07",
        minute: "00",
        sortOrder: existingCount,
      });
    }
  }, [feedingTime, open, existingCount]);

  const dialogTitle = isEditMode ? "Edit Feeding Time" : "Add Feeding Time";
  const dialogDescription = isEditMode
    ? "Modify the feeding time configuration."
    : "Create a new feeding time slot for your stable.";

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={dialogTitle}
      description={dialogDescription}
      form={form}
      onSubmit={handleSubmit}
      submitLabel={isEditMode ? "Update" : "Create"}
      maxWidth="sm:max-w-[400px]"
    >
      <FormInput
        name="name"
        label="Name"
        form={form}
        placeholder="e.g., Morning, Afternoon, Evening"
        required
      />

      <div className="space-y-2">
        <Label>
          Time <span className="text-destructive ml-1">*</span>
        </Label>
        <div className="flex gap-2">
          <Select
            value={form.watch("hour")}
            onValueChange={(value) => form.setValue("hour", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Hour" />
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
              <SelectValue placeholder="Min" />
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
          Selected time: {form.watch("hour")}:{form.watch("minute")}
        </p>
      </div>

      <FormInput
        name="sortOrder"
        label="Sort Order"
        form={form}
        type="number"
        placeholder="e.g., 0, 1, 2"
        helperText="Lower numbers appear first in the schedule"
      />
    </BaseFormDialog>
  );
}
