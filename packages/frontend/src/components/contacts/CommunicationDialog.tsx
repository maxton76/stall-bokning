/**
 * CommunicationDialog Component
 *
 * Dialog for creating or editing communication records.
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { authFetch } from "@/lib/authFetch";
import { toDate } from "@stall-bokning/shared";
import type {
  CommunicationRecord,
  CommunicationType,
  CommunicationDirection,
  CreateCommunicationInput,
  UpdateCommunicationInput,
} from "@stall-bokning/shared";
import {
  communicationTypeIcons,
  communicationTypesOrdered,
  hasSubjectField,
} from "@/config/communication";

// ============================================================================
// Types
// ============================================================================

interface CommunicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  contactId: string;
  contactName: string;
  communication?: CommunicationRecord;
  onSuccess?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function CommunicationDialog({
  open,
  onOpenChange,
  organizationId,
  contactId,
  contactName,
  communication,
  onSuccess,
}: CommunicationDialogProps) {
  const { t } = useTranslation(["communication", "common"]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [type, setType] = useState<CommunicationType>("note");
  const [direction, setDirection] =
    useState<CommunicationDirection>("outbound");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [summary, setSummary] = useState("");
  const [occurredAt, setOccurredAt] = useState("");

  const isEditing = !!communication;

  // Reset form when dialog opens/closes or communication changes
  useEffect(() => {
    if (open) {
      if (communication) {
        setType(communication.type);
        setDirection(communication.direction);
        setSubject(communication.subject || "");
        setContent(communication.content);
        setSummary(communication.summary || "");
        const date = toDate(communication.occurredAt);
        setOccurredAt(date.toISOString().slice(0, 16));
      } else {
        setType("note");
        setDirection("outbound");
        setSubject("");
        setContent("");
        setSummary("");
        setOccurredAt(new Date().toISOString().slice(0, 16));
      }
    }
  }, [open, communication]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (input: CreateCommunicationInput) => {
      const response = await authFetch(
        `/api/v1/organizations/${organizationId}/communications`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      if (!response.ok) {
        throw new Error("Failed to create communication");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("communication:messages.created"),
      });
      queryClient.invalidateQueries({
        queryKey: ["contact-communications", organizationId, contactId],
      });
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: t("communication:errors.createFailed"),
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (input: UpdateCommunicationInput) => {
      const response = await authFetch(
        `/api/v1/organizations/${organizationId}/communications/${communication!.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      if (!response.ok) {
        throw new Error("Failed to update communication");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("communication:messages.updated"),
      });
      queryClient.invalidateQueries({
        queryKey: ["contact-communications", organizationId, contactId],
      });
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: t("communication:errors.updateFailed"),
        variant: "destructive",
      });
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast({
        title: t("communication:errors.contentRequired"),
        variant: "destructive",
      });
      return;
    }

    if (isEditing) {
      updateMutation.mutate({
        subject: subject || undefined,
        content,
        summary: summary || undefined,
        occurredAt: occurredAt ? new Date(occurredAt) : undefined,
      });
    } else {
      createMutation.mutate({
        contactId,
        type,
        direction,
        subject: subject || undefined,
        content,
        summary: summary || undefined,
        occurredAt: occurredAt ? new Date(occurredAt) : undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing
                ? t("communication:editCommunication")
                : t("communication:newCommunication")}
            </DialogTitle>
            <DialogDescription>{contactName}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Communication Type */}
            {!isEditing && (
              <div className="space-y-2">
                <Label>{t("communication:fields.type")}</Label>
                <div className="grid grid-cols-4 gap-2">
                  {communicationTypesOrdered.slice(0, 4).map((value) => {
                    const Icon = communicationTypeIcons[value];
                    return (
                      <Button
                        key={value}
                        type="button"
                        variant={type === value ? "default" : "outline"}
                        className="h-auto flex-col py-3"
                        onClick={() => setType(value)}
                      >
                        <Icon className="mb-1 h-4 w-4" />
                        <span className="text-xs">
                          {t(`communication:types.${value}`)}
                        </span>
                      </Button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {communicationTypesOrdered.slice(4).map((value) => {
                    const Icon = communicationTypeIcons[value];
                    return (
                      <Button
                        key={value}
                        type="button"
                        variant={type === value ? "default" : "outline"}
                        className="h-auto flex-col py-3"
                        onClick={() => setType(value)}
                      >
                        <Icon className="mb-1 h-4 w-4" />
                        <span className="text-xs">
                          {t(`communication:types.${value}`)}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Direction */}
            {!isEditing && (
              <div className="space-y-2">
                <Label>{t("communication:fields.direction")}</Label>
                <RadioGroup
                  value={direction}
                  onValueChange={(v) =>
                    setDirection(v as CommunicationDirection)
                  }
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="outbound" id="outbound" />
                    <Label htmlFor="outbound" className="cursor-pointer">
                      {t("communication:direction.outbound")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="inbound" id="inbound" />
                    <Label htmlFor="inbound" className="cursor-pointer">
                      {t("communication:direction.inbound")}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Date/Time */}
            <div className="space-y-2">
              <Label htmlFor="occurredAt">
                {t("communication:fields.occurredAt")}
              </Label>
              <Input
                id="occurredAt"
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
              />
            </div>

            {/* Subject (optional, shown for email and meeting types) */}
            {hasSubjectField(type) && (
              <div className="space-y-2">
                <Label htmlFor="subject">
                  {t("communication:fields.subject")}
                </Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t("communication:placeholders.subject")}
                />
              </div>
            )}

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">
                {t("communication:fields.content")}
              </Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("communication:placeholders.content")}
                rows={4}
                required
              />
            </div>

            {/* Summary (optional) */}
            <div className="space-y-2">
              <Label htmlFor="summary">
                {t("communication:fields.summary")}
              </Label>
              <Input
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder={t("communication:placeholders.summary")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {t("common:cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("communication:actions.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
