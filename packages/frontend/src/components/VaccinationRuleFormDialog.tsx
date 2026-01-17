import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Controller } from "react-hook-form";
import { BaseFormDialog } from "@/components/BaseFormDialog";
import { useFormDialog } from "@/hooks/useFormDialog";
import { FormInput, FormTextarea } from "@/components/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { VaccinationRule } from "@/types/roles";

interface VaccinationRuleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    rule: Omit<
      VaccinationRule,
      "id" | "stableId" | "createdAt" | "updatedAt" | "createdBy"
    >,
  ) => Promise<void>;
  rule?: VaccinationRule | null;
  title?: string;
}

export function VaccinationRuleFormDialog({
  open,
  onOpenChange,
  onSave,
  rule,
  title,
}: VaccinationRuleFormDialogProps) {
  const { t } = useTranslation("horses");
  const isEditMode = !!rule;

  // Create schema with translated messages
  const vaccinationRuleSchema = useMemo(
    () =>
      z
        .object({
          name: z
            .string()
            .min(
              1,
              t("settings.vaccinationRules.dialog.validation.nameRequired"),
            )
            .max(
              100,
              t("settings.vaccinationRules.dialog.validation.nameTooLong"),
            ),
          description: z.string().optional(),
          periodMonths: z.coerce
            .number()
            .min(
              0,
              t("settings.vaccinationRules.dialog.validation.monthsInvalid"),
            )
            .int(),
          periodDays: z.coerce
            .number()
            .min(
              0,
              t("settings.vaccinationRules.dialog.validation.daysInvalid"),
            )
            .int(),
          daysNotCompeting: z.coerce
            .number()
            .min(
              0,
              t("settings.vaccinationRules.dialog.validation.daysInvalid"),
            )
            .int(),
          scope: z.enum(["organization", "user"] as const),
        })
        .refine((data) => data.periodMonths > 0 || data.periodDays > 0, {
          message: t(
            "settings.vaccinationRules.dialog.validation.periodRequired",
          ),
          path: ["periodMonths"],
        }),
    [t],
  );

  type VaccinationRuleFormData = z.infer<typeof vaccinationRuleSchema>;

  const { form, handleSubmit, resetForm } =
    useFormDialog<VaccinationRuleFormData>({
      schema: vaccinationRuleSchema,
      defaultValues: {
        name: "",
        description: "",
        periodMonths: 0,
        periodDays: 0,
        daysNotCompeting: 0,
        scope: "user",
      },
      onSubmit: async (data) => {
        await onSave({
          name: data.name.trim(),
          description: data.description?.trim() || undefined,
          periodMonths: data.periodMonths,
          periodDays: data.periodDays,
          daysNotCompeting: data.daysNotCompeting,
          scope: data.scope,
        } as any);
      },
      onSuccess: () => {
        onOpenChange(false);
      },
      successMessage: isEditMode
        ? t("settings.vaccinationRules.messages.updateSuccess")
        : t("settings.vaccinationRules.messages.createSuccess"),
      errorMessage: isEditMode
        ? t("settings.vaccinationRules.messages.updateError")
        : t("settings.vaccinationRules.messages.createError"),
    });

  // Watch period fields for helper text
  const periodMonths = form.watch("periodMonths");
  const periodDays = form.watch("periodDays");

  // Reset form when dialog opens with rule data
  useEffect(() => {
    if (rule) {
      resetForm({
        name: rule.name,
        description: rule.description || "",
        periodMonths: rule.periodMonths,
        periodDays: rule.periodDays,
        daysNotCompeting: rule.daysNotCompeting,
        scope: rule.scope === "system" ? "user" : rule.scope,
      });
    } else {
      resetForm();
    }
  }, [rule, open]);

  const dialogTitle =
    title ||
    (isEditMode
      ? t("settings.vaccinationRules.dialog.editTitle")
      : t("settings.vaccinationRules.dialog.createTitle"));
  const dialogDescription = isEditMode
    ? t("settings.vaccinationRules.dialog.editDescription")
    : t("settings.vaccinationRules.dialog.createDescription");

  // Helper text for period - using i18n with pluralization
  const buildPeriodHelperText = () => {
    if (periodMonths <= 0 && periodDays <= 0) {
      return t("settings.vaccinationRules.dialog.helper.enterPeriod");
    }

    const parts: string[] = [];
    if (periodMonths > 0) {
      parts.push(
        `${periodMonths} ${t("settings.vaccinationRules.months", { count: periodMonths })}`,
      );
    }
    if (periodDays > 0) {
      parts.push(
        `${periodDays} ${t("settings.vaccinationRules.days", { count: periodDays })}`,
      );
    }

    return `${t("settings.vaccinationRules.dialog.helper.vaccinateEvery")} ${parts.join(` ${t("settings.vaccinationRules.and")} `)}`;
  };

  const periodHelperText = buildPeriodHelperText();

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
          ? t("settings.vaccinationRules.dialog.submit.update")
          : t("settings.vaccinationRules.dialog.submit.create")
      }
      maxWidth="sm:max-w-[500px]"
    >
      <FormInput
        name="name"
        label={t("settings.vaccinationRules.dialog.labels.name")}
        form={form}
        placeholder={t("settings.vaccinationRules.dialog.placeholders.name")}
        required
      />

      {/* Scope Selector - Only show in create mode */}
      {!isEditMode && (
        <div className="space-y-2">
          <Label>
            {t("settings.vaccinationRules.dialog.labels.scope")}{" "}
            <span className="text-destructive ml-1">*</span>
          </Label>
          <Controller
            name="scope"
            control={form.control}
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent/50">
                  <RadioGroupItem value="user" id="scope-user" />
                  <Label
                    htmlFor="scope-user"
                    className="flex-1 cursor-pointer font-normal"
                  >
                    <div className="font-medium">
                      {t("settings.vaccinationRules.dialog.scope.personal")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t(
                        "settings.vaccinationRules.dialog.scope.personalDescription",
                      )}
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent/50">
                  <RadioGroupItem
                    value="organization"
                    id="scope-organization"
                  />
                  <Label
                    htmlFor="scope-organization"
                    className="flex-1 cursor-pointer font-normal"
                  >
                    <div className="font-medium">
                      {t("settings.vaccinationRules.dialog.scope.organization")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t(
                        "settings.vaccinationRules.dialog.scope.organizationDescription",
                      )}
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            )}
          />
        </div>
      )}

      <FormTextarea
        name="description"
        label={t("settings.vaccinationRules.dialog.labels.description")}
        form={form}
        placeholder={t(
          "settings.vaccinationRules.dialog.placeholders.description",
        )}
        rows={2}
      />

      {/* Period Between Vaccinations - Custom layout for better UX */}
      <div className="space-y-2">
        <Label>
          {t("settings.vaccinationRules.dialog.labels.periodBetween")}{" "}
          <span className="text-destructive ml-1">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label
              htmlFor="periodMonths"
              className="text-sm text-muted-foreground"
            >
              {t("settings.vaccinationRules.dialog.labels.months")}
            </Label>
            <Input
              id="periodMonths"
              type="number"
              min="0"
              placeholder="0"
              {...form.register("periodMonths", { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="periodDays"
              className="text-sm text-muted-foreground"
            >
              {t("settings.vaccinationRules.dialog.labels.days")}
            </Label>
            <Input
              id="periodDays"
              type="number"
              min="0"
              placeholder="0"
              {...form.register("periodDays", { valueAsNumber: true })}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{periodHelperText}</p>
        {form.formState.errors.periodMonths && (
          <p className="text-sm text-destructive">
            {form.formState.errors.periodMonths.message}
          </p>
        )}
      </div>

      <FormInput
        name="daysNotCompeting"
        label={t("settings.vaccinationRules.dialog.labels.daysNotCompeting")}
        form={form}
        type="number"
        placeholder={t(
          "settings.vaccinationRules.dialog.placeholders.daysNotCompeting",
        )}
        helperText={t(
          "settings.vaccinationRules.dialog.helper.daysNotCompetingHelp",
        )}
      />
    </BaseFormDialog>
  );
}
