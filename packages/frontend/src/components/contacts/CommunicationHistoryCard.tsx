/**
 * CommunicationHistoryCard Component
 *
 * Displays communication history for a contact with ability to add new records.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
} from "lucide-react";
import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  type Locale,
} from "date-fns";
import { sv, enUS } from "date-fns/locale";
import { authFetch } from "@/lib/authFetch";
import { toDate } from "@equiduty/shared";
import type {
  CommunicationRecord,
  CommunicationType,
  CommunicationDirection,
} from "@equiduty/shared";
import {
  getCommunicationIcon,
  getCommunicationColor,
} from "@/config/communication";
import { CommunicationDialog } from "./CommunicationDialog";

// ============================================================================
// Types
// ============================================================================

interface CommunicationHistoryCardProps {
  organizationId: string;
  contactId: string;
  contactName: string;
  maxItems?: number;
  onViewAll?: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatOccurredAt(date: Date, locale: Locale): string {
  if (isToday(date)) {
    return formatDistanceToNow(date, { addSuffix: true, locale });
  }
  if (isYesterday(date)) {
    return `Yesterday at ${format(date, "HH:mm")}`;
  }
  return format(date, "d MMM yyyy, HH:mm", { locale });
}

// ============================================================================
// Component
// ============================================================================

export function CommunicationHistoryCard({
  organizationId,
  contactId,
  contactName,
  maxItems = 5,
  onViewAll,
}: CommunicationHistoryCardProps) {
  const { t, i18n } = useTranslation(["communication", "common"]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const locale = i18n.language === "sv" ? sv : enUS;

  // Fetch communications
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["contact-communications", organizationId, contactId],
    queryFn: async () => {
      const response = await authFetch(
        `/api/v1/organizations/${organizationId}/contacts/${contactId}/communications?limit=${maxItems + 1}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch communications");
      }
      return response.json() as Promise<{ items: CommunicationRecord[] }>;
    },
  });

  const communications = data?.items || [];
  const hasMore = communications.length > maxItems;
  const displayItems = communications.slice(0, maxItems);

  const handleCommunicationCreated = () => {
    setDialogOpen(false);
    refetch();
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-lg">
              {t("communication:history")}
            </CardTitle>
            <CardDescription>
              {communications.length > 0
                ? t("common:items", { count: communications.length })
                : t("communication:empty")}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("communication:actions.create")}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayItems.length === 0 ? (
            <div className="py-8 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                {t("communication:empty")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("communication:emptyDescription")}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[280px] pr-4">
              <div className="space-y-4">
                {displayItems.map((record) => {
                  const Icon = getCommunicationIcon(record.type);
                  const occurredAt = toDate(record.occurredAt);

                  return (
                    <div
                      key={record.id}
                      className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${getCommunicationColor(record.type)}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-xs font-normal"
                          >
                            {t(`communication:types.${record.type}`)}
                          </Badge>
                          {record.direction === "outbound" ? (
                            <ArrowUpRight className="h-3 w-3 text-blue-500" />
                          ) : (
                            <ArrowDownLeft className="h-3 w-3 text-green-500" />
                          )}
                        </div>
                        {record.subject && (
                          <p className="mt-1 font-medium text-sm truncate">
                            {record.subject}
                          </p>
                        )}
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {record.summary || record.content}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatOccurredAt(occurredAt, locale)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {hasMore && onViewAll && (
            <Button variant="ghost" className="mt-4 w-full" onClick={onViewAll}>
              {t("communication:viewAll")}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>

      <CommunicationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        organizationId={organizationId}
        contactId={contactId}
        contactName={contactName}
        onSuccess={handleCommunicationCreated}
      />
    </>
  );
}
