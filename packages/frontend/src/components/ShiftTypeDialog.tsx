import { useEffect, useState } from "react";
import { z } from "zod";
import { BaseFormDialog } from "@/components/BaseFormDialog";
import { useFormDialog } from "@/hooks/useFormDialog";
import { FormInput, FormCheckboxGroup, FormTextarea } from "@/components/form";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sunrise, Sun, Sunset, Moon, Sparkles } from "lucide-react";
import type { ShiftType } from "@/types/schedule";

interface ShiftTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    shiftType: Omit<ShiftType, "id" | "stableId" | "createdAt" | "updatedAt">,
  ) => Promise<void>;
  shiftType?: ShiftType | null;
  title?: string;
}

const DAYS_OF_WEEK = [
  { value: "Mon", label: "Monday" },
  { value: "Tue", label: "Tuesday" },
  { value: "Wed", label: "Wednesday" },
  { value: "Thu", label: "Thursday" },
  { value: "Fri", label: "Friday" },
  { value: "Sat", label: "Saturday" },
  { value: "Sun", label: "Sunday" },
];

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const HOURS = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, "0"),
);
const MINUTES = ["00", "15", "30", "45"];

// Shift type templates based on common stable routines
interface ShiftTemplate {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
  points: number;
  daysOfWeek: string[];
}

const SHIFT_TEMPLATES: ShiftTemplate[] = [
  {
    id: "morning",
    name: "Morgon / Morning",
    icon: <Sunrise className="h-4 w-4" />,
    description: `Fokus: hästarna ut, stall i ordning

1. Morgonfodring (kraftfoder / grovfoder)
2. Utsläpp i hagar
3. Täcken på/av (väderberoende)
4. Mockning av boxar
5. Påfyllning av vatten & strö
6. Snabb hälsokoll (halt, sår, koliktecken)
7. Ordning i stallgång & foderutrymmen`,
    startHour: "05",
    startMinute: "30",
    endHour: "09",
    endMinute: "00",
    points: 10,
    daysOfWeek: ALL_DAYS,
  },
  {
    id: "day",
    name: "Dag / Day",
    icon: <Sun className="h-4 w-4" />,
    description: `Fokus: tillsyn & underhåll

1. Tillsyn av hagar (vatten, staket, hästar)
2. Ev. lunchfodring / grovfoder i hage
3. In-/utsläpp för ridning, träning, hovslagare, veterinär
4. Mockning av hagar / lösdrift (ibland)
5. Specialuppgifter:
   • Medicinering
   • Sårvård
   • Rehab / boxvila
6. Påfyllning av hö, foder, spån`,
    startHour: "09",
    startMinute: "00",
    endHour: "16",
    endMinute: "00",
    points: 8,
    daysOfWeek: ALL_DAYS,
  },
  {
    id: "evening",
    name: "Kväll / Evening",
    icon: <Sunset className="h-4 w-4" />,
    description: `Fokus: hästarna in, kvällsrutiner

1. Intag från hagar
2. Av med täcken / byte till stalltäcke
3. Kvällsfodring
4. Mockning (om inte gjort på morgonen)
5. Vattenkoll i boxar
6. Låsning, släckning, ordning`,
    startHour: "16",
    startMinute: "00",
    endHour: "20",
    endMinute: "00",
    points: 10,
    daysOfWeek: ALL_DAYS,
  },
  {
    id: "night",
    name: "Sen kväll / Late Night",
    icon: <Moon className="h-4 w-4" />,
    description: `Fokus: trygghet & kontroll

1. Kvälls-/nattcheck
2. Extra hö
3. Kontroll av:
   • Liggande hästar
   • Stress / oro
   • Larm, portar, dörrar`,
    startHour: "21",
    startMinute: "00",
    endHour: "23",
    endMinute: "00",
    points: 5,
    daysOfWeek: ALL_DAYS,
  },
];

// Helper functions for time range parsing and formatting
function parseTimeRange(timeRange: string): {
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
} {
  const [start, end] = timeRange.split("-");
  const [startHour = "07", startMinute = "00"] = (start || "").split(":");
  const [endHour = "09", endMinute = "00"] = (end || "").split(":");
  return { startHour, startMinute, endHour, endMinute };
}

function formatTimeRange(
  startHour: string,
  startMinute: string,
  endHour: string,
  endMinute: string,
): string {
  return `${startHour}:${startMinute}-${endHour}:${endMinute}`;
}

const shiftTypeSchema = z
  .object({
    name: z
      .string()
      .min(1, "Shift name is required")
      .max(100, "Name must be 100 characters or less"),
    description: z
      .string()
      .max(2000, "Description must be 2000 characters or less")
      .optional(),
    points: z
      .number()
      .min(1, "Points must be at least 1")
      .max(100, "Points must be 100 or less")
      .int(),
    daysOfWeek: z.array(z.string()).min(1, "Select at least one day"),
    startHour: z.string(),
    startMinute: z.string(),
    endHour: z.string(),
    endMinute: z.string(),
  })
  .refine(
    (data) => {
      const startTime =
        parseInt(data.startHour) * 60 + parseInt(data.startMinute);
      const endTime = parseInt(data.endHour) * 60 + parseInt(data.endMinute);
      return endTime > startTime;
    },
    {
      message: "End time must be after start time",
      path: ["endHour"],
    },
  );

type ShiftTypeFormData = z.infer<typeof shiftTypeSchema>;

export function ShiftTypeDialog({
  open,
  onOpenChange,
  onSave,
  shiftType,
  title,
}: ShiftTypeDialogProps) {
  const isEditMode = !!shiftType;
  const [activeTab, setActiveTab] = useState<string>("templates");

  const { form, handleSubmit, resetForm } = useFormDialog<ShiftTypeFormData>({
    schema: shiftTypeSchema,
    defaultValues: {
      name: "",
      description: "",
      points: 1,
      daysOfWeek: [],
      startHour: "07",
      startMinute: "00",
      endHour: "09",
      endMinute: "00",
    },
    onSubmit: async (data) => {
      const time = formatTimeRange(
        data.startHour,
        data.startMinute,
        data.endHour,
        data.endMinute,
      );

      await onSave({
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
        points: data.points,
        time,
        daysOfWeek: data.daysOfWeek,
      });
    },
    onSuccess: () => {
      onOpenChange(false);
    },
    successMessage: isEditMode
      ? "Shift type updated successfully"
      : "Shift type created successfully",
    errorMessage: isEditMode
      ? "Failed to update shift type"
      : "Failed to create shift type",
  });

  // Reset form when dialog opens with shift type data
  useEffect(() => {
    if (shiftType) {
      const { startHour, startMinute, endHour, endMinute } = parseTimeRange(
        shiftType.time,
      );
      resetForm({
        name: shiftType.name,
        description: shiftType.description || "",
        points: shiftType.points,
        daysOfWeek: shiftType.daysOfWeek,
        startHour,
        startMinute,
        endHour,
        endMinute,
      });
      setActiveTab("custom"); // When editing, go to custom tab
    } else {
      resetForm();
      setActiveTab("templates"); // When creating new, show templates first
    }
  }, [shiftType, open]);

  const applyTemplate = (template: ShiftTemplate) => {
    resetForm({
      name: template.name,
      description: template.description,
      points: template.points,
      daysOfWeek: template.daysOfWeek,
      startHour: template.startHour,
      startMinute: template.startMinute,
      endHour: template.endHour,
      endMinute: template.endMinute,
    });
    setActiveTab("custom");
  };

  const dialogTitle =
    title || (isEditMode ? "Edit Shift Type" : "Create Shift Type");
  const dialogDescription = isEditMode
    ? "Update the shift type details below."
    : "Choose a template or create a custom shift type.";

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={dialogTitle}
      description={dialogDescription}
      form={form}
      onSubmit={handleSubmit}
      submitLabel={isEditMode ? "Update" : "Create"}
      maxWidth="sm:max-w-[600px]"
    >
      {!isEditMode && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">
              <Sparkles className="mr-2 h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-4">
            <div className="grid gap-3">
              {SHIFT_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className="border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => applyTemplate(template)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-full bg-primary/10 text-primary">
                        {template.icon}
                      </div>
                      <div>
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {template.startHour}:{template.startMinute} -{" "}
                          {template.endHour}:{template.endMinute}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{template.points} pts</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2 whitespace-pre-line">
                    {template.description.split("\n")[0]}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      applyTemplate(template);
                    }}
                  >
                    Use Template
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              Click a template to customize it, or switch to "Custom" to create
              from scratch
            </p>
          </TabsContent>

          <TabsContent value="custom" className="mt-4 space-y-4">
            <ShiftTypeFormFields form={form} />
          </TabsContent>
        </Tabs>
      )}

      {isEditMode && (
        <div className="space-y-4">
          <ShiftTypeFormFields form={form} />
        </div>
      )}
    </BaseFormDialog>
  );
}

// Extracted form fields component
function ShiftTypeFormFields({ form }: { form: any }) {
  return (
    <>
      <FormInput
        name="name"
        label="Shift Name"
        form={form}
        placeholder="e.g., Morning Cleaning"
        required
      />

      <FormTextarea
        name="description"
        label="Description"
        form={form}
        placeholder="Describe what tasks should be done during this shift..."
        helperText="List the tasks that need to be completed during this shift"
        rows={6}
      />

      {/* Time Range Picker - Custom layout for better UX */}
      <div className="space-y-2">
        <Label>
          Time Range <span className="text-destructive ml-1">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Start Time</Label>
            <div className="flex gap-2">
              <Select
                value={form.watch("startHour")}
                onValueChange={(value) => form.setValue("startHour", value)}
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
              <Select
                value={form.watch("startMinute")}
                onValueChange={(value) => form.setValue("startMinute", value)}
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
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">End Time</Label>
            <div className="flex gap-2">
              <Select
                value={form.watch("endHour")}
                onValueChange={(value) => form.setValue("endHour", value)}
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
              <Select
                value={form.watch("endMinute")}
                onValueChange={(value) => form.setValue("endMinute", value)}
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
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {formatTimeRange(
            form.watch("startHour"),
            form.watch("startMinute"),
            form.watch("endHour"),
            form.watch("endMinute"),
          )}
        </p>
        {form.formState.errors.endHour && (
          <p className="text-sm text-destructive">
            {form.formState.errors.endHour.message}
          </p>
        )}
      </div>

      <FormInput
        name="points"
        label="Points"
        form={form}
        type="number"
        placeholder="e.g., 10"
        helperText="Weight value for fairness algorithm"
        required
      />

      <FormCheckboxGroup
        name="daysOfWeek"
        label="Days of Week"
        form={form}
        options={DAYS_OF_WEEK}
        columns={2}
        required
      />
    </>
  );
}
