import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { exportCommissionsCSV } from "@/services/trainerCommissionService";

// ============================================================================
// Props
// ============================================================================

interface CommissionExportButtonProps {
  organizationId: string;
  periodStartFilter: string;
  periodEndFilter: string;
  trainerFilter: string;
  statusFilter: string;
}

// ============================================================================
// Component
// ============================================================================

export function CommissionExportButton({
  organizationId,
  periodStartFilter,
  periodEndFilter,
  trainerFilter,
  statusFilter,
}: CommissionExportButtonProps) {
  const { t } = useTranslation(["trainerCommission"]);
  const { toast } = useToast();

  const handleExport = useCallback(async () => {
    try {
      const blob = await exportCommissionsCSV(organizationId, {
        periodStart: periodStartFilter || undefined,
        periodEnd: periodEndFilter || undefined,
        trainerId: trainerFilter || undefined,
        status: statusFilter || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "commissions-export.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: t("trainerCommission:toast.exported") });
    } catch {
      toast({
        title: t("trainerCommission:toast.error"),
        variant: "destructive",
      });
    }
  }, [
    organizationId,
    periodStartFilter,
    periodEndFilter,
    trainerFilter,
    statusFilter,
    toast,
    t,
  ]);

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" />
      {t("trainerCommission:commission.export")}
    </Button>
  );
}
