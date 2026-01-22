import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { ChevronDown, Plus, Edit, Trash2 } from "lucide-react";
import type { AuditLog } from "@shared/types/auditLog";

interface Props {
  logs: AuditLog[];
  loading: boolean;
}

export function FeedingHistoryTimeline({ logs, loading }: Props) {
  const { t, i18n } = useTranslation(["feeding", "common"]);
  const locale = i18n.language === "sv" ? sv : enUS;

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("common:loading", "Loading...")}
      </div>
    );
  }

  if (!logs?.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {t("feeding:history.noHistory", "No history available")}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {t(
            "feeding:history.noHistoryDescription",
            "History tracking started recently. Only changes after this date are shown.",
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <Card key={log.id} className="hover:shadow-md transition-shadow">
          <CardContent className="flex gap-4 p-4">
            {/* User Avatar */}
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {log.userName?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>

            {/* Log Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <ActionBadge action={log.action} />
                <span className="font-semibold truncate">
                  {log.userName ||
                    t("feeding:history.unknownUser", "Unknown user")}
                </span>
                <span className="text-sm text-muted-foreground truncate">
                  {formatChangeDescription(log, t)}
                </span>
              </div>

              {/* Timestamp */}
              <p className="text-xs text-muted-foreground">
                {log.timestamp
                  ? formatDistanceToNow(
                      log.timestamp instanceof Date
                        ? log.timestamp
                        : typeof log.timestamp === "string"
                          ? new Date(log.timestamp)
                          : new Date(),
                      {
                        addSuffix: true,
                        locale,
                      },
                    )
                  : "—"}
              </p>

              {/* Expandable Change Details */}
              {log.details?.changes && log.details.changes.length > 0 && (
                <Collapsible className="mt-3">
                  <CollapsibleTrigger className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                    <ChevronDown className="h-4 w-4" />
                    {t("feeding:history.viewDetails", "View details")}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <ChangeDetailsList changes={log.details.changes} t={t} />
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  const { t } = useTranslation(["feeding"]);

  const config: Record<string, { icon: typeof Plus; color: string }> = {
    create: {
      icon: Plus,
      color:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    update: {
      icon: Edit,
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    },
    delete: {
      icon: Trash2,
      color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
  };

  const configItem = config[action] || config["update"];
  const Icon = configItem?.icon || Edit;
  const color =
    configItem?.color ||
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";

  return (
    <Badge className={`${color} border-0`}>
      <Icon className="h-3 w-3 mr-1" />
      {t(`feeding:history.actions.${action}`, action)}
    </Badge>
  );
}

function formatChangeDescription(log: AuditLog, t: any): string {
  const horseName =
    typeof log.details?.horseName === "string" ? log.details.horseName : "";
  const feedingTime =
    typeof log.details?.feedingTimeName === "string"
      ? log.details.feedingTimeName
      : "";
  const feedTypeName =
    typeof log.details?.feedTypeName === "string"
      ? log.details.feedTypeName
      : "";
  const quantity =
    typeof log.details?.quantity === "number" ? log.details.quantity : null;
  const quantityMeasure =
    typeof log.details?.quantityMeasure === "string"
      ? log.details.quantityMeasure
      : "";

  // Build the description based on action type
  let description = "";

  if (log.action === "create") {
    // For create: "added 2 kg hay for Slöhögen - morning"
    if (quantity !== null && quantityMeasure && feedTypeName) {
      description =
        t("feeding:history.added", "added") +
        ` ${quantity} ${quantityMeasure} ${feedTypeName}`;
    } else if (feedTypeName) {
      description = t("feeding:history.added", "added") + ` ${feedTypeName}`;
    }

    if (horseName && feedingTime) {
      description += ` ${t("feeding:history.for", "for")} ${horseName} - ${feedingTime}`;
    } else if (horseName) {
      description += ` ${t("feeding:history.for", "for")} ${horseName}`;
    }
  } else if (log.action === "delete") {
    // For delete: "removed 2 kg hay for Slöhögen - morning"
    if (quantity !== null && quantityMeasure && feedTypeName) {
      description =
        t("feeding:history.removed", "removed") +
        ` ${quantity} ${quantityMeasure} ${feedTypeName}`;
    } else if (feedTypeName) {
      description =
        t("feeding:history.removed", "removed") + ` ${feedTypeName}`;
    }

    if (horseName && feedingTime) {
      description += ` ${t("feeding:history.for", "for")} ${horseName} - ${feedingTime}`;
    } else if (horseName) {
      description += ` ${t("feeding:history.for", "for")} ${horseName}`;
    }
  } else if (log.action === "update") {
    // For update: "updated Slöhögen - morning (hay, 2 kg)"
    if (horseName && feedingTime) {
      description =
        t("feeding:history.updated", "updated") +
        ` ${horseName} - ${feedingTime}`;

      // Add feed type and quantity if available
      const details: string[] = [];
      if (feedTypeName) details.push(feedTypeName);
      if (quantity !== null && quantityMeasure)
        details.push(`${quantity} ${quantityMeasure}`);

      if (details.length > 0) {
        description += ` (${details.join(", ")})`;
      }
    } else if (horseName) {
      description = t("feeding:history.updated", "updated") + ` ${horseName}`;
    }
  }

  // Fallback to resourceName if nothing else worked
  if (
    !description &&
    log.resourceName &&
    typeof log.resourceName === "string"
  ) {
    return log.resourceName;
  }

  return description || "";
}

function ChangeDetailsList({ changes, t }: { changes: any[]; t: any }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 space-y-2">
      {changes.map((change, idx) => (
        <div key={idx} className="flex items-center gap-2 text-sm flex-wrap">
          <span className="font-medium">
            {t(`feeding:history.fields.${change.field}`, change.field)}:
          </span>
          <span className="text-muted-foreground line-through">
            {formatFieldValue(change.oldValue)}
          </span>
          <span>→</span>
          <span className="font-semibold text-green-700 dark:text-green-400">
            {formatFieldValue(change.newValue)}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatFieldValue(value: any): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toString();
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  if (typeof value === "object" && value.seconds) {
    // Firestore Timestamp
    return new Date(value.seconds * 1000).toLocaleDateString();
  }
  return String(value);
}
