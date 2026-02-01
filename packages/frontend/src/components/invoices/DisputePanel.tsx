import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import { MessageSquareWarning, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys, cacheInvalidation } from "@/lib/queryClient";
import {
  getOrganizationDisputes,
  getDisputeDetail,
  createDispute,
  addDisputeMessage,
  reviewDispute,
  resolveDispute,
  rejectDispute,
} from "@/services/disputeService";
import { toDate } from "@/lib/utils";
import type {
  Dispute,
  DisputeMessage,
  DisputeResolutionType,
} from "@equiduty/shared";

import {
  DisputeDetailView,
  getStatusVariant,
} from "@/components/disputes/DisputeDetailView";
import {
  ResolveDialog,
  RejectDialog,
} from "@/components/disputes/DisputeResolutionDialog";

// ============================================================================
// Types
// ============================================================================

interface DisputePanelProps {
  organizationId: string;
  invoiceId: string;
  invoiceNumber: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
}

// ============================================================================
// Component
// ============================================================================

export function DisputePanel({
  organizationId,
  invoiceId,
  invoiceNumber,
  contactId,
  contactName,
  contactEmail,
}: DisputePanelProps) {
  const { t, i18n } = useTranslation(["disputes", "common"]);
  const { toast } = useToast();
  const locale = i18n.language === "sv" ? sv : enUS;

  // Create dispute dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Selected dispute detail state
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(
    null,
  );
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Resolution dialog state
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolutionType, setResolutionType] =
    useState<DisputeResolutionType>("explanation");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  // Reject dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Fetch disputes for this invoice
  const disputesQuery = useApiQuery<Dispute[]>(
    [...queryKeys.disputes.byOrganization(organizationId), { invoiceId }],
    () => getOrganizationDisputes(organizationId, { invoiceId }),
    {
      enabled: !!organizationId && !!invoiceId,
      staleTime: 5 * 60 * 1000,
    },
  );

  const invoiceDisputes = disputesQuery.data ?? [];

  // Detail query for selected dispute
  const detailQuery = useApiQuery<{
    dispute: Dispute;
    messages: DisputeMessage[];
  }>(
    queryKeys.disputes.detail(selectedDisputeId || ""),
    () => getDisputeDetail(organizationId, selectedDisputeId!),
    {
      enabled: !!selectedDisputeId,
    },
  );

  const selectedDispute = detailQuery.data?.dispute;
  const messages = detailQuery.data?.messages || [];

  // ========================================================================
  // Actions
  // ========================================================================

  const handleCreate = async () => {
    if (!subject.trim() || !description.trim()) return;
    setCreating(true);
    try {
      await createDispute(organizationId, {
        invoiceId,
        subject,
        description,
      });
      toast({ title: t("disputes:toast.created") });
      setCreateOpen(false);
      setSubject("");
      setDescription("");
      await cacheInvalidation.disputes.byOrganization(organizationId);
    } catch {
      toast({ title: t("common:errors.generic"), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleReview = async (dispute: Dispute) => {
    try {
      await reviewDispute(organizationId, dispute.id);
      toast({ title: t("disputes:toast.reviewStarted") });
      await cacheInvalidation.disputes.byOrganization(organizationId);
      if (selectedDisputeId === dispute.id) {
        await cacheInvalidation.disputes.detail(dispute.id);
      }
    } catch {
      toast({ title: t("common:errors.generic"), variant: "destructive" });
    }
  };

  const handleResolve = async () => {
    if (!selectedDispute || !resolutionNotes.trim()) return;
    setResolving(true);
    try {
      await resolveDispute(organizationId, selectedDispute.id, {
        resolutionType,
        resolutionNotes,
      });
      toast({ title: t("disputes:toast.resolved") });
      setResolveDialogOpen(false);
      setResolutionNotes("");
      await cacheInvalidation.disputes.byOrganization(organizationId);
      await cacheInvalidation.disputes.detail(selectedDispute.id);
    } catch {
      toast({ title: t("common:errors.generic"), variant: "destructive" });
    } finally {
      setResolving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDispute || !rejectReason.trim()) return;
    setRejecting(true);
    try {
      await rejectDispute(organizationId, selectedDispute.id, {
        reason: rejectReason,
      });
      toast({ title: t("disputes:toast.rejected") });
      setRejectDialogOpen(false);
      setRejectReason("");
      await cacheInvalidation.disputes.byOrganization(organizationId);
      await cacheInvalidation.disputes.detail(selectedDispute.id);
    } catch {
      toast({ title: t("common:errors.generic"), variant: "destructive" });
    } finally {
      setRejecting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedDispute || !messageText.trim()) return;
    setSendingMessage(true);
    try {
      await addDisputeMessage(organizationId, selectedDispute.id, {
        message: messageText,
      });
      toast({ title: t("disputes:toast.messageSent") });
      setMessageText("");
      await cacheInvalidation.disputes.detail(selectedDispute.id);
    } catch {
      toast({ title: t("common:errors.generic"), variant: "destructive" });
    } finally {
      setSendingMessage(false);
    }
  };

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{t("disputes:title")}</CardTitle>
            <CardDescription>{t("disputes:description")}</CardDescription>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                {t("disputes:create")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("disputes:createTitle")}</DialogTitle>
                <DialogDescription>
                  {invoiceNumber} &mdash; {contactName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="dispute-subject"
                    className="text-sm font-medium"
                  >
                    {t("disputes:subject")}
                  </label>
                  <Input
                    id="dispute-subject"
                    placeholder={t("disputes:subjectPlaceholder")}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="dispute-description"
                    className="text-sm font-medium"
                  >
                    {t("disputes:descriptionLabel")}
                  </label>
                  <Textarea
                    id="dispute-description"
                    placeholder={t("disputes:descriptionPlaceholder")}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  {t("common:buttons.cancel")}
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!subject.trim() || !description.trim() || creating}
                >
                  {creating ? t("common:labels.loading") : t("disputes:create")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {disputesQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : invoiceDisputes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <MessageSquareWarning className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t("disputes:table.noDisputes")}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {invoiceDisputes.map((dispute) => (
              <div
                key={dispute.id}
                className="flex cursor-pointer items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                onClick={() => setSelectedDisputeId(dispute.id)}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {dispute.subject}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(toDate(dispute.createdAt), "PP", { locale })}
                  </p>
                </div>
                <Badge variant={getStatusVariant(dispute.status)}>
                  {t(`disputes:status.${dispute.status}`)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Dispute Detail Dialog */}
      <Dialog
        open={!!selectedDisputeId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDisputeId(null);
            setMessageText("");
          }
        }}
      >
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DisputeDetailView
            dispute={selectedDispute}
            messages={messages}
            isLoading={detailQuery.isLoading}
            messageText={messageText}
            onMessageTextChange={setMessageText}
            sendingMessage={sendingMessage}
            onSendMessage={handleSendMessage}
            onReview={handleReview}
            onOpenResolve={() => setResolveDialogOpen(true)}
            onOpenReject={() => setRejectDialogOpen(true)}
          />
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <ResolveDialog
        open={resolveDialogOpen}
        onOpenChange={setResolveDialogOpen}
        resolutionType={resolutionType}
        onResolutionTypeChange={setResolutionType}
        resolutionNotes={resolutionNotes}
        onResolutionNotesChange={setResolutionNotes}
        onResolve={handleResolve}
        resolving={resolving}
      />

      {/* Reject Dialog */}
      <RejectDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        rejectReason={rejectReason}
        onRejectReasonChange={setRejectReason}
        onReject={handleReject}
        rejecting={rejecting}
      />
    </Card>
  );
}
