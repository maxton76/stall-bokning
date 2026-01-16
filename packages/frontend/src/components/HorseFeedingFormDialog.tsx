import { useEffect } from "react";
import { z } from "zod";
import { BaseFormDialog } from "@/components/BaseFormDialog";
import { useFormDialog } from "@/hooks/useFormDialog";
import {
  FormInput,
  FormSelect,
  FormTextarea,
  FormDatePicker,
} from "@/components/form";
import type {
  HorseFeeding,
  CreateHorseFeedingData,
  FeedType,
  FeedingTime,
} from "@shared/types";

const horseFeedingSchema = z.object({
  feedTypeId: z.string().min(1, "Feed type is required"),
  feedingTimeId: z.string().min(1, "Feeding time is required"),
  quantity: z.number().min(0, "Quantity must be 0 or greater"),
  startDate: z.date({ message: "Start date is required" }),
  endDate: z.date().optional().nullable(),
  notes: z.string().max(500, "Notes must be 500 characters or less").optional(),
});

type HorseFeedingFormData = z.infer<typeof horseFeedingSchema>;

interface HorseFeedingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  horseFeeding?: HorseFeeding;
  horseId: string;
  horseName: string;
  feedTypes: FeedType[];
  feedingTimes: FeedingTime[];
  onSave: (data: CreateHorseFeedingData) => Promise<void>;
  defaultFeedingTimeId?: string;
}

export function HorseFeedingFormDialog({
  open,
  onOpenChange,
  horseFeeding,
  horseId,
  horseName,
  feedTypes,
  feedingTimes,
  onSave,
  defaultFeedingTimeId,
}: HorseFeedingFormDialogProps) {
  const isEditMode = !!horseFeeding;

  // Build options for selects
  const feedTypeOptions = feedTypes
    .filter((ft) => ft.isActive)
    .map((ft) => ({
      value: ft.id,
      label: `${ft.name} (${ft.brand})`,
    }));

  const feedingTimeOptions = feedingTimes
    .filter((ft) => ft.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((ft) => ({
      value: ft.id,
      label: `${ft.name} (${ft.time})`,
    }));

  const { form, handleSubmit, resetForm } = useFormDialog<HorseFeedingFormData>(
    {
      schema: horseFeedingSchema,
      defaultValues: {
        feedTypeId: "",
        feedingTimeId: defaultFeedingTimeId || "",
        quantity: 1,
        startDate: new Date(),
        endDate: null,
        notes: "",
      },
      onSubmit: async (data) => {
        await onSave({
          horseId,
          feedTypeId: data.feedTypeId,
          feedingTimeId: data.feedingTimeId,
          quantity: data.quantity,
          startDate: data.startDate.toISOString(),
          endDate: data.endDate ? data.endDate.toISOString() : undefined,
          notes: data.notes?.trim() || undefined,
        });
      },
      onSuccess: () => {
        onOpenChange(false);
      },
      successMessage: isEditMode
        ? "Horse feeding updated successfully"
        : "Horse feeding added successfully",
      errorMessage: isEditMode
        ? "Failed to update horse feeding"
        : "Failed to add horse feeding",
    },
  );

  // Update quantity when feed type changes
  const selectedFeedTypeId = form.watch("feedTypeId");
  useEffect(() => {
    if (selectedFeedTypeId && !isEditMode) {
      const feedType = feedTypes.find((ft) => ft.id === selectedFeedTypeId);
      if (feedType) {
        form.setValue("quantity", feedType.defaultQuantity);
      }
    }
  }, [selectedFeedTypeId, feedTypes, isEditMode]);

  // Reset form when dialog opens with data
  useEffect(() => {
    if (horseFeeding) {
      resetForm({
        feedTypeId: horseFeeding.feedTypeId,
        feedingTimeId: horseFeeding.feedingTimeId,
        quantity: horseFeeding.quantity,
        startDate: new Date(horseFeeding.startDate),
        endDate: horseFeeding.endDate ? new Date(horseFeeding.endDate) : null,
        notes: horseFeeding.notes || "",
      });
    } else {
      resetForm({
        feedTypeId: "",
        feedingTimeId: defaultFeedingTimeId || "",
        quantity: 1,
        startDate: new Date(),
        endDate: null,
        notes: "",
      });
    }
  }, [horseFeeding, open, defaultFeedingTimeId]);

  // Get selected feed type for showing unit
  const selectedFeedType = feedTypes.find((ft) => ft.id === selectedFeedTypeId);

  const dialogTitle = isEditMode
    ? `Edit Feeding for ${horseName}`
    : `Add Feeding for ${horseName}`;
  const dialogDescription = isEditMode
    ? "Modify the feeding configuration."
    : "Add a new feeding entry for this horse.";

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={dialogTitle}
      description={dialogDescription}
      form={form}
      onSubmit={handleSubmit}
      submitLabel={isEditMode ? "Update" : "Add"}
      maxWidth="sm:max-w-[500px]"
    >
      <FormSelect
        name="feedTypeId"
        label="Feed Type"
        form={form}
        options={feedTypeOptions}
        placeholder="Select feed type"
        required
      />

      <FormSelect
        name="feedingTimeId"
        label="Feeding Time"
        form={form}
        options={feedingTimeOptions}
        placeholder="Select feeding time"
        required
      />

      <FormInput
        name="quantity"
        label={`Quantity${selectedFeedType ? ` (${selectedFeedType.quantityMeasure})` : ""}`}
        form={form}
        type="number"
        placeholder="e.g., 2"
        required
      />

      <FormDatePicker
        name="startDate"
        label="Start Date"
        form={form}
        required
      />

      <FormDatePicker
        name="endDate"
        label="End Date"
        form={form}
        helperText="Leave empty for ongoing feeding"
      />

      <FormTextarea
        name="notes"
        label="Notes"
        form={form}
        placeholder="e.g., Special instructions..."
        rows={2}
      />

      {selectedFeedType?.warning && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-sm text-amber-700">
            <strong>Warning:</strong> {selectedFeedType.warning}
          </p>
        </div>
      )}
    </BaseFormDialog>
  );
}
