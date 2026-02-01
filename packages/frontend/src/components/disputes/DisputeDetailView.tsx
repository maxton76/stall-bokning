import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toDate } from "@/lib/utils";
import type { Dispute, DisputeMessage, DisputeStatus } from "@equiduty/shared";

// ============================================================================
// Shared helpers
// ============================================================================

export function getStatusVariant(
  status: DisputeStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "open":
      return "outline";
    case "under_review":
      return "secondary";
    case "resolved":
      return "default";
    case "rejected":
      return "destructive";
  }
}

// ============================================================================
// Props
// ============================================================================

interface DisputeDetailViewProps {
  dispute: Dispute | undefined;
  messages: DisputeMessage[];
  isLoading: boolean;
  messageText: string;
  onMessageTextChange: (text: string) => void;
  sendingMessage: boolean;
  onSendMessage: () => void;
  onReview: (dispute: Dispute) => void;
  onOpenResolve: () => void;
  onOpenReject: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function DisputeDetailView({
  dispute,
  messages,
  isLoading,
  messageText,
  onMessageTextChange,
  sendingMessage,
  onSendMessage,
  onReview,
  onOpenResolve,
  onOpenReject,
}: DisputeDetailViewProps) {
  const { t, i18n } = useTranslation(["disputes", "common"]);
  const locale = i18n.language === "sv" ? sv : enUS;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (!dispute) return null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{dispute.subject}</DialogTitle>
        <DialogDescription>
          {dispute.invoiceNumber} &mdash; {dispute.contactName}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-2">
          <Badge variant={getStatusVariant(dispute.status)}>
            {t(`disputes:status.${dispute.status}`)}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {format(toDate(dispute.createdAt), "PPp", { locale })}
          </span>
        </div>

        <p className="text-sm">{dispute.description}</p>

        {/* Resolution info */}
        {dispute.resolutionType && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {t("disputes:resolution.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-sm">
                <span className="font-medium">
                  {t("disputes:resolution.type")}:
                </span>{" "}
                {t(`disputes:resolution.types.${dispute.resolutionType}`)}
              </p>
              {dispute.resolutionNotes && (
                <p className="text-sm text-muted-foreground">
                  {dispute.resolutionNotes}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Admin actions */}
        {["open", "under_review"].includes(dispute.status) && (
          <div className="flex flex-wrap gap-2">
            {dispute.status === "open" && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onReview(dispute)}
              >
                {t("disputes:actions.review")}
              </Button>
            )}
            <Button size="sm" onClick={onOpenResolve}>
              {t("disputes:actions.resolve")}
            </Button>
            <Button variant="destructive" size="sm" onClick={onOpenReject}>
              {t("disputes:actions.reject")}
            </Button>
          </div>
        )}

        {/* Messages thread */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">
            {t("disputes:messages.title")}
          </h3>

          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("disputes:messages.noMessages")}
            </p>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className="rounded-lg border bg-muted/50 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {msg.authorName}
                    </span>
                    <Badge
                      variant={
                        msg.authorRole === "admin" ? "default" : "outline"
                      }
                      className="text-xs"
                    >
                      {msg.authorRole}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(toDate(msg.createdAt), "PPp", { locale })}
                    </span>
                  </div>
                  <p className="text-sm">{msg.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* Message input */}
          {["open", "under_review"].includes(dispute.status) && (
            <div className="flex gap-2">
              <Textarea
                placeholder={t("disputes:messages.placeholder")}
                value={messageText}
                onChange={(e) => onMessageTextChange(e.target.value)}
                className="min-h-[60px]"
              />
              <Button
                size="sm"
                onClick={onSendMessage}
                disabled={!messageText.trim() || sendingMessage}
              >
                {t("disputes:messages.send")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
