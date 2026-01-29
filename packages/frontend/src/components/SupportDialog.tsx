/**
 * SupportDialog Component
 *
 * Dialog for creating support tickets via ZenDesk.
 * Only available for users with paid subscriptions.
 */

import { useMemo, useState, useEffect } from "react";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HelpCircle, ExternalLink, CheckCircle2 } from "lucide-react";

import { BaseFormDialog } from "@/components/BaseFormDialog";
import { useFormDialog } from "@/hooks/useFormDialog";
import { FormInput, FormTextarea, FormSelect } from "@/components/form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  checkSupportAccess,
  createSupportTicket,
} from "@/services/supportService";
import type { SupportTicketCategory } from "@stall-bokning/shared";

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SupportFormData = {
  subject: string;
  category: SupportTicketCategory;
  message: string;
};

export function SupportDialog({ open, onOpenChange }: SupportDialogProps) {
  const { t } = useTranslation(["support", "common"]);
  const queryClient = useQueryClient();
  const [successTicketId, setSuccessTicketId] = useState<number | null>(null);

  // Check if user has support access
  const { data: accessData, isLoading: isAccessLoading } = useQuery({
    queryKey: ["support-access"],
    queryFn: checkSupportAccess,
    enabled: open,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Category options
  const categoryOptions = useMemo(
    () => [
      { value: "booking", label: t("support:categories.booking") },
      { value: "billing", label: t("support:categories.billing") },
      { value: "technical", label: t("support:categories.technical") },
      { value: "other", label: t("support:categories.other") },
    ],
    [t],
  );

  // Form validation schema
  const supportSchema = useMemo(
    () =>
      z.object({
        subject: z
          .string()
          .min(1, t("support:validation.subjectRequired"))
          .min(5, t("support:validation.subjectMinLength")),
        category: z
          .enum(["booking", "billing", "technical", "other"])
          .refine((val) => !!val, {
            message: t("support:validation.categoryRequired"),
          }),
        message: z
          .string()
          .min(1, t("support:validation.messageRequired"))
          .min(20, t("support:validation.messageMinLength")),
      }),
    [t],
  );

  // Form setup
  const { form, handleSubmit, resetForm } = useFormDialog<SupportFormData>({
    schema: supportSchema,
    defaultValues: {
      subject: "",
      category: "other",
      message: "",
    },
    onSubmit: async (data) => {
      const result = await createSupportTicket(data);
      setSuccessTicketId(result.ticketId);
    },
    onSuccess: () => {
      // Don't close dialog - show success message instead
    },
    successMessage: t("support:success.title"),
    errorMessage: t("support:errors.submitFailed"),
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      resetForm();
      setSuccessTicketId(null);
    }
  }, [open, resetForm]);

  // Show loading state
  if (isAccessLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("support:title")}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show upgrade prompt for non-paying users
  if (!accessData?.hasAccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("support:upgrade.title")}</DialogTitle>
            <DialogDescription>
              {t("support:upgrade.message")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            <HelpCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-center text-muted-foreground mb-4">
              {t("support:upgrade.message")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common:buttons.cancel")}
            </Button>
            <Button asChild>
              <a href="/settings?tab=subscription">
                {t("support:upgrade.button")}
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Show success message after ticket creation
  if (successTicketId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              {t("support:success.title")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>{t("support:success.title")}</AlertTitle>
              <AlertDescription>
                {t("support:success.message", { ticketId: successTicketId })}
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>
              {t("common:buttons.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Show support form
  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("support:title")}
      description={t("support:description")}
      form={form}
      onSubmit={handleSubmit}
      submitLabel={t("support:buttons.submit")}
      cancelLabel={t("common:buttons.cancel")}
      maxWidth="sm:max-w-[550px]"
    >
      <FormInput
        name="subject"
        label={t("support:fields.subject")}
        form={form}
        placeholder={t("support:fields.subjectPlaceholder")}
      />

      <FormSelect
        name="category"
        label={t("support:fields.category")}
        form={form}
        options={categoryOptions}
        placeholder={t("support:fields.categoryPlaceholder")}
      />

      <FormTextarea
        name="message"
        label={t("support:fields.message")}
        form={form}
        placeholder={t("support:fields.messagePlaceholder")}
        rows={6}
      />
    </BaseFormDialog>
  );
}

/**
 * Support Button for Header
 *
 * A simple button that opens the support dialog.
 */
interface SupportButtonProps {
  variant?: "icon" | "text";
}

export function SupportButton({ variant = "icon" }: SupportButtonProps) {
  const { t } = useTranslation("support");
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      {variant === "icon" ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDialogOpen(true)}
          title={t("header.helpButton")}
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      ) : (
        <Button variant="ghost" onClick={() => setDialogOpen(true)}>
          <HelpCircle className="mr-2 h-4 w-4" />
          {t("header.helpButton")}
        </Button>
      )}

      <SupportDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}

export default SupportDialog;
