import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TeamMember, TeamMemberRole } from "@shared/types/team";

const TEAM_ROLES: { value: TeamMemberRole; en: string; sv: string }[] = [
  { value: "rider", en: "Rider", sv: "Ryttare" },
  { value: "groom", en: "Groom", sv: "Skötare" },
  { value: "farrier", en: "Farrier", sv: "Hovslagare" },
  { value: "veterinarian", en: "Veterinarian", sv: "Veterinär" },
  { value: "trainer", en: "Trainer", sv: "Tränare" },
  { value: "dentist", en: "Equine Dentist", sv: "Tandvårdare" },
  { value: "physiotherapist", en: "Physiotherapist", sv: "Fysioterapeut" },
  { value: "saddler", en: "Saddler", sv: "Sadelmakare" },
  { value: "other", en: "Other", sv: "Annan" },
];

const formSchema = z.object({
  role: z.enum([
    "rider",
    "groom",
    "farrier",
    "veterinarian",
    "trainer",
    "dentist",
    "physiotherapist",
    "saddler",
    "other",
  ]),
  displayName: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  isPrimary: z.boolean().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TeamMemberFormProps {
  defaultValues?: Partial<TeamMember>;
  onSubmit: (data: Partial<TeamMember>) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function TeamMemberForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: TeamMemberFormProps) {
  const { t, i18n } = useTranslation(["horses", "common"]);

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      role: defaultValues?.role || "rider",
      displayName: defaultValues?.displayName || "",
      email: defaultValues?.email || "",
      phone: defaultValues?.phone || "",
      isPrimary: defaultValues?.isPrimary || false,
      notes: defaultValues?.notes || "",
    },
  });

  const handleSubmit = (values: FormValues) => {
    const data: Partial<TeamMember> = {
      role: values.role,
      displayName: values.displayName,
      isPrimary: values.isPrimary,
    };

    if (values.email) {
      data.email = values.email;
    }
    if (values.phone) {
      data.phone = values.phone;
    }
    if (values.notes) {
      data.notes = values.notes;
    }

    // Set externalName since we're not linking to users/contacts
    data.externalName = values.displayName;

    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Role */}
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("horses:team.role", "Role")} *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TEAM_ROLES.map((role) => (
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

        {/* Display Name */}
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("horses:team.name", "Name")} *</FormLabel>
              <FormControl>
                <Input
                  placeholder={t(
                    "horses:team.namePlaceholder",
                    "Enter team member's name",
                  )}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("horses:team.email", "Email")}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder={t(
                    "horses:team.emailPlaceholder",
                    "contact@example.com",
                  )}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Phone */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("horses:team.phone", "Phone")}</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder={t(
                    "horses:team.phonePlaceholder",
                    "+46 70 123 4567",
                  )}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Primary */}
        <FormField
          control={form.control}
          name="isPrimary"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  {t("horses:team.setPrimary", "Set as primary")}
                </FormLabel>
                <FormDescription>
                  {t(
                    "horses:team.primaryDescription",
                    "This person will be the default for this role in activities",
                  )}
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("horses:team.notes", "Notes")}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t(
                    "horses:team.notesPlaceholder",
                    "Any additional information...",
                  )}
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("common:buttons.cancel", "Cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {defaultValues
              ? t("common:buttons.save", "Save")
              : t("common:buttons.add", "Add")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
