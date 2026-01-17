import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays } from "date-fns";
import { Plus, Trash2, CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAsyncData } from "@/hooks/useAsyncData";
import { createInvoice, formatCurrency } from "@/services/invoiceService";
import { getOrganizationContacts } from "@/services/contactService";
import type { Contact, InvoiceItemType } from "@stall-bokning/shared";
import { cn } from "@/lib/utils";

const ITEM_TYPES: InvoiceItemType[] = [
  "boarding",
  "feed",
  "bedding",
  "service",
  "lesson",
  "veterinary",
  "farrier",
  "transport",
  "equipment",
  "other",
];

const VAT_RATES = [0, 6, 12, 25];

const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  itemType: z.string(),
  quantity: z.number().min(0.01),
  unit: z.string().optional(),
  unitPrice: z.number().min(0),
  vatRate: z.number(),
  discount: z.number().min(0).max(100).optional(),
});

const createInvoiceSchema = z.object({
  contactId: z.string().min(1, "Contact is required"),
  issueDate: z.date(),
  dueDate: z.date(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
  customerNotes: z.string().optional(),
  internalNotes: z.string().optional(),
});

type CreateInvoiceFormData = z.infer<typeof createInvoiceSchema>;

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess: () => void;
}

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  organizationId,
  onSuccess,
}: CreateInvoiceDialogProps) {
  const { t } = useTranslation(["invoices", "common"]);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contacts = useAsyncData<Contact[]>({
    loadFn: async () => {
      return getOrganizationContacts(organizationId);
    },
  });

  useEffect(() => {
    if (open) {
      contacts.load();
    }
  }, [open, organizationId]);

  const form = useForm<CreateInvoiceFormData>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      contactId: "",
      issueDate: new Date(),
      dueDate: addDays(new Date(), 30),
      items: [
        {
          description: "",
          itemType: "boarding",
          quantity: 1,
          unit: "month",
          unitPrice: 0,
          vatRate: 25,
        },
      ],
      customerNotes: "",
      internalNotes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch("items");

  // Calculate totals
  const totals = watchedItems.reduce(
    (acc, item) => {
      const lineSubtotal = item.quantity * item.unitPrice;
      const discountAmount = item.discount
        ? lineSubtotal * (item.discount / 100)
        : 0;
      const lineTotal = lineSubtotal - discountAmount;
      const vatAmount = lineTotal * (item.vatRate / 100);

      acc.subtotal += lineTotal;
      acc.totalVat += vatAmount;
      acc.total += lineTotal + vatAmount;
      return acc;
    },
    { subtotal: 0, totalVat: 0, total: 0 },
  );

  const onSubmit = async (data: CreateInvoiceFormData) => {
    setIsSubmitting(true);
    try {
      await createInvoice(organizationId, {
        contactId: data.contactId,
        issueDate: data.issueDate.toISOString(),
        dueDate: data.dueDate.toISOString(),
        items: data.items.map((item) => ({
          description: item.description,
          itemType: item.itemType as InvoiceItemType,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
          discount: item.discount,
        })),
        customerNotes: data.customerNotes || undefined,
        internalNotes: data.internalNotes || undefined,
        status: "draft",
      });

      toast({ title: t("invoices:messages.createSuccess") });
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch {
      toast({
        title: t("invoices:errors.createFailed"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{t("invoices:dialogs.create.title")}</DialogTitle>
          <DialogDescription>
            {t("invoices:dialogs.create.description")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Contact and Dates */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactId">
                  {t("invoices:fields.contact")} *
                </Label>
                <Select
                  value={form.watch("contactId")}
                  onValueChange={(value) => form.setValue("contactId", value)}
                  disabled={contacts.isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("common:labels.select")} />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.data?.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.contactType === "Business"
                          ? contact.businessName
                          : `${contact.firstName} ${contact.lastName}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.contactId && (
                  <p className="text-sm text-red-500">
                    {t("invoices:errors.contactRequired")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>{t("invoices:fields.issueDate")} *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.watch("issueDate") && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch("issueDate")
                        ? format(form.watch("issueDate"), "PP")
                        : t("common:labels.select")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={form.watch("issueDate")}
                      onSelect={(date) =>
                        date && form.setValue("issueDate", date)
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>{t("invoices:fields.dueDate")} *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.watch("dueDate") && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch("dueDate")
                        ? format(form.watch("dueDate"), "PP")
                        : t("common:labels.select")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={form.watch("dueDate")}
                      onSelect={(date) =>
                        date && form.setValue("dueDate", date)
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>{t("invoices:fields.items")} *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      description: "",
                      itemType: "other",
                      quantity: 1,
                      unit: "",
                      unitPrice: 0,
                      vatRate: 25,
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t("invoices:addItem")}
                </Button>
              </div>

              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-12 gap-2 items-end border-b pb-4"
                >
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">{t("invoices:item.type")}</Label>
                    <Select
                      value={form.watch(`items.${index}.itemType`)}
                      onValueChange={(value) =>
                        form.setValue(`items.${index}.itemType`, value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ITEM_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {t(`invoices:itemTypes.${type}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">
                      {t("invoices:item.description")}
                    </Label>
                    <Input
                      {...form.register(`items.${index}.description`)}
                      placeholder={t("invoices:item.description")}
                    />
                  </div>

                  <div className="col-span-1 space-y-1">
                    <Label className="text-xs">
                      {t("invoices:item.quantity")}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...form.register(`items.${index}.quantity`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">
                      {t("invoices:item.unitPrice")}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...form.register(`items.${index}.unitPrice`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">
                      {t("invoices:item.vatRate")}
                    </Label>
                    <Select
                      value={form.watch(`items.${index}.vatRate`)?.toString()}
                      onValueChange={(value) =>
                        form.setValue(`items.${index}.vatRate`, parseInt(value))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VAT_RATES.map((rate) => (
                          <SelectItem key={rate} value={rate.toString()}>
                            {rate}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
              {form.formState.errors.items && (
                <p className="text-sm text-red-500">
                  {t("invoices:errors.itemsRequired")}
                </p>
              )}
            </div>

            {/* Totals */}
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex justify-between">
                <span>{t("invoices:fields.subtotal")}</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("invoices:fields.vat")}</span>
                <span>{formatCurrency(totals.totalVat)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>{t("invoices:fields.total")}</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>

            {/* Notes */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerNotes">
                  {t("invoices:fields.customerNotes")}
                </Label>
                <Textarea
                  id="customerNotes"
                  {...form.register("customerNotes")}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="internalNotes">
                  {t("invoices:fields.internalNotes")}
                </Label>
                <Textarea
                  id="internalNotes"
                  {...form.register("internalNotes")}
                  rows={3}
                />
              </div>
            </div>
          </form>
        </ScrollArea>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("common:actions.cancel")}
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting
              ? t("common:actions.saving")
              : t("common:actions.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
