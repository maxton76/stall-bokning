import { useEffect } from "react";
import { z } from "zod";
import { BaseFormDialog } from "@/components/BaseFormDialog";
import { useFormDialog } from "@/hooks/useFormDialog";
import { FormInput, FormSelect, FormTextarea } from "@/components/form";
import type { FeedType, CreateFeedTypeData } from "@shared/types";
import { FEED_CATEGORIES, QUANTITY_MEASURES } from "@/constants/feeding";

const feedTypeSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),
  brand: z
    .string()
    .min(1, "Brand is required")
    .max(100, "Brand must be 100 characters or less"),
  category: z.enum(["roughage", "concentrate", "supplement", "medicine"]),
  quantityMeasure: z.enum([
    "scoop",
    "teaspoon",
    "tablespoon",
    "cup",
    "ml",
    "l",
    "g",
    "kg",
    "custom",
  ]),
  defaultQuantity: z
    .number()
    .min(0, "Quantity must be 0 or greater")
    .max(10000, "Quantity must be 10000 or less"),
  warning: z
    .string()
    .max(500, "Warning must be 500 characters or less")
    .optional(),
});

type FeedTypeFormData = z.infer<typeof feedTypeSchema>;

interface FeedTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedType?: FeedType;
  onSave: (data: CreateFeedTypeData) => Promise<void>;
}

export function FeedTypeFormDialog({
  open,
  onOpenChange,
  feedType,
  onSave,
}: FeedTypeFormDialogProps) {
  const isEditMode = !!feedType;

  const { form, handleSubmit, resetForm } = useFormDialog<FeedTypeFormData>({
    schema: feedTypeSchema,
    defaultValues: {
      name: "",
      brand: "",
      category: "concentrate",
      quantityMeasure: "kg",
      defaultQuantity: 1,
      warning: "",
    },
    onSubmit: async (data) => {
      await onSave({
        name: data.name.trim(),
        brand: data.brand.trim(),
        category: data.category,
        quantityMeasure: data.quantityMeasure,
        defaultQuantity: data.defaultQuantity,
        warning: data.warning?.trim() || undefined,
      });
    },
    onSuccess: () => {
      onOpenChange(false);
    },
    successMessage: isEditMode
      ? "Feed type updated successfully"
      : "Feed type created successfully",
    errorMessage: isEditMode
      ? "Failed to update feed type"
      : "Failed to create feed type",
  });

  // Reset form when dialog opens with feed type data
  useEffect(() => {
    if (feedType) {
      resetForm({
        name: feedType.name,
        brand: feedType.brand,
        category: feedType.category,
        quantityMeasure: feedType.quantityMeasure,
        defaultQuantity: feedType.defaultQuantity,
        warning: feedType.warning || "",
      });
    } else {
      resetForm();
    }
  }, [feedType, open]);

  const dialogTitle = isEditMode ? "Edit Feed Type" : "Add Feed Type";
  const dialogDescription = isEditMode
    ? "Modify the feed type configuration."
    : "Create a new feed type for your stable.";

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={dialogTitle}
      description={dialogDescription}
      form={form}
      onSubmit={handleSubmit}
      submitLabel={isEditMode ? "Update" : "Create"}
      maxWidth="sm:max-w-[500px]"
    >
      <FormInput
        name="name"
        label="Name"
        form={form}
        placeholder="e.g., Müsli Plus, Hay"
        required
      />

      <FormInput
        name="brand"
        label="Brand"
        form={form}
        placeholder="e.g., Krafft, Local Farm"
        required
      />

      <FormSelect
        name="category"
        label="Category"
        form={form}
        options={FEED_CATEGORIES}
        placeholder="Select category"
        required
      />

      <FormSelect
        name="quantityMeasure"
        label="Quantity Measure"
        form={form}
        options={QUANTITY_MEASURES}
        placeholder="Select measure"
        required
      />

      <FormInput
        name="defaultQuantity"
        label="Default Quantity"
        form={form}
        type="number"
        placeholder="e.g., 2"
        helperText="Default amount when adding this feed to a horse"
        required
      />

      <FormTextarea
        name="warning"
        label="Warning"
        form={form}
        placeholder="e.g., Do not give more than 3kg per feeding"
        helperText="Optional warning message shown when using this feed"
        rows={2}
      />
    </BaseFormDialog>
  );
}
