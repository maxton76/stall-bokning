import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Loader2, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TransportInstructions } from "@shared/types/transport";

interface TransportFormProps {
  defaultValues?: Partial<TransportInstructions>;
  onSubmit: (data: Partial<TransportInstructions>) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const formSchema = z.object({
  loadingBehavior: z
    .enum([
      "easy_loader",
      "needs_patience",
      "needs_handler",
      "difficult",
      "unknown",
    ])
    .optional(),
  loadingNotes: z.string().optional(),
  positionPreference: z
    .enum([
      "any",
      "front",
      "rear",
      "left",
      "right",
      "facing_forward",
      "facing_backward",
    ])
    .optional(),
  needsCompanion: z.boolean().optional(),
  preferredCompanion: z.string().optional(),
  travelAnxiety: z.boolean().optional(),
  travelAnxietyNotes: z.string().optional(),
  sedationRequired: z.boolean().optional(),
  sedationNotes: z.string().optional(),
  feedDuringTransport: z.boolean().optional(),
  feedingInstructions: z.string().optional(),
  hayNetRequired: z.boolean().optional(),
  waterInstructions: z.string().optional(),
  travelBoots: z.boolean().optional(),
  travelBlanket: z.boolean().optional(),
  headProtection: z.boolean().optional(),
  tailGuard: z.boolean().optional(),
  pollGuard: z.boolean().optional(),
  motionSickness: z.boolean().optional(),
  ventilationNeeds: z.string().optional(),
  temperaturePreference: z.enum(["cool", "warm", "normal"]).optional(),
  maxTravelTime: z.number().min(1).max(24).optional(),
  restBreakFrequency: z.number().min(1).max(12).optional(),
  unloadForRest: z.boolean().optional(),
  emergencyContacts: z
    .array(
      z.object({
        name: z.string().min(1, "Name is required"),
        phone: z.string().min(1, "Phone is required"),
        relationship: z.string().optional(),
        isPrimary: z.boolean().optional(),
      }),
    )
    .optional(),
  transportInsurance: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function TransportForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: TransportFormProps) {
  const { t, i18n } = useTranslation(["horses", "common"]);
  const [isHealthOpen, setIsHealthOpen] = useState(false);
  const [isEquipmentOpen, setIsEquipmentOpen] = useState(false);
  const [isRestOpen, setIsRestOpen] = useState(false);
  const [isInsuranceOpen, setIsInsuranceOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      loadingBehavior: defaultValues?.loadingBehavior,
      loadingNotes: defaultValues?.loadingNotes || "",
      positionPreference: defaultValues?.positionPreference || "any",
      needsCompanion: defaultValues?.needsCompanion || false,
      preferredCompanion: defaultValues?.preferredCompanion || "",
      travelAnxiety: defaultValues?.travelAnxiety || false,
      travelAnxietyNotes: defaultValues?.travelAnxietyNotes || "",
      sedationRequired: defaultValues?.sedationRequired || false,
      sedationNotes: defaultValues?.sedationNotes || "",
      feedDuringTransport: defaultValues?.feedDuringTransport || false,
      feedingInstructions: defaultValues?.feedingInstructions || "",
      hayNetRequired: defaultValues?.hayNetRequired || false,
      waterInstructions: defaultValues?.waterInstructions || "",
      travelBoots: defaultValues?.travelBoots || false,
      travelBlanket: defaultValues?.travelBlanket || false,
      headProtection: defaultValues?.headProtection || false,
      tailGuard: defaultValues?.tailGuard || false,
      pollGuard: defaultValues?.pollGuard || false,
      motionSickness: defaultValues?.motionSickness || false,
      ventilationNeeds: defaultValues?.ventilationNeeds || "",
      temperaturePreference: defaultValues?.temperaturePreference || "normal",
      maxTravelTime: defaultValues?.maxTravelTime,
      restBreakFrequency: defaultValues?.restBreakFrequency,
      unloadForRest: defaultValues?.unloadForRest || false,
      emergencyContacts: defaultValues?.emergencyContacts || [],
      transportInsurance: defaultValues?.transportInsurance || "",
      insuranceProvider: defaultValues?.insuranceProvider || "",
      insurancePolicyNumber: defaultValues?.insurancePolicyNumber || "",
      notes: defaultValues?.notes || "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "emergencyContacts",
  });

  const handleSubmit = (data: FormValues) => {
    onSubmit(data);
  };

  const loadingBehaviorOptions = [
    {
      value: "easy_loader",
      label: i18n.language === "sv" ? "Går på lätt" : "Easy Loader",
    },
    {
      value: "needs_patience",
      label: i18n.language === "sv" ? "Behöver tålamod" : "Needs Patience",
    },
    {
      value: "needs_handler",
      label: i18n.language === "sv" ? "Behöver hjälp" : "Needs Handler",
    },
    {
      value: "difficult",
      label: i18n.language === "sv" ? "Svår" : "Difficult",
    },
    { value: "unknown", label: i18n.language === "sv" ? "Okänd" : "Unknown" },
  ];

  const positionOptions = [
    {
      value: "any",
      label: i18n.language === "sv" ? "Ingen preferens" : "Any Position",
    },
    { value: "front", label: i18n.language === "sv" ? "Fram" : "Front" },
    { value: "rear", label: i18n.language === "sv" ? "Bak" : "Rear" },
    { value: "left", label: i18n.language === "sv" ? "Vänster" : "Left" },
    { value: "right", label: i18n.language === "sv" ? "Höger" : "Right" },
    {
      value: "facing_forward",
      label: i18n.language === "sv" ? "Framåtvänd" : "Facing Forward",
    },
    {
      value: "facing_backward",
      label: i18n.language === "sv" ? "Bakåtvänd" : "Facing Backward",
    },
  ];

  const temperatureOptions = [
    { value: "normal", label: i18n.language === "sv" ? "Normal" : "Normal" },
    { value: "cool", label: i18n.language === "sv" ? "Sval" : "Cool" },
    { value: "warm", label: i18n.language === "sv" ? "Varm" : "Warm" },
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Loading Behavior Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">
            {t("horses:transport.loadingBehaviorSection", "Loading Behavior")}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="loadingBehavior"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("horses:transport.loadingBehavior", "Loading Behavior")}
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            "horses:transport.selectBehavior",
                            "Select behavior",
                          )}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loadingBehaviorOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
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
              name="positionPreference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t(
                      "horses:transport.positionPreference",
                      "Position Preference",
                    )}
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {positionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
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
            name="loadingNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("horses:transport.loadingNotes", "Loading Notes")}
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder={t(
                      "horses:transport.loadingNotesPlaceholder",
                      "Tips for loading this horse...",
                    )}
                    rows={2}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Companion */}
          <div className="flex items-start gap-4">
            <FormField
              control={form.control}
              name="needsCompanion"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    {t("horses:transport.needsCompanion", "Needs Companion")}
                  </FormLabel>
                </FormItem>
              )}
            />

            {form.watch("needsCompanion") && (
              <FormField
                control={form.control}
                name="preferredCompanion"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t(
                          "horses:transport.preferredCompanionPlaceholder",
                          "Preferred companion name",
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>

        {/* Health & Behavior Section */}
        <Collapsible open={isHealthOpen} onOpenChange={setIsHealthOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              {t("horses:transport.healthBehavior", "Health & Behavior")}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isHealthOpen ? "rotate-180" : ""}`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sedationRequired"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal text-destructive">
                      {t(
                        "horses:transport.sedationRequired",
                        "Sedation Required",
                      )}
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="travelAnxiety"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      {t("horses:transport.travelAnxiety", "Travel Anxiety")}
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="motionSickness"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      {t("horses:transport.motionSickness", "Motion Sickness")}
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="temperaturePreference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("horses:transport.temperature", "Temperature")}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {temperatureOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {form.watch("sedationRequired") && (
              <FormField
                control={form.control}
                name="sedationNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("horses:transport.sedationNotes", "Sedation Notes")}
                    </FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {form.watch("travelAnxiety") && (
              <FormField
                control={form.control}
                name="travelAnxietyNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("horses:transport.anxietyNotes", "Anxiety Notes")}
                    </FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Equipment Section */}
        <Collapsible open={isEquipmentOpen} onOpenChange={setIsEquipmentOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              {t("horses:transport.equipment", "Equipment")}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isEquipmentOpen ? "rotate-180" : ""}`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="travelBoots"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      {t("horses:transport.travelBoots", "Travel Boots")}
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="travelBlanket"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      {t("horses:transport.travelBlanket", "Travel Blanket")}
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="headProtection"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      {t("horses:transport.headProtection", "Head Protection")}
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tailGuard"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      {t("horses:transport.tailGuard", "Tail Guard")}
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pollGuard"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      {t("horses:transport.pollGuard", "Poll Guard")}
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hayNetRequired"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      {t("horses:transport.hayNet", "Hay Net")}
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Rest Requirements Section */}
        <Collapsible open={isRestOpen} onOpenChange={setIsRestOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              {t("horses:transport.restRequirements", "Rest Requirements")}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isRestOpen ? "rotate-180" : ""}`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="maxTravelTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t(
                        "horses:transport.maxTravelTime",
                        "Max Travel Time (hours)",
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={24}
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : undefined,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="restBreakFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t(
                        "horses:transport.restBreakFrequency",
                        "Rest Break Every (hours)",
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={12}
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : undefined,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="unloadForRest"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    {t(
                      "horses:transport.unloadForRest",
                      "Must unload for rest breaks",
                    )}
                  </FormLabel>
                </FormItem>
              )}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Emergency Contacts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">
              {t("horses:transport.emergencyContacts", "Emergency Contacts")}
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  name: "",
                  phone: "",
                  relationship: "",
                  isPrimary: false,
                })
              }
            >
              <Plus className="h-4 w-4 mr-1" />
              {t("common:buttons.add", "Add")}
            </Button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start">
              <div className="flex-1 grid grid-cols-3 gap-2">
                <FormField
                  control={form.control}
                  name={`emergencyContacts.${index}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t(
                            "horses:transport.contactName",
                            "Name",
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`emergencyContacts.${index}.phone`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t(
                            "horses:transport.contactPhone",
                            "Phone",
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`emergencyContacts.${index}.relationship`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t(
                            "horses:transport.contactRelationship",
                            "Role (e.g., Owner)",
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name={`emergencyContacts.${index}.isPrimary`}
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0 pt-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-xs font-normal">
                      {t("horses:transport.primary", "Primary")}
                    </FormLabel>
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        {/* Insurance Section */}
        <Collapsible open={isInsuranceOpen} onOpenChange={setIsInsuranceOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              {t("horses:transport.insurance", "Insurance")}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isInsuranceOpen ? "rotate-180" : ""}`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="insuranceProvider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t(
                        "horses:transport.insuranceProvider",
                        "Insurance Provider",
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="insurancePolicyNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("horses:transport.policyNumber", "Policy Number")}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* General Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("horses:transport.notes", "Additional Notes")}
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={t(
                    "horses:transport.notesPlaceholder",
                    "Any other important transport information...",
                  )}
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Form Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("common:buttons.cancel", "Cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("common:buttons.save", "Save")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
