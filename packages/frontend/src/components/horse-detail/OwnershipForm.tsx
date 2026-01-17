import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { authFetch } from "@/lib/authFetch";
import type { HorseOwnership, OwnershipRole } from "@shared/types/ownership";
import { toDate } from "@/utils/timestampUtils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const OWNERSHIP_ROLES: { value: OwnershipRole; en: string; sv: string }[] = [
  { value: "primary", en: "Primary Owner", sv: "Huvudägare" },
  { value: "co-owner", en: "Co-Owner", sv: "Delägare" },
  { value: "syndicate", en: "Syndicate", sv: "Syndikat" },
  { value: "leaseholder", en: "Leaseholder", sv: "Hyrägare" },
];

const formSchema = z.object({
  ownerName: z.string().min(1, "Owner name is required"),
  ownerEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  ownerPhone: z.string().optional(),
  role: z.enum(["primary", "co-owner", "syndicate", "leaseholder"]),
  percentage: z
    .number()
    .min(0, "Percentage must be at least 0")
    .max(100, "Percentage cannot exceed 100"),
  startDate: z.date({ message: "Start date is required" }),
  endDate: z.date().optional().nullable(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface OwnershipFormProps {
  horseId: string;
  ownership?: HorseOwnership;
  currentTotal: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function OwnershipForm({
  horseId,
  ownership,
  currentTotal,
  onSuccess,
  onCancel,
}: OwnershipFormProps) {
  const { t, i18n } = useTranslation(["horses", "common"]);
  const isEditing = !!ownership;

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      ownerName: ownership?.ownerName || "",
      ownerEmail: ownership?.ownerEmail || "",
      ownerPhone: ownership?.ownerPhone || "",
      role: ownership?.role || "co-owner",
      percentage: ownership?.percentage || 0,
      startDate: ownership?.startDate
        ? toDate(ownership.startDate) || new Date()
        : new Date(),
      endDate: ownership?.endDate ? toDate(ownership.endDate) : null,
      notes: ownership?.notes || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const url = isEditing
        ? `/api/v1/horse-ownership/${ownership.id}`
        : "/api/v1/horse-ownership";

      const method = isEditing ? "PATCH" : "POST";

      const body = {
        ...values,
        horseId,
        ownerEmail: values.ownerEmail || undefined,
        startDate: values.startDate.toISOString(),
        endDate: values.endDate ? values.endDate.toISOString() : null,
      };

      const response = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save ownership");
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

  const watchedPercentage = form.watch("percentage");
  const projectedTotal = currentTotal + (watchedPercentage || 0);
  const willExceed100 = projectedTotal > 100;
  const remainingPercentage = Math.max(0, 100 - currentTotal);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Owner Name */}
        <FormField
          control={form.control}
          name="ownerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("horses:ownership.ownerName", "Owner Name")} *
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={t(
                    "horses:ownership.ownerNamePlaceholder",
                    "Enter owner's full name",
                  )}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Contact Info Row */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="ownerEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("horses:ownership.email", "Email")}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder={t(
                      "horses:ownership.emailPlaceholder",
                      "owner@example.com",
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
            name="ownerPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("horses:ownership.phone", "Phone")}</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder={t(
                      "horses:ownership.phonePlaceholder",
                      "+46 70 123 4567",
                    )}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Role and Percentage Row */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("horses:ownership.role", "Role")} *</FormLabel>
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
                    {OWNERSHIP_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {i18n.language === "sv" ? role.sv : role.en}
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
            name="percentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("horses:ownership.percentage", "Ownership %")} *
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="0"
                    {...field}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? parseFloat(e.target.value) : 0,
                      )
                    }
                  />
                </FormControl>
                <FormDescription>
                  {t("horses:ownership.available", "Available")}:{" "}
                  {remainingPercentage}%
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Warning if percentage will exceed 100% */}
        {willExceed100 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>
              {t(
                "horses:ownership.exceedsWarning",
                "Total ownership will be {{total}}%, which exceeds 100%",
                { total: projectedTotal },
              )}
            </span>
          </div>
        )}

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("horses:ownership.startDate", "Start Date")} *
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
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("horses:ownership.endDate", "End Date")}
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
                            {t("horses:ownership.ongoing", "Ongoing")}
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
                      disabled={(date) =>
                        date < (form.getValues("startDate") || new Date())
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  {t(
                    "horses:ownership.endDateHint",
                    "Leave empty for active ownership",
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("horses:ownership.notes", "Notes")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t(
                    "horses:ownership.notesPlaceholder",
                    "Additional notes about ownership...",
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
