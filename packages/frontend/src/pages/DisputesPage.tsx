import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import { MessageSquareWarning, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys, cacheInvalidation } from "@/lib/queryClient";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  getOrganizationDisputes,
  getDisputeDetail,
  reviewDispute,
  resolveDispute,
  rejectDispute,
  addDisputeMessage,
} from "@/services/disputeService";
import { toDate } from "@/lib/utils";
import type {
  Dispute,
  DisputeStatus,
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
// Constants
// ============================================================================

const STATUS_OPTIONS: DisputeStatus[] = [
  "open",
  "under_review",
  "resolved",
  "rejected",
];

// ============================================================================
// Page Component
// ============================================================================

export default function DisputesPage() {
  const { t, i18n } = useTranslation(["disputes", "common"]);
  const { toast } = useToast();
  const { selectedOrganization } = useOrganization();
  const locale = i18n.language === "sv" ? sv : enUS;

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DisputeStatus | "all">(
    "all",
  );
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(
    null,
  );

  // Data
  const disputesQuery = useApiQuery<Dispute[]>(
    queryKeys.disputes.byOrganization(
      selectedOrganization || "",
      statusFilter !== "all" ? { status: statusFilter } : undefined,
    ),
    () =>
      getOrganizationDisputes(
        selectedOrganization!,
        statusFilter !== "all" ? { status: statusFilter } : undefined,
      ),
    {
      enabled: !!selectedOrganization,
      staleTime: 5 * 60 * 1000,
    },
  );
  const disputesData = disputesQuery.data;
  const disputesLoading = disputesQuery.isLoading;

  // Detail query
  const detailQuery = useApiQuery<{
    dispute: Dispute;
    messages: DisputeMessage[];
  }>(
    queryKeys.disputes.detail(selectedDisputeId || ""),
    () => getDisputeDetail(selectedOrganization!, selectedDisputeId!),
    {
      enabled: !!selectedOrganization && !!selectedDisputeId,
    },
  );

  // Filtered disputes
  const filteredDisputes = useMemo(() => {
    if (!disputesData) return [];
    if (!searchQuery) return disputesData;

    const query = searchQuery.toLowerCase();
    return disputesData.filter(
      (dispute) =>
        dispute.subject.toLowerCase().includes(query) ||
        dispute.invoiceNumber.toLowerCase().includes(query) ||
        dispute.contactName.toLowerCase().includes(query),
    );
  }, [disputesData, searchQuery]);

  // Detail dialog state
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

  const selectedDispute = detailQuery.data?.dispute;
  const messages = detailQuery.data?.messages || [];

  // Actions
  const handleReview = async (dispute: Dispute) => {
    try {
      await reviewDispute(selectedOrganization!, dispute.id);
      toast({ title: t("disputes:toast.reviewStarted") });
      await cacheInvalidation.disputes.byOrganization(selectedOrganization!);
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
      await resolveDispute(selectedOrganization!, selectedDispute.id, {
        resolutionType,
        resolutionNotes,
      });
      toast({ title: t("disputes:toast.resolved") });
      setResolveDialogOpen(false);
      setResolutionNotes("");
      await cacheInvalidation.disputes.byOrganization(selectedOrganization!);
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
      await rejectDispute(selectedOrganization!, selectedDispute.id, {
        reason: rejectReason,
      });
      toast({ title: t("disputes:toast.rejected") });
      setRejectDialogOpen(false);
      setRejectReason("");
      await cacheInvalidation.disputes.byOrganization(selectedOrganization!);
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
      await addDisputeMessage(selectedOrganization!, selectedDispute.id, {
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

  if (!selectedOrganization) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">
              {t("common:labels.selectStable")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("disputes:title")}</h1>
        <p className="text-muted-foreground">{t("disputes:description")}</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common:search.placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value as DisputeStatus | "all")
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("disputes:filters.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("disputes:filters.allStatuses")}
            </SelectItem>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`disputes:status.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Disputes Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("disputes:table.subject")}</TableHead>
                <TableHead>{t("disputes:table.invoice")}</TableHead>
                <TableHead>{t("disputes:table.contact")}</TableHead>
                <TableHead>{t("disputes:table.status")}</TableHead>
                <TableHead>{t("disputes:table.created")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disputesLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredDisputes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <MessageSquareWarning className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {searchQuery
                          ? t("common:messages.noResults")
                          : t("disputes:table.noDisputes")}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDisputes.map((dispute) => (
                  <TableRow
                    key={dispute.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedDisputeId(dispute.id)}
                  >
                    <TableCell className="font-medium">
                      {dispute.subject}
                    </TableCell>
                    <TableCell>{dispute.invoiceNumber}</TableCell>
                    <TableCell>{dispute.contactName}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(dispute.status)}>
                        {t(`disputes:status.${dispute.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(toDate(dispute.createdAt), "PP", { locale })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
    </div>
  );
}
