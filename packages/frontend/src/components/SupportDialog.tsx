/**
 * SupportDialog Component
 *
 * Multi-view dialog for support ticket management via ZenDesk.
 * Views: ticket list, create ticket, ticket conversation.
 * Only available for users with paid subscriptions.
 */

import { useMemo, useState, useEffect, useRef } from "react";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  HelpCircle,
  ExternalLink,
  CheckCircle2,
  ArrowLeft,
  Send,
  MessageSquare,
  Plus,
  Loader2,
  Info,
  Lock,
  RotateCcw,
} from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  checkSupportAccess,
  createSupportTicket,
  listSupportTickets,
  getTicketConversation,
  replyToTicket,
  updateTicketStatus,
} from "@/services/supportService";
import type {
  SupportTicketCategory,
  SupportTicketStatus,
  SupportTicketComment,
} from "@equiduty/shared";

// =============================================================================
// Types
// =============================================================================

type SupportView =
  | { type: "list" }
  | { type: "create" }
  | { type: "conversation"; ticketId: number };

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTicketId?: number;
}

type SupportFormData = {
  subject: string;
  category: SupportTicketCategory;
  message: string;
};

// =============================================================================
// Status Badge Helper
// =============================================================================

function StatusBadge({ status }: { status: SupportTicketStatus }) {
  const { t } = useTranslation("support");

  const variantMap: Record<
    SupportTicketStatus,
    "default" | "secondary" | "outline" | "destructive"
  > = {
    new: "default",
    open: "default",
    pending: "secondary",
    hold: "secondary",
    solved: "outline",
    closed: "outline",
  };

  return (
    <Badge variant={variantMap[status] || "outline"}>
      {t(`status.${status}`)}
    </Badge>
  );
}

// =============================================================================
// Ticket List View
// =============================================================================

function TicketListView({
  onSelectTicket,
  onCreateNew,
}: {
  onSelectTicket: (ticketId: number) => void;
  onCreateNew: () => void;
}) {
  const { t } = useTranslation(["support", "common"]);

  const { data, isLoading } = useQuery({
    queryKey: ["support-tickets"],
    queryFn: listSupportTickets,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tickets = data?.tickets || [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <DialogTitle>{t("support:ticketList.title")}</DialogTitle>
        <Button size="sm" onClick={onCreateNew}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t("support:ticketList.newTicket")}
        </Button>
      </div>

      {tickets.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">
            {t("support:ticketList.empty")}
          </p>
          <Button onClick={onCreateNew}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("support:ticketList.newTicket")}
          </Button>
        </div>
      ) : (
        <ScrollArea className="max-h-[400px]">
          <div className="flex flex-col gap-2">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => onSelectTicket(ticket.id)}
                className="flex items-center justify-between rounded-lg border p-3 text-left hover:bg-accent transition-colors"
              >
                <div className="flex-1 min-w-0 mr-3">
                  <p className="font-medium truncate">{ticket.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("support:ticketList.updated")}{" "}
                    {new Date(ticket.updatedAt).toLocaleString(undefined, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <StatusBadge status={ticket.status} />
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// =============================================================================
// Conversation View
// =============================================================================

function ConversationView({
  ticketId,
  onBack,
}: {
  ticketId: number;
  onBack: () => void;
}) {
  const { t } = useTranslation(["support", "common"]);
  const queryClient = useQueryClient();
  const [replyText, setReplyText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    data: conversation,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["ticket-conversation", ticketId],
    queryFn: () => getTicketConversation(ticketId),
  });

  const replyMutation = useMutation({
    mutationFn: (message: string) => replyToTicket(ticketId, { message }),
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({
        queryKey: ["ticket-conversation", ticketId],
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: "solved" | "open") =>
      updateTicketStatus(ticketId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ticket-conversation", ticketId],
      });
      queryClient.invalidateQueries({
        queryKey: ["support-tickets"],
      });
    },
  });

  // Scroll to bottom when comments load or new reply is added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.comments]);

  const isClosed = conversation?.status === "closed";
  const isSolved = conversation?.status === "solved";
  const isPending = conversation?.status === "pending";
  const canClose = ["new", "open", "pending"].includes(
    conversation?.status || "",
  );
  const canReopen = isSolved;
  const canSend = replyText.trim().length >= 10 && !replyMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !conversation) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <DialogTitle>{t("support:errors.conversationFailed")}</DialogTitle>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <DialogTitle className="truncate text-base">
            {conversation.subject}
          </DialogTitle>
        </div>
        <StatusBadge status={conversation.status} />
      </div>

      {/* Status actions */}
      {(canClose || canReopen) && (
        <div className="flex items-center gap-2">
          {canClose && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={statusMutation.isPending}
                >
                  {statusMutation.isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Lock className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {t("support:actions.closeTicket")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("support:actions.closeTicket")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("support:actions.confirmClose")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {t("common:buttons.cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => statusMutation.mutate("solved")}
                  >
                    {t("support:actions.closeTicket")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {canReopen && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={statusMutation.isPending}
                >
                  {statusMutation.isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {t("support:actions.reopenTicket")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("support:actions.reopenTicket")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("support:actions.confirmReopen")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {t("common:buttons.cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => statusMutation.mutate("open")}
                  >
                    {t("support:actions.reopenTicket")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {statusMutation.isError && (
            <p className="text-sm text-destructive">
              {t("support:actions.statusChangeFailed")}
            </p>
          )}
          {statusMutation.isSuccess && (
            <p className="text-sm text-green-600">
              {statusMutation.variables === "solved"
                ? t("support:actions.closeSuccess")
                : t("support:actions.reopenSuccess")}
            </p>
          )}
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex flex-col gap-3 max-h-[350px] overflow-y-auto px-1"
      >
        {conversation.comments.map((comment) => (
          <CommentBubble key={comment.id} comment={comment} />
        ))}
      </div>

      {/* Reply form or closed notice */}
      {isClosed ? (
        <Alert>
          <AlertDescription>
            {t("support:conversation.ticketClosed")}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="flex flex-col gap-2">
          {isPending && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              {t("support:actions.pendingReplyHint")}
            </p>
          )}
          {replyMutation.isError && (
            <p className="text-sm text-destructive">
              {t("support:errors.replyFailed")}
            </p>
          )}
          {replyMutation.isSuccess && (
            <p className="text-sm text-green-600">
              {t("support:conversation.replySuccess")}
            </p>
          )}
          <div className="flex gap-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={t("support:conversation.replyPlaceholder")}
              rows={3}
              className="flex-1 resize-none"
            />
            <Button
              size="icon"
              disabled={!canSend}
              onClick={() => replyMutation.mutate(replyText.trim())}
              className="self-end"
            >
              {replyMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          {replyText.length > 0 && replyText.trim().length < 10 && (
            <p className="text-xs text-muted-foreground">
              {t("support:validation.replyMinLength")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CommentBubble({ comment }: { comment: SupportTicketComment }) {
  const { t } = useTranslation("support");

  const isAgent = comment.isStaff;

  return (
    <div
      className={`flex flex-col gap-1 max-w-[80%] ${
        isAgent ? "self-start items-start" : "self-end items-end"
      }`}
    >
      <div
        className={`rounded-2xl px-4 py-2.5 text-sm ${
          isAgent
            ? "bg-muted text-foreground rounded-bl-sm"
            : "bg-primary text-primary-foreground rounded-br-sm"
        }`}
      >
        {isAgent && (
          <p className="text-xs font-semibold mb-1 opacity-80">
            {comment.authorName}
          </p>
        )}
        <p className="whitespace-pre-wrap">{comment.body}</p>
      </div>
      <span className="text-[11px] text-muted-foreground px-1">
        {new Date(comment.createdAt).toLocaleString(undefined, {
          dateStyle: "short",
          timeStyle: "short",
        })}
      </span>
    </div>
  );
}

// =============================================================================
// Create Ticket View (extracted from original form)
// =============================================================================

function CreateTicketView({
  onBack,
  onSuccess,
}: {
  onBack: () => void;
  onSuccess: (ticketId: number) => void;
}) {
  const { t } = useTranslation(["support", "common"]);

  const categoryOptions = useMemo(
    () => [
      { value: "booking", label: t("support:categories.booking") },
      { value: "billing", label: t("support:categories.billing") },
      { value: "technical", label: t("support:categories.technical") },
      { value: "other", label: t("support:categories.other") },
    ],
    [t],
  );

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

  const { form, handleSubmit } = useFormDialog<SupportFormData>({
    schema: supportSchema,
    defaultValues: {
      subject: "",
      category: "other",
      message: "",
    },
    onSubmit: async (data) => {
      const result = await createSupportTicket(data);
      onSuccess(result.ticketId);
    },
    successMessage: t("support:success.title"),
    errorMessage: t("support:errors.submitFailed"),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <DialogTitle>{t("support:title")}</DialogTitle>
      </div>
      <DialogDescription>{t("support:description")}</DialogDescription>

      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-4"
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

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onBack}>
            {t("common:buttons.cancel")}
          </Button>
          <Button type="submit">{t("support:buttons.submit")}</Button>
        </div>
      </form>
    </div>
  );
}

// =============================================================================
// Main SupportDialog
// =============================================================================

export function SupportDialog({
  open,
  onOpenChange,
  initialTicketId,
}: SupportDialogProps) {
  const { t } = useTranslation(["support", "common"]);
  const queryClient = useQueryClient();

  const [view, setView] = useState<SupportView>(
    initialTicketId
      ? { type: "conversation", ticketId: initialTicketId }
      : { type: "list" },
  );
  const [successTicketId, setSuccessTicketId] = useState<number | null>(null);

  // Check if user has support access
  const { data: accessData, isLoading: isAccessLoading } = useQuery({
    queryKey: ["support-access"],
    queryFn: checkSupportAccess,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  // Reset view when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSuccessTicketId(null);
      setView(
        initialTicketId
          ? { type: "conversation", ticketId: initialTicketId }
          : { type: "list" },
      );
    }
  }, [open, initialTicketId]);

  // Determine dialog width based on view
  const maxWidth =
    view.type === "conversation" ? "sm:max-w-[650px]" : "sm:max-w-[550px]";

  // Show loading state
  if (isAccessLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("support:ticketList.title")}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
            <Button
              variant="outline"
              onClick={() => {
                setSuccessTicketId(null);
                setView({ type: "list" });
                queryClient.invalidateQueries({
                  queryKey: ["support-tickets"],
                });
              }}
            >
              {t("support:conversation.back")}
            </Button>
            <Button onClick={() => onOpenChange(false)}>
              {t("common:buttons.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Main multi-view dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={maxWidth}>
        {view.type === "list" && (
          <TicketListView
            onSelectTicket={(id) =>
              setView({ type: "conversation", ticketId: id })
            }
            onCreateNew={() => setView({ type: "create" })}
          />
        )}

        {view.type === "create" && (
          <CreateTicketView
            onBack={() => setView({ type: "list" })}
            onSuccess={(ticketId) => setSuccessTicketId(ticketId)}
          />
        )}

        {view.type === "conversation" && (
          <ConversationView
            ticketId={view.ticketId}
            onBack={() => {
              setView({ type: "list" });
              queryClient.invalidateQueries({
                queryKey: ["support-tickets"],
              });
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Support Button for Header
// =============================================================================

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
