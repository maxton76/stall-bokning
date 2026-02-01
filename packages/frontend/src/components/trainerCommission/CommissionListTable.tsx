import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type { TrainerCommission, CommissionStatus } from "@equiduty/shared";
import { formatSEK } from "@/lib/formatters";

const STATUS_VARIANTS: Record<
  CommissionStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "secondary",
  pending_approval: "outline",
  approved: "default",
  paid: "default",
  rejected: "destructive",
};

const COMMISSION_STATUSES: CommissionStatus[] = [
  "draft",
  "pending_approval",
  "approved",
  "paid",
  "rejected",
];

/**
 * Format a period date value (could be ISO string or Timestamp-like object)
 * to YYYY-MM-DD display string.
 */
function formatPeriodDate(value: unknown): string {
  if (!value) return "";
  try {
    if (typeof value === "string") {
      return value.split("T")[0] ?? "";
    }
    if (typeof value === "object" && value !== null && "_seconds" in value) {
      const ts = value as { _seconds: number };
      return new Date(ts._seconds * 1000).toISOString().split("T")[0] ?? "";
    }
    return "";
  } catch {
    return "";
  }
}

// ============================================================================
// Props
// ============================================================================

interface CommissionListTableProps {
  commissions: TrainerCommission[];
  isLoading: boolean;
  periodStartFilter: string;
  onPeriodStartChange: (value: string) => void;
  periodEndFilter: string;
  onPeriodEndChange: (value: string) => void;
  commissionStatusFilter: string;
  onStatusFilterChange: (value: string) => void;
  onOpenCalculate: () => void;
  onExport: () => void;
  onApprove: (commissionId: string) => void;
  onOpenReject: (commissionId: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function CommissionListTable({
  commissions,
  isLoading,
  periodStartFilter,
  onPeriodStartChange,
  periodEndFilter,
  onPeriodEndChange,
  commissionStatusFilter,
  onStatusFilterChange,
  onOpenCalculate,
  onExport,
  onApprove,
  onOpenReject,
}: CommissionListTableProps) {
  const { t } = useTranslation(["trainerCommission", "common"]);

  return (
    <>
      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="date"
          value={periodStartFilter}
          onChange={(e) => onPeriodStartChange(e.target.value)}
          placeholder={t("trainerCommission:commission.periodStart")}
          className="w-40"
        />
        <Input
          type="date"
          value={periodEndFilter}
          onChange={(e) => onPeriodEndChange(e.target.value)}
          placeholder={t("trainerCommission:commission.periodEnd")}
          className="w-40"
        />
        <Select
          value={commissionStatusFilter}
          onValueChange={onStatusFilterChange}
        >
          <SelectTrigger className="w-44">
            <SelectValue
              placeholder={t("trainerCommission:commission.allStatuses")}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">
              {t("trainerCommission:commission.allStatuses")}
            </SelectItem>
            {COMMISSION_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`trainerCommission:status.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex gap-2">
          <CommissionCalculateButton onClick={onOpenCalculate} />
          <CommissionExportButton onClick={onExport} />
        </div>
      </div>

      {/* Commissions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("trainerCommission:config.trainer")}</TableHead>
                <TableHead>
                  {t("trainerCommission:commission.period")}
                </TableHead>
                <TableHead className="text-right">
                  {t("trainerCommission:commission.lessons")}
                </TableHead>
                <TableHead className="text-right">
                  {t("trainerCommission:commission.revenue")}
                </TableHead>
                <TableHead className="text-right">
                  {t("trainerCommission:commission.amount")}
                </TableHead>
                <TableHead className="text-center">
                  {t("trainerCommission:commission.status")}
                </TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : commissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <p className="text-muted-foreground">
                      {t("trainerCommission:commission.noCommissions")}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                commissions.map((comm) => {
                  const periodStr = `${formatPeriodDate(comm.period?.start)} - ${formatPeriodDate(comm.period?.end)}`;
                  const canAction = ["draft", "pending_approval"].includes(
                    comm.status,
                  );

                  return (
                    <TableRow key={comm.id}>
                      <TableCell className="font-medium">
                        {comm.trainerName}
                      </TableCell>
                      <TableCell>{periodStr}</TableCell>
                      <TableCell className="text-right">
                        {comm.totalLessons}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatSEK(comm.totalRevenue)} kr
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatSEK(comm.commissionAmount)} kr
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={STATUS_VARIANTS[comm.status] || "secondary"}
                        >
                          {t(`trainerCommission:status.${comm.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {canAction && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title={t("trainerCommission:commission.approve")}
                              onClick={() => onApprove(comm.id)}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={t("trainerCommission:commission.reject")}
                              onClick={() => onOpenReject(comm.id)}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

// ============================================================================
// Inline sub-components for the action bar buttons
// ============================================================================

import { Calculator, Download } from "lucide-react";

function CommissionCalculateButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation(["trainerCommission"]);
  return (
    <Button variant="outline" onClick={onClick}>
      <Calculator className="mr-2 h-4 w-4" />
      {t("trainerCommission:commission.calculate")}
    </Button>
  );
}

function CommissionExportButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation(["trainerCommission"]);
  return (
    <Button variant="outline" onClick={onClick}>
      <Download className="mr-2 h-4 w-4" />
      {t("trainerCommission:commission.export")}
    </Button>
  );
}
