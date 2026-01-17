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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Loader2, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TackItem, TackCategory, TackCondition } from "@shared/types/tack";

const TACK_CATEGORIES: { value: TackCategory; en: string; sv: string }[] = [
  { value: "saddle", en: "Saddle", sv: "Sadel" },
  { value: "bridle", en: "Bridle", sv: "Huvudlag" },
  { value: "blanket", en: "Blanket/Rug", sv: "Täcke" },
  { value: "boots", en: "Boots", sv: "Benskydd" },
  { value: "grooming", en: "Grooming", sv: "Ryktning" },
  { value: "halter", en: "Halter", sv: "Grimma" },
  { value: "lunge", en: "Lunging", sv: "Longering" },
  { value: "protective", en: "Protective Gear", sv: "Skyddsutrustning" },
  { value: "rider", en: "Rider Equipment", sv: "Ryttarutrustning" },
  { value: "other", en: "Other", sv: "Övrigt" },
];

const TACK_CONDITIONS: { value: TackCondition; en: string; sv: string }[] = [
  { value: "new", en: "New", sv: "Ny" },
  { value: "excellent", en: "Excellent", sv: "Utmärkt" },
  { value: "good", en: "Good", sv: "Bra" },
  { value: "fair", en: "Fair", sv: "Okej" },
  { value: "poor", en: "Poor", sv: "Dålig" },
  { value: "needs_repair", en: "Needs Repair", sv: "Behöver reparation" },
];

const formSchema = z.object({
  category: z.enum([
    "saddle",
    "bridle",
    "blanket",
    "boots",
    "grooming",
    "halter",
    "lunge",
    "protective",
    "rider",
    "other",
  ]),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  condition: z.enum([
    "new",
    "excellent",
    "good",
    "fair",
    "poor",
    "needs_repair",
  ]),
  conditionNotes: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.string().optional(),
  purchasedFrom: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  warrantyNotes: z.string().optional(),
  storageLocation: z.string().optional(),
  nextMaintenanceDate: z.string().optional(),
  maintenanceNotes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TackItemFormProps {
  defaultValues?: Partial<TackItem>;
  onSubmit: (data: Partial<TackItem>) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function TackItemForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: TackItemFormProps) {
  const { t, i18n } = useTranslation(["horses", "common"]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Convert Timestamp to date string for form
  const toDateString = (date: unknown): string => {
    if (!date) return "";
    if (typeof date === "object" && "seconds" in (date as object)) {
      return new Date((date as { seconds: number }).seconds * 1000)
        .toISOString()
        .split("T")[0];
    }
    if (date instanceof Date) {
      return date.toISOString().split("T")[0];
    }
    return "";
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: defaultValues?.category || "saddle",
      name: defaultValues?.name || "",
      description: defaultValues?.description || "",
      brand: defaultValues?.brand || "",
      model: defaultValues?.model || "",
      size: defaultValues?.size || "",
      color: defaultValues?.color || "",
      condition: defaultValues?.condition || "good",
      conditionNotes: defaultValues?.conditionNotes || "",
      purchaseDate: toDateString(defaultValues?.purchaseDate),
      purchasePrice: defaultValues?.purchasePrice?.toString() || "",
      purchasedFrom: defaultValues?.purchasedFrom || "",
      warrantyExpiry: toDateString(defaultValues?.warrantyExpiry),
      warrantyNotes: defaultValues?.warrantyNotes || "",
      storageLocation: defaultValues?.storageLocation || "",
      nextMaintenanceDate: toDateString(defaultValues?.nextMaintenanceDate),
      maintenanceNotes: defaultValues?.maintenanceNotes || "",
    },
  });

  const handleSubmit = (values: FormValues) => {
    const data: Partial<TackItem> = {
      category: values.category,
      name: values.name,
      condition: values.condition,
    };

    if (values.description) data.description = values.description;
    if (values.brand) data.brand = values.brand;
    if (values.model) data.model = values.model;
    if (values.size) data.size = values.size;
    if (values.color) data.color = values.color;
    if (values.conditionNotes) data.conditionNotes = values.conditionNotes;
    if (values.purchaseDate)
      data.purchaseDate = new Date(
        values.purchaseDate,
      ) as unknown as typeof data.purchaseDate;
    if (values.purchasePrice)
      data.purchasePrice = parseFloat(values.purchasePrice);
    if (values.purchasedFrom) data.purchasedFrom = values.purchasedFrom;
    if (values.warrantyExpiry)
      data.warrantyExpiry = new Date(
        values.warrantyExpiry,
      ) as unknown as typeof data.warrantyExpiry;
    if (values.warrantyNotes) data.warrantyNotes = values.warrantyNotes;
    if (values.storageLocation) data.storageLocation = values.storageLocation;
    if (values.nextMaintenanceDate)
      data.nextMaintenanceDate = new Date(
        values.nextMaintenanceDate,
      ) as unknown as typeof data.nextMaintenanceDate;
    if (values.maintenanceNotes)
      data.maintenanceNotes = values.maintenanceNotes;

    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("horses:tack.category", "Category")} *</FormLabel>
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
                    {TACK_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {i18n.language === "sv" ? cat.sv : cat.en}
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
            name="condition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("horses:tack.condition", "Condition")} *
                </FormLabel>
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
                    {TACK_CONDITIONS.map((cond) => (
                      <SelectItem key={cond.value} value={cond.value}>
                        {i18n.language === "sv" ? cond.sv : cond.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("horses:tack.name", "Item Name")} *</FormLabel>
              <FormControl>
                <Input
                  placeholder={t(
                    "horses:tack.namePlaceholder",
                    "e.g., Dressage Saddle",
                  )}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("horses:tack.brand", "Brand")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t(
                      "horses:tack.brandPlaceholder",
                      "e.g., Stubben",
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
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("horses:tack.model", "Model")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t(
                      "horses:tack.modelPlaceholder",
                      "e.g., Scandica",
                    )}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="size"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("horses:tack.size", "Size")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t(
                      "horses:tack.sizePlaceholder",
                      "e.g., 17.5 inch",
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
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("horses:tack.color", "Color")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t(
                      "horses:tack.colorPlaceholder",
                      "e.g., Brown",
                    )}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="storageLocation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("horses:tack.storageLocation", "Storage Location")}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={t(
                    "horses:tack.storageLocationPlaceholder",
                    "e.g., Tack room shelf 3",
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("horses:tack.description", "Description")}
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t(
                    "horses:tack.descriptionPlaceholder",
                    "Additional details...",
                  )}
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Advanced Section */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-between"
            >
              {t(
                "horses:tack.advancedDetails",
                "Purchase & Maintenance Details",
              )}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("horses:tack.purchaseDate", "Purchase Date")}
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchasePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("horses:tack.purchasePrice", "Purchase Price (SEK)")}
                    </FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="purchasedFrom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("horses:tack.purchasedFrom", "Purchased From")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t(
                        "horses:tack.purchasedFromPlaceholder",
                        "Store or seller name",
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="warrantyExpiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("horses:tack.warrantyExpiry", "Warranty Expires")}
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nextMaintenanceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("horses:tack.nextMaintenance", "Next Maintenance")}
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="maintenanceNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("horses:tack.maintenanceNotes", "Maintenance Notes")}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t(
                        "horses:tack.maintenanceNotesPlaceholder",
                        "Maintenance requirements...",
                      )}
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CollapsibleContent>
        </Collapsible>

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
