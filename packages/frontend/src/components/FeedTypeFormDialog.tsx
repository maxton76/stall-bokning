import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { BaseFormDialog } from "@/components/BaseFormDialog";
import { useFormDialog } from "@/hooks/useFormDialog";
import { FormInput, FormSelect, FormTextarea } from "@/components/form";
import type {
  FeedType,
  CreateFeedTypeData,
  FeedCategory,
  QuantityMeasure,
} from "@shared/types";

const CATEGORY_KEYS: FeedCategory[] = [
  "roughage",
  "concentrate",
  "supplement",
  "medicine",
];
const MEASURE_KEYS: QuantityMeasure[] = [
  "scoop",
  "teaspoon",
  "tablespoon",
  "cup",
  "ml",
  "l",
  "g",
  "kg",
  "custom",
];

const feedTypeSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),
  brand: z
    .string()
    .max(100, "Brand must be 100 characters or less")
    .optional()
    .or(z.literal("")),
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
  defaultQuantity: z.coerce
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
  const { t } = useTranslation(["feeding", "common"]);
  const isEditMode = !!feedType;

  // Build translated category options
  const categoryOptions = useMemo(
    () =>
      CATEGORY_KEYS.map((key) => ({
        value: key,
        label: t(`feeding:categories.${key}`),
      })),
    [t],
  );

  // Build translated measurement options
  const measureOptions = useMemo(
    () =>
      MEASURE_KEYS.map((key) => ({
        value: key,
        label: t(`feeding:measurements.${key}`),
      })),
    [t],
  );

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
      ? t("feeding:feedTypes.messages.updateSuccess")
      : t("feeding:feedTypes.messages.createSuccess"),
    errorMessage: isEditMode
      ? t("feeding:feedTypes.messages.updateError")
      : t("feeding:feedTypes.messages.createError"),
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

  const dialogTitle = isEditMode
    ? t("feeding:feedTypes.form.title.edit")
    : t("feeding:feedTypes.form.title.create");
  const dialogDescription = isEditMode
    ? t("feeding:feedTypes.form.description.edit")
    : t("feeding:feedTypes.form.description.create");

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
      maxWidth="sm:max-w-[500px]"
    >
      <FormInput
        name="name"
        label={t("feeding:feedTypes.form.labels.name")}
        form={form}
        placeholder={t("feeding:feedTypes.form.placeholders.name")}
        required
      />

      <FormInput
        name="brand"
        label={t("feeding:feedTypes.form.labels.brand")}
        form={form}
        placeholder={t("feeding:feedTypes.form.placeholders.brand")}
      />

      <FormSelect
        name="category"
        label={t("feeding:feedTypes.form.labels.category")}
        form={form}
        options={categoryOptions}
        placeholder={t("feeding:feedTypes.form.placeholders.category")}
        required
      />

      <FormSelect
        name="quantityMeasure"
        label={t("feeding:feedTypes.form.labels.quantityMeasure")}
        form={form}
        options={measureOptions}
        placeholder={t("feeding:feedTypes.form.placeholders.quantityMeasure")}
        required
      />

      <FormInput
        name="defaultQuantity"
        label={t("feeding:feedTypes.form.labels.defaultQuantity")}
        form={form}
        type="number"
        placeholder={t("feeding:feedTypes.form.placeholders.defaultQuantity")}
        helperText={t("feeding:feedTypes.form.help.defaultQuantity")}
        required
      />

      <FormTextarea
        name="warning"
        label={t("feeding:feedTypes.form.labels.warning")}
        form={form}
        placeholder={t("feeding:feedTypes.form.placeholders.warning")}
        helperText={t("feeding:feedTypes.form.help.warning")}
        rows={2}
      />
    </BaseFormDialog>
  );
}
