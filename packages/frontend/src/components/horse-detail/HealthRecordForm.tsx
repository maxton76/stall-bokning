import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { authFetch } from "@/lib/authFetch";
import type { HealthRecord, HealthRecordType } from "@shared/types/health";
import { toDate } from "@/utils/timestampUtils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const RECORD_TYPES: { value: HealthRecordType; en: string; sv: string }[] = [
  { value: "veterinary", en: "Veterinary Visit", sv: "Veterinärbesök" },
  { value: "farrier", en: "Farrier Visit", sv: "Hovslagare" },
  { value: "dental", en: "Dental Care", sv: "Tandvård" },
  { value: "medication", en: "Medication", sv: "Medicinering" },
  { value: "injury", en: "Injury", sv: "Skada" },
  { value: "deworming", en: "Deworming", sv: "Avmaskning" },
  { value: "other", en: "Other", sv: "Annat" },
];

const formSchema = z.object({
  recordType: z.enum([
    "veterinary",
    "farrier",
    "dental",
    "medication",
    "injury",
    "deworming",
    "other",
  ]),
  title: z.string().min(1, "Title is required"),
  date: z.date({ message: "Date is required" }),
  provider: z.string().optional(),
  clinic: z.string().optional(),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  symptoms: z.string().optional(),
  findings: z.string().optional(),
  cost: z.number().optional(),
  requiresFollowUp: z.boolean().default(false),
  followUpDate: z.date().optional().nullable(),
  followUpNotes: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface HealthRecordFormProps {
  horseId: string;
  record?: HealthRecord;
  onSuccess: () => void;
  onCancel: () => void;
}

export function HealthRecordForm({
  horseId,
  record,
  onSuccess,
  onCancel,
}: HealthRecordFormProps) {
  const { t, i18n } = useTranslation(["horses", "common"]);
  const isEditing = !!record;

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      recordType: record?.recordType || "veterinary",
      title: record?.title || "",
      date: record?.date ? toDate(record.date) || new Date() : new Date(),
      provider: record?.provider || "",
      clinic: record?.clinic || "",
      diagnosis: record?.diagnosis || "",
      treatment: record?.treatment || "",
      symptoms: record?.symptoms || "",
      findings: record?.findings || "",
      cost: record?.cost || undefined,
      requiresFollowUp: record?.requiresFollowUp || false,
      followUpDate: record?.followUpDate ? toDate(record.followUpDate) : null,
      followUpNotes: record?.followUpNotes || "",
      notes: record?.notes || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const url = isEditing
        ? `/api/v1/health-records/${record.id}`
        : "/api/v1/health-records";

      const method = isEditing ? "PATCH" : "POST";

      const body = {
        ...values,
        horseId,
        date: values.date.toISOString(),
        followUpDate: values.followUpDate
          ? values.followUpDate.toISOString()
          : null,
      };

      const response = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save health record");
      }

      return response.json();
    },
    onSuccess: () => {
      onSuccess();
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  const requiresFollowUp = form.watch("requiresFollowUp");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Type and Date Row */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="recordType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("horses:health.type", "Type")} *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {RECORD_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {i18n.language === "sv" ? type.sv : type.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("horses:health.date", "Date")} *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>{t("common:selectDate", "Pick a date")}</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("horses:health.titleField", "Title")} *</FormLabel>
              <FormControl>
                <Input
                  placeholder={t(
                    "horses:health.titlePlaceholder",
                    "e.g., Annual checkup, Colic treatment",
                  )}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Provider and Clinic */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("horses:health.provider", "Provider")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t(
                      "horses:health.providerPlaceholder",
                      "Vet name, farrier name, etc.",
                    )}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clinic"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("horses:health.clinic", "Clinic/Facility")}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t(
                      "horses:health.clinicPlaceholder",
                      "Clinic name",
                    )}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Diagnosis and Treatment */}
        <FormField
          control={form.control}
          name="diagnosis"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("horses:health.diagnosis", "Diagnosis")}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t(
                    "horses:health.diagnosisPlaceholder",
                    "Diagnosis details...",
                  )}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="treatment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("horses:health.treatment", "Treatment")}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t(
                    "horses:health.treatmentPlaceholder",
                    "Treatment provided...",
                  )}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Cost */}
        <FormField
          control={form.control}
          name="cost"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("horses:health.cost", "Cost (SEK)")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0"
                  {...field}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? parseFloat(e.target.value) : undefined,
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Follow-up Section */}
        <div className="space-y-4 border-t pt-4">
          <FormField
            control={form.control}
            name="requiresFollowUp"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="!mt-0">
                  {t("horses:health.requiresFollowUp", "Requires follow-up")}
                </FormLabel>
              </FormItem>
            )}
          />

          {requiresFollowUp && (
            <>
              <FormField
                control={form.control}
                name="followUpDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("horses:health.followUpDate", "Follow-up Date")}
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>
                                {t("common:selectDate", "Pick a date")}
                              </span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="followUpNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("horses:health.followUpNotes", "Follow-up Notes")}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t(
                          "horses:health.followUpNotesPlaceholder",
                          "What needs to be done at the follow-up...",
                        )}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
        </div>

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("horses:health.notes", "Additional Notes")}
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t(
                    "horses:health.notesPlaceholder",
                    "Any additional notes...",
                  )}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("common:buttons.cancel", "Cancel")}
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isEditing
              ? t("common:buttons.save", "Save")
              : t("common:buttons.create", "Create")}
          </Button>
        </div>

        {mutation.isError && (
          <p className="text-sm text-destructive">
            {mutation.error instanceof Error
              ? mutation.error.message
              : t("common:errors.unknown", "An error occurred")}
          </p>
        )}
      </form>
    </Form>
  );
}
