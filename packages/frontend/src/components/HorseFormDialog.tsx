import { useEffect, useState } from "react";
import { z } from "zod";
import { format } from "date-fns";
import { BaseFormDialog } from "@/components/BaseFormDialog";
import { useFormDialog } from "@/hooks/useFormDialog";
import {
  FormInput,
  FormSelect,
  FormTextarea,
  FormCheckboxGroup,
  FormDatePicker,
} from "@/components/form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Calendar, History, Plus } from "lucide-react";
import { useVaccinationStatus } from "@/hooks/useVaccinationStatus";
import type {
  Horse,
  HorseColor,
  HorseUsage,
  HorseGroup,
  VaccinationRule,
} from "@/types/roles";
import {
  HORSE_COLORS,
  HORSE_USAGE_OPTIONS,
  HORSE_GENDERS,
} from "@/constants/horseConstants";
import { Timestamp } from "firebase/firestore";
import { toDate } from "@/utils/timestampUtils";

interface HorseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    horseData: Omit<
      Horse,
      | "id"
      | "ownerId"
      | "ownerName"
      | "ownerEmail"
      | "createdAt"
      | "updatedAt"
      | "lastModifiedBy"
    >,
  ) => Promise<void>;
  horse?: Horse | null;
  title?: string;
  allowStableAssignment?: boolean;
  availableStables?: Array<{ id: string; name: string }>;
  availableGroups?: HorseGroup[];
  availableRules?: VaccinationRule[];
  onViewVaccinationHistory?: () => void;
  onAddVaccinationRecord?: () => void;
}

const horseSchema = z
  .object({
    name: z.string().min(1, "Horse name is required").max(100),
    breed: z.string().optional(),
    age: z.number().min(0).max(50).optional(),
    color: z.string().min(1, "Color is required"),
    gender: z.enum(["stallion", "mare", "gelding"]).optional(),
    isExternal: z.boolean(),
    dateOfArrival: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z.coerce.date().optional(),
    ),
    currentStableId: z.string().optional(),
    usage: z.array(z.string()),
    horseGroupId: z.string().optional(),
    vaccinationRuleId: z.string().optional(),
    ueln: z.string().optional(),
    chipNumber: z.string().optional(),
    federationNumber: z.string().optional(),
    feiPassNumber: z.string().optional(),
    feiExpiryDate: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z.coerce.date().optional(),
    ),
    sire: z.string().optional(),
    dam: z.string().optional(),
    damsire: z.string().optional(),
    withersHeight: z.number().min(0).optional(),
    dateOfBirth: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z.coerce.date().optional(),
    ),
    studbook: z.string().optional(),
    breeder: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((data) => data.isExternal || data.dateOfArrival, {
    message: "Date of arrival is required for non-external horses",
    path: ["dateOfArrival"],
  });

type HorseFormData = z.infer<typeof horseSchema>;

export function HorseFormDialog({
  open,
  onOpenChange,
  onSave,
  horse,
  title,
  allowStableAssignment = false,
  availableStables = [],
  availableGroups = [],
  availableRules = [],
  onViewVaccinationHistory,
  onAddVaccinationRecord,
}: HorseFormDialogProps) {
  const isEditMode = !!horse;
  const [vaccinationSectionOpen, setVaccinationSectionOpen] = useState(false);

  // Get vaccination status for existing horses
  const { status: vaccinationStatus, loading: vaccinationLoading } =
    useVaccinationStatus(horse || ({} as Horse));

  const { form, handleSubmit, resetForm } = useFormDialog<HorseFormData>({
    schema: horseSchema,
    defaultValues: {
      name: "",
      breed: "",
      age: undefined,
      color: "",
      gender: undefined,
      isExternal: false,
      dateOfArrival: undefined,
      currentStableId: "none",
      usage: [],
      horseGroupId: "none",
      vaccinationRuleId: "none",
      ueln: "",
      chipNumber: "",
      federationNumber: "",
      feiPassNumber: "",
      feiExpiryDate: undefined,
      sire: "",
      dam: "",
      damsire: "",
      withersHeight: undefined,
      dateOfBirth: undefined,
      studbook: "",
      breeder: "",
      notes: "",
    },
    onSubmit: async (data) => {
      // Find stable name if stable is selected
      let stableName = horse?.currentStableName;
      if (data.currentStableId && !stableName) {
        const stable = availableStables.find(
          (s) => s.id === data.currentStableId,
        );
        stableName = stable?.name;
      }

      // Prepare data for save
      const horseData: any = {
        name: data.name.trim(),
        breed: data.breed?.trim() || undefined,
        age: data.age || undefined,
        color: data.color as HorseColor,
        gender: data.gender || undefined,
        isExternal: data.isExternal,
        notes: data.notes?.trim() || undefined,
        status: "active" as const,
        ueln: data.ueln?.trim() || undefined,
        chipNumber: data.chipNumber?.trim() || undefined,
        federationNumber: data.federationNumber?.trim() || undefined,
        feiPassNumber: data.feiPassNumber?.trim() || undefined,
        feiExpiryDate: data.feiExpiryDate
          ? Timestamp.fromDate(data.feiExpiryDate)
          : undefined,
        sire: data.sire?.trim() || undefined,
        dam: data.dam?.trim() || undefined,
        damsire: data.damsire?.trim() || undefined,
        withersHeight: data.withersHeight || undefined,
        dateOfBirth: data.dateOfBirth
          ? Timestamp.fromDate(data.dateOfBirth)
          : undefined,
        studbook: data.studbook?.trim() || undefined,
        breeder: data.breeder?.trim() || undefined,
      };

      // Conditional fields for non-external horses
      if (!data.isExternal) {
        horseData.dateOfArrival = data.dateOfArrival
          ? Timestamp.fromDate(data.dateOfArrival)
          : undefined;
        horseData.currentStableId =
          data.currentStableId === "none" ? undefined : data.currentStableId;
        horseData.currentStableName = stableName;
        horseData.assignedAt =
          data.currentStableId && data.currentStableId !== "none"
            ? horse?.assignedAt || Timestamp.now()
            : undefined;
        horseData.usage = data.usage.length > 0 ? data.usage : undefined;

        // Group assignment
        if (data.horseGroupId && data.horseGroupId !== "none") {
          horseData.horseGroupId = data.horseGroupId;
          const group = availableGroups.find((g) => g.id === data.horseGroupId);
          horseData.horseGroupName = group?.name;
        }

        // Vaccination rule assignment
        if (data.vaccinationRuleId && data.vaccinationRuleId !== "none") {
          horseData.vaccinationRuleId = data.vaccinationRuleId;
          const rule = availableRules.find(
            (r) => r.id === data.vaccinationRuleId,
          );
          horseData.vaccinationRuleName = rule?.name;
        }
      }

      await onSave(horseData);
    },
    onSuccess: () => {
      onOpenChange(false);
    },
    successMessage: isEditMode
      ? "Horse updated successfully"
      : "Horse added successfully",
    errorMessage: isEditMode ? "Failed to update horse" : "Failed to add horse",
  });

  // Helper to format date for HTML5 date input (YYYY-MM-DD)
  const formatDateForInput = (timestamp: Timestamp | undefined): string => {
    if (!timestamp) return "";
    const date = toDate(timestamp);
    if (!date) return "";
    return date.toISOString().split("T")[0];
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (horse) {
      resetForm({
        name: horse.name || "",
        breed: horse.breed || "",
        age: horse.age || undefined,
        color: horse.color || "",
        gender: horse.gender || undefined,
        isExternal: horse.isExternal ?? false,
        dateOfArrival: formatDateForInput(horse.dateOfArrival) as any,
        currentStableId: horse.currentStableId || "none",
        usage: horse.usage || [],
        horseGroupId: horse.horseGroupId || "none",
        vaccinationRuleId: horse.vaccinationRuleId || "none",
        ueln: horse.ueln || "",
        chipNumber: horse.chipNumber || "",
        federationNumber: horse.federationNumber || "",
        feiPassNumber: horse.feiPassNumber || "",
        feiExpiryDate: formatDateForInput(horse.feiExpiryDate) as any,
        sire: horse.sire || "",
        dam: horse.dam || "",
        damsire: horse.damsire || "",
        withersHeight: horse.withersHeight || undefined,
        dateOfBirth: formatDateForInput(horse.dateOfBirth) as any,
        studbook: horse.studbook || "",
        breeder: horse.breeder || "",
        notes: horse.notes || "",
      });
    } else {
      resetForm();
    }
  }, [horse, open]);

  const isExternal = form.watch("isExternal");

  // Debug: Log form validation errors
  useEffect(() => {
    if (Object.keys(form.formState.errors).length > 0) {
      console.error("🚨 Form validation errors:", form.formState.errors);
    }
  }, [form.formState.errors]);

  const colorOptions = HORSE_COLORS.map((c) => ({
    value: c.value,
    label: c.label,
  }));
  const genderOptions = HORSE_GENDERS.map((g) => ({
    value: g.value,
    label: g.label,
  }));
  const stableOptions = [
    { value: "none", label: "No stable (unassigned)" },
    ...availableStables.map((s) => ({ value: s.id, label: s.name })),
  ];
  const groupOptions = [
    { value: "none", label: "No group" },
    ...availableGroups.map((g) => ({ value: g.id, label: g.name })),
  ];
  const ruleOptions = [
    { value: "none", label: "No vaccination rule" },
    ...availableRules.map((r) => ({ value: r.id, label: r.name })),
  ];

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title || (isEditMode ? "Edit Horse" : "Add New Horse")}
      description={
        isEditMode
          ? "Update the horse details below."
          : "Add a new horse to your account. You can optionally assign it to a stable."
      }
      form={form}
      onSubmit={handleSubmit}
      submitLabel={isEditMode ? "Update" : "Add Horse"}
      maxWidth="sm:max-w-[600px]"
    >
      <FormInput
        name="name"
        label="Horse Name"
        form={form}
        placeholder="e.g., Thunder"
        required
      />

      <FormInput
        name="breed"
        label="Breed"
        form={form}
        placeholder="e.g., Arabian, Thoroughbred"
      />

      {/* Is External Toggle */}
      <div className="flex items-center space-x-2">
        <Switch
          id="isExternal"
          checked={isExternal}
          onCheckedChange={(checked) => {
            form.setValue("isExternal", checked);
            if (checked) {
              form.setValue("dateOfArrival", undefined);
              form.setValue("currentStableId", "");
              form.setValue("usage", []);
            }
          }}
        />
        <Label
          htmlFor="isExternal"
          className="text-sm font-normal cursor-pointer"
        >
          This horse is external (not part of the stable)
        </Label>
      </div>

      {/* Date of Arrival - Required for non-external horses */}
      {!isExternal && (
        <FormDatePicker
          name="dateOfArrival"
          label="Date of Arrival"
          form={form}
          required
        />
      )}

      {/* Location/Stable Assignment - Hidden for external horses */}
      {!isExternal && allowStableAssignment && availableStables.length > 0 && (
        <FormSelect
          name="currentStableId"
          label="Location (Stable)"
          form={form}
          options={stableOptions}
        />
      )}

      {/* Usage - Hidden for external horses */}
      {!isExternal && (
        <FormCheckboxGroup
          name="usage"
          label="Usage"
          form={form}
          options={HORSE_USAGE_OPTIONS.map((o) => ({
            value: o.value,
            label: `${o.icon} ${o.label}`,
          }))}
        />
      )}

      {/* Horse Group - Hidden for external horses */}
      {!isExternal && availableGroups.length > 0 && (
        <FormSelect
          name="horseGroupId"
          label="Horse Group"
          form={form}
          options={groupOptions}
        />
      )}

      {/* Vaccination Rule - Hidden for external horses */}
      {!isExternal && availableRules.length > 0 && (
        <FormSelect
          name="vaccinationRuleId"
          label="Vaccination Rule"
          form={form}
          options={ruleOptions}
        />
      )}

      {/* Vaccination Records Section - Only show in edit mode */}
      {isEditMode &&
        horse &&
        !isExternal &&
        (onViewVaccinationHistory || onAddVaccinationRecord) && (
          <Collapsible
            open={vaccinationSectionOpen}
            onOpenChange={setVaccinationSectionOpen}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:underline">
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Vaccination Records
              </span>
              <ChevronDown className="h-4 w-4" />
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-4 pt-4 border-t">
              {/* Vaccination Status Summary */}
              {!vaccinationLoading && vaccinationStatus && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Current Status
                    </Label>
                    <div className="mt-1">
                      <Badge
                        variant={
                          vaccinationStatus.status === "current"
                            ? "secondary"
                            : vaccinationStatus.status === "expiring_soon"
                              ? "outline"
                              : vaccinationStatus.status === "expired"
                                ? "destructive"
                                : "default"
                        }
                      >
                        {vaccinationStatus.message}
                      </Badge>
                    </div>
                  </div>

                  {/* Last Vaccination Date */}
                  {vaccinationStatus.lastVaccinationDate &&
                    toDate(vaccinationStatus.lastVaccinationDate) && (
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          Last Vaccination
                        </Label>
                        <p className="text-sm mt-1">
                          {format(
                            toDate(vaccinationStatus.lastVaccinationDate)!,
                            "MMM d, yyyy",
                          )}
                        </p>
                      </div>
                    )}

                  {/* Next Due Date */}
                  {vaccinationStatus.nextDueDate &&
                    toDate(vaccinationStatus.nextDueDate) && (
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          Next Due Date
                        </Label>
                        <p className="text-sm mt-1">
                          {format(
                            toDate(vaccinationStatus.nextDueDate)!,
                            "MMM d, yyyy",
                          )}
                          {vaccinationStatus.daysUntilDue !== undefined && (
                            <span className="text-muted-foreground ml-2">
                              ({Math.abs(vaccinationStatus.daysUntilDue)}{" "}
                              {vaccinationStatus.daysUntilDue < 0
                                ? "days overdue"
                                : "days"}
                              )
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                  {/* Vaccination Rule */}
                  {vaccinationStatus.vaccinationRuleName && (
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        Vaccination Rule
                      </Label>
                      <p className="text-sm mt-1">
                        {vaccinationStatus.vaccinationRuleName}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {vaccinationLoading && (
                <p className="text-sm text-muted-foreground">
                  Loading vaccination status...
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {onViewVaccinationHistory && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onViewVaccinationHistory}
                  >
                    <History className="h-4 w-4 mr-2" />
                    View Full History
                  </Button>
                )}
                {onAddVaccinationRecord && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onAddVaccinationRecord}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Record
                  </Button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

      {/* Expanded Identification Section */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            name="ueln"
            label="UELN"
            form={form}
            placeholder="Universal Equine Life Number"
          />
          <FormInput
            name="chipNumber"
            label="Chip Number"
            form={form}
            placeholder="Microchip number"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            name="federationNumber"
            label="Federation Number"
            form={form}
            placeholder="Federation registration number"
          />
          <FormInput
            name="feiPassNumber"
            label="FEI Pass Number"
            form={form}
            placeholder="FEI passport number"
          />
        </div>

        <FormDatePicker
          name="feiExpiryDate"
          label="FEI Passport Expiry"
          form={form}
        />
      </div>

      <FormSelect
        name="color"
        label="Color"
        form={form}
        options={colorOptions}
        placeholder="Select color"
        required
      />

      <FormSelect
        name="gender"
        label="Gender"
        form={form}
        options={genderOptions}
        placeholder="Select gender"
      />

      <FormDatePicker name="dateOfBirth" label="Date of Birth" form={form} />

      {/* Collapsible Additional Details Section */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:underline">
          <span>Additional horse details</span>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              name="sire"
              label="Sire"
              form={form}
              placeholder="Father's name"
            />
            <FormInput
              name="dam"
              label="Dam"
              form={form}
              placeholder="Mother's name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              name="withersHeight"
              label="Withers Height (cm)"
              form={form}
              type="number"
              placeholder="e.g., 165"
            />
            <FormInput
              name="damsire"
              label="Damsire"
              form={form}
              placeholder="Mother's father"
            />
          </div>

          <FormInput
            name="studbook"
            label="Studbook"
            form={form}
            placeholder="Studbook registration"
          />

          <FormInput
            name="breeder"
            label="Breeder"
            form={form}
            placeholder="Breeder name"
          />
        </CollapsibleContent>
      </Collapsible>

      <FormTextarea
        name="notes"
        label="Notes"
        form={form}
        placeholder="Any additional information about this horse..."
        rows={3}
      />
    </BaseFormDialog>
  );
}
