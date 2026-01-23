import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { format, eachDayOfInterval, getDay } from "date-fns";
import { Calendar as CalendarIcon, ListChecks } from "lucide-react";
import type { RoutineTemplate } from "@shared/types";
import { BaseFormDialog } from "@/components/BaseFormDialog";
import { useFormDialog } from "@/hooks/useFormDialog";
import {
  FormInput,
  FormSelect,
  FormTextarea,
  FormColorPicker,
} from "@/components/form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  DEFAULT_COLORS,
  type ActivityEntry,
  type ActivityTypeConfig,
} from "@/types/activity";
import { toDate } from "@/utils/timestampUtils";
import { useTranslatedActivityTypes } from "@/hooks/useTranslatedActivityTypes";

// Validation schema for activity (activityType will be validated as string since it's dynamic)
const activitySchema = z.object({
  type: z.literal("activity"),
  date: z.date({ message: "Date is required" }),
  horseId: z.string().min(1, "Horse is required"),
  activityType: z.string().min(1, "Activity type is required"), // Changed to string for dynamic types
  activityTypeConfigId: z.string().optional(), // NEW: Reference to config
  activityTypeColor: z.string().optional(), // NEW: Denormalized color
  note: z.string().optional(),
  assignedTo: z.string().optional(),
});

const taskSchema = z.object({
  type: z.literal("task"),
  date: z.date({ message: "Date is required" }),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color"),
  assignedTo: z.string().optional(),
});

const messageSchema = z.object({
  type: z.literal("message"),
  date: z.date({ message: "Date is required" }),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color"),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

const routineSchema = z.object({
  type: z.literal("routine"),
  date: z.date({ message: "Date is required" }),
  endDate: z.date().optional(),
  selectedDays: z
    .array(z.number().min(0).max(6))
    .min(1, "Select at least one day"),
  templateId: z.string().min(1, "Template is required"),
});

const formSchema = z.discriminatedUnion("type", [
  activitySchema,
  taskSchema,
  messageSchema,
  routineSchema,
]);

type FormData = z.infer<typeof formSchema>;

interface ActivityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: ActivityEntry;
  initialDate?: Date; // For pre-filling date when creating
  initialHorseId?: string; // For pre-filling horse when creating
  initialActivityType?: string; // For pre-filling activity type when creating
  onSave: (
    data: Omit<FormData, "type"> & { type: "activity" | "task" | "message" },
  ) => Promise<void>;
  horses?: Array<{ id: string; name: string }>;
  stableMembers?: Array<{ id: string; name: string }>;
  activityTypes?: ActivityTypeConfig[];
  routineTemplates?: RoutineTemplate[];
  onCreateRoutine?: (templateId: string, dates: Date[]) => Promise<void>;
}

export function ActivityFormDialog({
  open,
  onOpenChange,
  entry,
  initialDate,
  initialHorseId,
  initialActivityType,
  onSave,
  horses = [],
  stableMembers = [],
  activityTypes = [],
  routineTemplates = [],
  onCreateRoutine,
}: ActivityFormDialogProps) {
  const { t } = useTranslation(["activities", "routines", "common"]);
  const translateActivityType = useTranslatedActivityTypes();
  const isEditMode = !!entry;
  const [selectedType, setSelectedType] = useState<
    "activity" | "task" | "message" | "routine"
  >("activity");

  // Memoize defaultValues to prevent infinite loop
  const defaultValues = useMemo<FormData>(
    () =>
      ({
        type: "activity",
        date: new Date(),
        horseId: "",
        activityType: "", // Will be set from activityTypes
        activityTypeConfigId: "",
        activityTypeColor: "",
        note: "",
        assignedTo: "",
      }) as any,
    [],
  );

  const { form, handleSubmit, resetForm } = useFormDialog<FormData>({
    schema: formSchema,
    defaultValues,
    onSubmit: async (data) => {
      if (data.type === "routine") {
        // Handle routine creation separately
        if (onCreateRoutine) {
          // Calculate all dates in the range that match selected weekdays
          const startDate = data.date;
          const endDate = data.endDate || data.date;
          const selectedDays = data.selectedDays;

          const allDates = eachDayOfInterval({
            start: startDate,
            end: endDate,
          });
          const matchingDates = allDates.filter((date) =>
            selectedDays.includes(getDay(date)),
          );

          if (matchingDates.length > 0) {
            await onCreateRoutine(data.templateId, matchingDates);
          }
        }
      } else {
        // Handle activity, task, message
        await onSave(
          data as Omit<FormData, "type"> & {
            type: "activity" | "task" | "message";
          },
        );
      }
    },
    onSuccess: () => {
      onOpenChange(false);
    },
    successMessage: isEditMode
      ? t("activities:messages.updateSuccess")
      : selectedType === "routine"
        ? t("routines:scheduling.success")
        : t("activities:messages.createSuccess"),
    errorMessage: isEditMode
      ? t("activities:messages.saveError")
      : t("activities:messages.saveError"),
  });

  const date = form.watch("date");

  // Reset form when dialog opens with entry data or defaults
  useEffect(() => {
    if (entry) {
      setSelectedType(entry.type);

      if (entry.type === "activity") {
        resetForm({
          type: "activity",
          date: toDate(entry.date) || new Date(),
          horseId: entry.horseId,
          activityType: entry.activityType,
          activityTypeConfigId: entry.activityTypeConfigId,
          activityTypeColor: entry.activityTypeColor,
          note: entry.note || "",
          assignedTo: entry.assignedTo || "",
        } as any);
      } else if (entry.type === "task") {
        resetForm({
          type: "task",
          date: toDate(entry.date) || new Date(),
          title: entry.title,
          description: entry.description,
          color: entry.color,
          assignedTo: entry.assignedTo || "",
        } as any);
      } else {
        resetForm({
          type: "message",
          date: toDate(entry.date) || new Date(),
          title: entry.title,
          message: entry.message,
          color: entry.color,
          priority: entry.priority || "medium",
        } as any);
      }
    } else {
      setSelectedType("activity");
      // Use initialActivityType if provided, otherwise first activity type as default
      const selectedActivityType = initialActivityType
        ? activityTypes.find((t) => t.id === initialActivityType)
        : activityTypes.length > 0
          ? activityTypes[0]
          : null;

      resetForm({
        type: "activity",
        date: initialDate || new Date(),
        horseId: initialHorseId || "",
        activityType: selectedActivityType?.name || "",
        activityTypeConfigId: selectedActivityType?.id || "",
        activityTypeColor: selectedActivityType?.color || "",
        note: "",
        assignedTo: "",
      } as any);
    }
  }, [
    entry,
    initialDate,
    initialHorseId,
    initialActivityType,
    resetForm,
    open,
    activityTypes,
  ]);

  // Update form type when radio selection changes
  const handleTypeChange = (
    newType: "activity" | "task" | "message" | "routine",
  ) => {
    setSelectedType(newType);
    form.setValue("type", newType as any);
  };

  // Helper to generate dynamic assignment label
  const getAssignmentLabel = () => {
    // Only for activity type
    if (selectedType !== "activity") {
      return t("activities:form.labels.assignedTo");
    }

    // Get selected activity type config ID
    const selectedConfigId = form.watch("activityTypeConfigId");
    if (!selectedConfigId) {
      return t("activities:form.labels.assignedTo");
    }

    // Find the activity type config
    const selectedActivityType = activityTypes.find(
      (at) => at.id === selectedConfigId,
    );
    if (
      !selectedActivityType ||
      !selectedActivityType.roles ||
      selectedActivityType.roles.length === 0
    ) {
      return t("activities:form.labels.assignedTo");
    }

    // Capitalize and join roles
    const capitalizedRoles = selectedActivityType.roles.map(
      (role) => role.charAt(0).toUpperCase() + role.slice(1).replace(/-/g, " "),
    );

    return capitalizedRoles.join(" / ");
  };

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        isEditMode
          ? t("activities:form.title.edit")
          : t("activities:form.title.create")
      }
      description={
        isEditMode
          ? t("activities:form.description.edit")
          : t("activities:form.description.create")
      }
      form={form}
      onSubmit={handleSubmit}
      submitLabel={
        isEditMode ? t("common:buttons.update") : t("common:buttons.create")
      }
      maxWidth="sm:max-w-[550px]"
      maxHeight="max-h-[90vh]"
    >
      {/* Type Selector */}
      <div className="space-y-3">
        <Label>{t("activities:form.labels.entryType")}</Label>
        <RadioGroup
          value={selectedType}
          onValueChange={(value) =>
            handleTypeChange(
              value as "activity" | "task" | "message" | "routine",
            )
          }
          className="flex flex-wrap gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="activity" id="type-activity" />
            <Label
              htmlFor="type-activity"
              className="font-normal cursor-pointer"
            >
              {t("activities:form.entryTypes.activity")}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="task" id="type-task" />
            <Label htmlFor="type-task" className="font-normal cursor-pointer">
              {t("activities:form.entryTypes.task")}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="message" id="type-message" />
            <Label
              htmlFor="type-message"
              className="font-normal cursor-pointer"
            >
              {t("activities:form.entryTypes.message")}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem
              value="routine"
              id="type-routine"
              disabled={!onCreateRoutine || routineTemplates.length === 0}
            />
            <Label
              htmlFor="type-routine"
              className="font-normal cursor-pointer flex items-center gap-1"
            >
              <ListChecks className="h-4 w-4" />
              {t("activities:form.entryTypes.routine")}
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Date Picker */}
      <div className="space-y-2">
        <Label>
          {t("activities:form.labels.date")}{" "}
          <span className="text-destructive">*</span>
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date
                ? format(date, "PPP")
                : t("activities:form.placeholders.pickDate")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(date) => date && form.setValue("date", date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {form.formState.errors.date && (
          <p className="text-sm text-destructive">
            {form.formState.errors.date.message}
          </p>
        )}
      </div>

      {/* Activity-specific fields */}
      {selectedType === "activity" && (
        <>
          <FormSelect
            name="horseId"
            label={t("activities:form.labels.horse")}
            form={form as any}
            options={horses.map((h) => ({ value: h.id, label: h.name }))}
            placeholder={t("activities:form.placeholders.selectHorse")}
            required
          />

          {/* Activity Type - Custom select with icons and colors */}
          <div className="space-y-2">
            <Label htmlFor="activityType">
              {t("activities:form.labels.activityType")}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <select
              value={
                form.watch("activityTypeConfigId") || form.watch("activityType")
              }
              onChange={(e) => {
                const configId = e.target.value;
                const actType = activityTypes.find((at) => at.id === configId);
                if (actType) {
                  form.setValue("activityType", actType.name);
                  form.setValue("activityTypeConfigId", actType.id);
                  form.setValue("activityTypeColor", actType.color);
                }
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">
                {t("activities:form.placeholders.selectActivityType")}
              </option>
              {activityTypes
                .filter((at) => at.isActive)
                .map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.icon ? `${type.icon} ` : ""}
                    {translateActivityType(type)}
                  </option>
                ))}
            </select>
            {"activityType" in form.formState.errors &&
              form.formState.errors.activityType && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.activityType.message}
                </p>
              )}
          </div>
        </>
      )}

      {/* Task-specific fields */}
      {selectedType === "task" && (
        <>
          <FormInput
            name="title"
            label={t("activities:form.labels.title")}
            form={form as any}
            placeholder={t("activities:form.placeholders.taskTitle")}
            required
          />

          <FormTextarea
            name="description"
            label={t("activities:form.labels.description")}
            form={form as any}
            placeholder={t("activities:form.placeholders.taskDescription")}
            rows={3}
            required
          />

          <FormColorPicker
            name="color"
            label={t("activities:form.labels.color")}
            form={form as any}
            colors={DEFAULT_COLORS as unknown as string[]}
            required
          />
        </>
      )}

      {/* Message-specific fields */}
      {selectedType === "message" && (
        <>
          <FormInput
            name="title"
            label={t("activities:form.labels.title")}
            form={form as any}
            placeholder={t("activities:form.placeholders.messageTitle")}
            required
          />

          <FormTextarea
            name="message"
            label={t("activities:form.labels.message")}
            form={form as any}
            placeholder={t("activities:form.placeholders.message")}
            rows={3}
            required
          />

          <FormColorPicker
            name="color"
            label={t("activities:form.labels.color")}
            form={form as any}
            colors={DEFAULT_COLORS as unknown as string[]}
            required
          />

          <FormSelect
            name="priority"
            label={t("activities:form.labels.priority")}
            form={form as any}
            options={[
              { value: "low", label: t("activities:form.priority.low") },
              { value: "medium", label: t("activities:form.priority.medium") },
              { value: "high", label: t("activities:form.priority.high") },
            ]}
          />
        </>
      )}

      {/* Routine-specific fields */}
      {selectedType === "routine" && (
        <>
          {routineTemplates.length > 0 ? (
            <>
              <FormSelect
                name="templateId"
                label={t("activities:form.labels.template")}
                form={form as any}
                options={routineTemplates.map((t) => ({
                  value: t.id,
                  label: t.name,
                }))}
                placeholder={t("activities:form.placeholders.selectTemplate")}
                required
              />

              {/* End Date Picker */}
              <div className="space-y-2">
                <Label>{t("activities:form.labels.endDate")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.watch("endDate") && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch("endDate")
                        ? format(form.watch("endDate") as Date, "PPP")
                        : t("activities:form.placeholders.pickEndDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={form.watch("endDate") as Date | undefined}
                      onSelect={(endDate) =>
                        endDate && form.setValue("endDate", endDate)
                      }
                      disabled={(date) =>
                        date < (form.watch("date") || new Date())
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Weekday Selection */}
              <div className="space-y-3">
                <Label>
                  {t("activities:form.labels.weekdays")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { day: 1, label: t("activities:form.weekdays.mon") },
                    { day: 2, label: t("activities:form.weekdays.tue") },
                    { day: 3, label: t("activities:form.weekdays.wed") },
                    { day: 4, label: t("activities:form.weekdays.thu") },
                    { day: 5, label: t("activities:form.weekdays.fri") },
                    { day: 6, label: t("activities:form.weekdays.sat") },
                    { day: 0, label: t("activities:form.weekdays.sun") },
                  ].map(({ day, label }) => {
                    const selectedDays =
                      (form.watch("selectedDays") as number[]) || [];
                    const isChecked = selectedDays.includes(day);
                    return (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox
                          id={`day-${day}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            const current = selectedDays;
                            if (checked) {
                              form.setValue("selectedDays", [...current, day]);
                            } else {
                              form.setValue(
                                "selectedDays",
                                current.filter((d) => d !== day),
                              );
                            }
                          }}
                        />
                        <Label
                          htmlFor={`day-${day}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
                {"selectedDays" in form.formState.errors &&
                  form.formState.errors.selectedDays && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.selectedDays.message}
                    </p>
                  )}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground p-4 bg-muted rounded-md">
              {t("activities:form.noTemplatesAvailable")}
            </div>
          )}
        </>
      )}

      {/* Assigned To (common field - hidden for routines) */}
      {selectedType !== "routine" && (
        <FormSelect
          name="assignedTo"
          label={getAssignmentLabel()}
          form={form as any}
          options={stableMembers.map((m) => ({ value: m.id, label: m.name }))}
          placeholder={t("activities:form.placeholders.unassigned")}
        />
      )}

      {/* Note field (activity-specific, at bottom) */}
      {selectedType === "activity" && (
        <FormTextarea
          name="note"
          label={t("activities:form.labels.note")}
          form={form as any}
          placeholder={t("activities:form.placeholders.notes")}
          rows={3}
        />
      )}
    </BaseFormDialog>
  );
}
