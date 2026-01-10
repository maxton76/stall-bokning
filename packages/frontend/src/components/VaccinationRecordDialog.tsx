import { useState } from "react";
import { z } from "zod";
import { format, addMonths, addDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { BaseFormDialog } from "@/components/BaseFormDialog";
import { useFormDialog } from "@/hooks/useFormDialog";
import {
  FormInput,
  FormTextarea,
  FormDatePicker,
  FormSelect,
} from "@/components/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { getAllAvailableVaccinationRules } from "@/services/vaccinationRuleService";
import {
  createVaccinationRecord,
  updateVaccinationRecord,
} from "@/services/vaccinationService";
import { queryKeys } from "@/lib/queryClient";
import type { VaccinationRecord } from "@shared/types/vaccination";
import type { VaccinationRule, Horse } from "@/types/roles";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

interface VaccinationRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  horse: Horse;
  organizationId?: string; // Organization ID for the record (from stable/group)
  record?: VaccinationRecord | null;
  onSuccess?: () => void;
  title?: string;
}

const vaccinationRecordSchema = z.object({
  vaccinationRuleId: z.string().min(1, "Vaccination rule is required"),
  vaccinationDate: z.string().min(1, "Vaccination date is required"),
  nextDueDate: z.string().min(1, "Next due date is required"),
  veterinarianName: z.string().optional(),
  vaccineProduct: z.string().optional(),
  batchNumber: z.string().optional(),
  notes: z.string().optional(),
});

type VaccinationRecordFormData = z.infer<typeof vaccinationRecordSchema>;

export function VaccinationRecordDialog({
  open,
  onOpenChange,
  horse,
  organizationId = "", // Default to empty string if not provided
  record,
  onSuccess,
  title,
}: VaccinationRecordDialogProps) {
  const { user } = useAuth();
  const isEditMode = !!record;
  const [autoCalculatedDueDate, setAutoCalculatedDueDate] =
    useState<string>("");

  // Fetch vaccination rules with TanStack Query
  const {
    data: availableRules = [],
    isLoading: loadingRules,
    error: rulesError,
  } = useQuery({
    queryKey: queryKeys.vaccinationRules.list(organizationId || null),
    queryFn: () =>
      getAllAvailableVaccinationRules(horse.ownerId, organizationId),
    enabled: open && !!horse.ownerId,
    staleTime: 10 * 60 * 1000, // 10 minutes - vaccination rules change infrequently
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Handle query error
  if (rulesError) {
    console.error("Failed to fetch vaccination rules:", rulesError);
  }

  const { form, handleSubmit, resetForm } =
    useFormDialog<VaccinationRecordFormData>({
      schema: vaccinationRecordSchema,
      defaultValues: {
        vaccinationRuleId: "",
        vaccinationDate: "",
        nextDueDate: "",
        veterinarianName: "",
        vaccineProduct: "",
        batchNumber: "",
        notes: "",
      },
      onSubmit: async (data) => {
        const vaccinationDate = Timestamp.fromDate(
          new Date(data.vaccinationDate),
        );
        const nextDueDate = Timestamp.fromDate(new Date(data.nextDueDate));

        const selectedRule = availableRules.find(
          (r) => r.id === data.vaccinationRuleId,
        );

        if (isEditMode && record) {
          await updateVaccinationRecord(record.id, {
            vaccinationRuleId: data.vaccinationRuleId,
            vaccinationRuleName: selectedRule?.name || "",
            vaccinationDate,
            nextDueDate,
            veterinarianName: data.veterinarianName?.trim() || undefined,
            vaccineProduct: data.vaccineProduct?.trim() || undefined,
            batchNumber: data.batchNumber?.trim() || undefined,
            notes: data.notes?.trim() || undefined,
          });
        } else {
          if (!user) {
            throw new Error(
              "User must be authenticated to create vaccination record",
            );
          }
          await createVaccinationRecord({
            organizationId,
            horseId: horse.id,
            horseName: horse.name,
            vaccinationRuleId: data.vaccinationRuleId,
            vaccinationRuleName: selectedRule?.name || "",
            vaccinationDate,
            nextDueDate,
            veterinarianName: data.veterinarianName?.trim() || undefined,
            vaccineProduct: data.vaccineProduct?.trim() || undefined,
            batchNumber: data.batchNumber?.trim() || undefined,
            notes: data.notes?.trim() || undefined,
            createdBy: user.uid,
            lastModifiedBy: user.uid,
          });
        }
      },
      onSuccess: () => {
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
      },
      successMessage: isEditMode
        ? "Vaccination record updated successfully"
        : "Vaccination record created successfully",
      errorMessage: isEditMode
        ? "Failed to update vaccination record"
        : "Failed to create vaccination record",
    });

  // Watch form fields for auto-calculation
  const vaccinationRuleId = form.watch("vaccinationRuleId");
  const vaccinationDate = form.watch("vaccinationDate");

  // Auto-calculate next due date when rule or date changes
  useEffect(() => {
    if (vaccinationRuleId && vaccinationDate) {
      const selectedRule = availableRules.find(
        (r) => r.id === vaccinationRuleId,
      );
      if (selectedRule) {
        const vDate = new Date(vaccinationDate);
        let nextDue = vDate;

        // Add months if specified
        if (selectedRule.periodMonths > 0) {
          nextDue = addMonths(nextDue, selectedRule.periodMonths);
        }

        // Add days if specified
        if (selectedRule.periodDays > 0) {
          nextDue = addDays(nextDue, selectedRule.periodDays);
        }

        const calculatedDate = format(nextDue, "yyyy-MM-dd");
        setAutoCalculatedDueDate(calculatedDate);

        // Only auto-set if user hasn't manually edited it or it's empty
        if (
          !form.getValues("nextDueDate") ||
          form.getValues("nextDueDate") === ""
        ) {
          form.setValue("nextDueDate", calculatedDate);
        }
      }
    }
  }, [vaccinationRuleId, vaccinationDate, availableRules, form]);

  // Reset form when dialog opens with record data
  useEffect(() => {
    if (record) {
      resetForm({
        vaccinationRuleId: record.vaccinationRuleId,
        vaccinationDate: format(record.vaccinationDate.toDate(), "yyyy-MM-dd"),
        nextDueDate: format(record.nextDueDate.toDate(), "yyyy-MM-dd"),
        veterinarianName: record.veterinarianName || "",
        vaccineProduct: record.vaccineProduct || "",
        batchNumber: record.batchNumber || "",
        notes: record.notes || "",
      });
    } else {
      resetForm();
    }
  }, [record, open]);

  const dialogTitle =
    title ||
    (isEditMode ? "Edit Vaccination Record" : "Add Vaccination Record");
  const dialogDescription = isEditMode
    ? `Update vaccination record for ${horse.name}`
    : `Record a new vaccination for ${horse.name}`;

  // Prepare rule options for select
  const ruleOptions = availableRules.map((rule) => ({
    value: rule.id,
    label: `${rule.name} (${rule.periodMonths > 0 ? `${rule.periodMonths}m` : ""}${rule.periodMonths > 0 && rule.periodDays > 0 ? " " : ""}${rule.periodDays > 0 ? `${rule.periodDays}d` : ""})`,
  }));

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={dialogTitle}
      description={dialogDescription}
      form={form}
      onSubmit={handleSubmit}
      submitLabel={isEditMode ? "Update" : "Add Record"}
      maxWidth="sm:max-w-[600px]"
    >
      <div className="space-y-4">
        {/* Vaccination Rule Selector */}
        <FormSelect
          name="vaccinationRuleId"
          label="Vaccination Rule"
          form={form}
          options={ruleOptions}
          placeholder={
            loadingRules ? "Loading rules..." : "Select a vaccination rule"
          }
          disabled={loadingRules}
          required
        />

        {/* Vaccination Date */}
        <FormDatePicker
          name="vaccinationDate"
          label="Vaccination Date"
          form={form}
          max={format(new Date(), "yyyy-MM-dd")}
          required
          helperText="Date when vaccination was administered"
        />

        {/* Next Due Date */}
        <div className="space-y-2">
          <FormDatePicker
            name="nextDueDate"
            label="Next Due Date"
            form={form}
            required
            helperText="When the next vaccination is due"
          />
          {autoCalculatedDueDate && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Auto-calculated based on rule: {autoCalculatedDueDate}
                {form.getValues("nextDueDate") !== autoCalculatedDueDate && (
                  <span className="ml-1 text-muted-foreground">
                    (manually overridden)
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Veterinarian Details */}
        <FormInput
          name="veterinarianName"
          label="Veterinarian Name"
          form={form}
          placeholder="e.g., Dr. Smith"
          helperText="Optional: Name of the veterinarian who administered the vaccine"
        />

        <FormInput
          name="vaccineProduct"
          label="Vaccine Product"
          form={form}
          placeholder="e.g., Equilis Tetanus"
          helperText="Optional: Brand/product name of the vaccine"
        />

        <FormInput
          name="batchNumber"
          label="Batch Number"
          form={form}
          placeholder="e.g., LOT123456"
          helperText="Optional: Vaccine batch/lot number"
        />

        {/* Notes */}
        <FormTextarea
          name="notes"
          label="Notes"
          form={form}
          placeholder="Any additional notes about this vaccination"
          rows={3}
        />
      </div>
    </BaseFormDialog>
  );
}
