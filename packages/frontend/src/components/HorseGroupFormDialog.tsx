import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { BaseFormDialog } from "@/components/BaseFormDialog";
import { useFormDialog } from "@/hooks/useFormDialog";
import { FormInput, FormTextarea } from "@/components/form";
import { Label } from "@/components/ui/label";
import type { HorseGroup } from "@/types/roles";

interface HorseGroupFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    group: Omit<
      HorseGroup,
      "id" | "organizationId" | "createdAt" | "updatedAt" | "createdBy"
    >,
  ) => Promise<void>;
  group?: HorseGroup | null;
  title?: string;
}

const COLOR_KEYS = ["blue", "green", "amber", "red", "purple", "pink"] as const;
const COLOR_HEX: Record<(typeof COLOR_KEYS)[number], string> = {
  blue: "#3b82f6",
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  purple: "#a855f7",
  pink: "#ec4899",
};

export function HorseGroupFormDialog({
  open,
  onOpenChange,
  onSave,
  group,
  title,
}: HorseGroupFormDialogProps) {
  const { t } = useTranslation("horses");
  const isEditMode = !!group;

  // Build color options with translated labels
  const colorOptions = useMemo(
    () =>
      COLOR_KEYS.map((key) => ({
        value: key,
        label: t(`settings.groups.dialog.colors.${key}`),
        color: COLOR_HEX[key],
      })),
    [t],
  );

  // Create schema with translated messages
  const horseGroupSchema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .min(1, t("settings.groups.dialog.validation.nameRequired"))
          .max(50, t("settings.groups.dialog.validation.nameTooLong")),
        description: z.string().optional(),
        color: z
          .string()
          .min(1, t("settings.groups.dialog.validation.colorRequired")),
      }),
    [t],
  );

  type HorseGroupFormData = z.infer<typeof horseGroupSchema>;

  const { form, handleSubmit, resetForm } = useFormDialog<HorseGroupFormData>({
    schema: horseGroupSchema,
    defaultValues: {
      name: "",
      description: "",
      color: COLOR_KEYS[0],
    },
    onSubmit: async (data) => {
      await onSave({
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
        color: data.color,
      });
    },
    onSuccess: () => {
      onOpenChange(false);
    },
    successMessage: isEditMode
      ? t("settings.groups.messages.updateSuccess")
      : t("settings.groups.messages.createSuccess"),
    errorMessage: isEditMode
      ? t("settings.groups.messages.updateError")
      : t("settings.groups.messages.createError"),
  });

  // Watch color field for selection display
  const selectedColor = form.watch("color");

  // Reset form when dialog opens with group data
  useEffect(() => {
    if (group) {
      resetForm({
        name: group.name,
        description: group.description || "",
        color: group.color || COLOR_KEYS[0],
      });
    } else {
      resetForm();
    }
  }, [group, open]);

  const dialogTitle =
    title ||
    (isEditMode
      ? t("settings.groups.dialog.editTitle")
      : t("settings.groups.dialog.createTitle"));
  const dialogDescription = isEditMode
    ? t("settings.groups.dialog.editDescription")
    : t("settings.groups.dialog.createDescription");

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={dialogTitle}
      description={dialogDescription}
      form={form}
      onSubmit={handleSubmit}
      submitLabel={
        isEditMode
          ? t("settings.groups.dialog.submit.update")
          : t("settings.groups.dialog.submit.create")
      }
      maxWidth="sm:max-w-[500px]"
    >
      <FormInput
        name="name"
        label={t("settings.groups.dialog.labels.name")}
        form={form}
        placeholder={t("settings.groups.dialog.placeholders.name")}
        required
      />

      <FormTextarea
        name="description"
        label={t("settings.groups.dialog.labels.description")}
        form={form}
        placeholder={t("settings.groups.dialog.placeholders.description")}
        rows={3}
      />

      {/* Color Picker - Custom implementation for better UX */}
      <div className="space-y-2">
        <Label>
          {t("settings.groups.dialog.labels.color")}{" "}
          <span className="text-destructive ml-1">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {colorOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => form.setValue("color", option.value)}
              className={`flex items-center gap-2 p-3 rounded-md border-2 transition-colors ${
                selectedColor === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div
                className="w-6 h-6 rounded-full border border-gray-300"
                style={{ backgroundColor: option.color }}
              />
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>
        {form.formState.errors.color && (
          <p className="text-sm text-destructive">
            {form.formState.errors.color.message}
          </p>
        )}
      </div>
    </BaseFormDialog>
  );
}
