import { useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  quantity: z.coerce.number().min(0, "Quantity must be 0 or greater"),
  startDate: z.coerce.date({ message: "Start date is required" }),
  endDate: z
    .preprocess(
      (val) =>
        val === "" || val === null || val === undefined ? undefined : val,
      z.coerce.date().optional(),
    )
    .nullable(),
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
  const { t } = useTranslation(["feeding", "common"]);
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
        ? t("feeding:horseFeeding.messages.updateSuccess")
        : t("feeding:horseFeeding.messages.createSuccess"),
      errorMessage: isEditMode
        ? t("feeding:horseFeeding.messages.updateError")
        : t("feeding:horseFeeding.messages.createError"),
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
    ? t("feeding:horseFeeding.form.title.edit", { horseName })
    : t("feeding:horseFeeding.form.title.create", { horseName });
  const dialogDescription = isEditMode
    ? t("feeding:horseFeeding.form.description.edit")
    : t("feeding:horseFeeding.form.description.create");

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={dialogTitle}
      description={dialogDescription}
      form={form}
      onSubmit={handleSubmit}
      submitLabel={
        isEditMode ? t("common:buttons.update") : t("common:buttons.add")
      }
      maxWidth="sm:max-w-[500px]"
    >
      <FormSelect
        name="feedTypeId"
        label={t("feeding:horseFeeding.form.labels.feedType")}
        form={form}
        options={feedTypeOptions}
        placeholder={t("feeding:horseFeeding.form.placeholders.feedType")}
        required
      />

      <FormSelect
        name="feedingTimeId"
        label={t("feeding:horseFeeding.form.labels.feedingTime")}
        form={form}
        options={feedingTimeOptions}
        placeholder={t("feeding:horseFeeding.form.placeholders.feedingTime")}
        required
      />

      <FormInput
        name="quantity"
        label={
          selectedFeedType
            ? t("feeding:horseFeeding.form.labels.quantityWithUnit", {
                unit: selectedFeedType.quantityMeasure,
              })
            : t("feeding:horseFeeding.form.labels.quantity")
        }
        form={form}
        type="number"
        placeholder={t("feeding:horseFeeding.form.placeholders.quantity")}
        required
      />

      <FormDatePicker
        name="startDate"
        label={t("feeding:horseFeeding.form.labels.startDate")}
        form={form}
        required
      />

      <FormDatePicker
        name="endDate"
        label={t("feeding:horseFeeding.form.labels.endDate")}
        form={form}
        helperText={t("feeding:horseFeeding.form.help.endDate")}
      />

      <FormTextarea
        name="notes"
        label={t("feeding:horseFeeding.form.labels.notes")}
        form={form}
        placeholder={t("feeding:horseFeeding.form.placeholders.notes")}
        rows={2}
      />

      {selectedFeedType?.warning && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-sm text-amber-700">
            <strong>{t("feeding:feedTypes.form.labels.warning")}:</strong>{" "}
            {selectedFeedType.warning}
          </p>
        </div>
      )}
    </BaseFormDialog>
  );
}
