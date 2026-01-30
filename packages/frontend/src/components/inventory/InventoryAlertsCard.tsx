import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Phone, Check } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { acknowledgeAlert } from "@/services/inventoryService";
import type { InventoryAlertDisplay } from "@equiduty/shared";
import { cn } from "@/lib/utils";

interface InventoryAlertsCardProps {
  alerts: InventoryAlertDisplay[];
  onAcknowledge: () => void;
}

export function InventoryAlertsCard({
  alerts,
  onAcknowledge,
}: InventoryAlertsCardProps) {
  const { t } = useTranslation(["inventory", "common"]);
  const { toast } = useToast();
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const handleAcknowledge = async (alertId: string) => {
    setAcknowledgingId(alertId);
    try {
      await acknowledgeAlert(alertId);
      toast({
        title: t("inventory:messages.alertAcknowledged"),
      });
      onAcknowledge();
    } catch {
      toast({
        title: t("common:errors.generic"),
        variant: "destructive",
      });
    } finally {
      setAcknowledgingId(null);
    }
  };

  const unacknowledgedAlerts = alerts.filter((a) => !a.isAcknowledged);

  if (unacknowledgedAlerts.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <CardTitle className="text-lg">
            {t("inventory:alerts.title")}
          </CardTitle>
        </div>
        <CardDescription>
          {unacknowledgedAlerts.length} {t("common:labels.activeAlerts")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {unacknowledgedAlerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "flex items-center justify-between rounded-lg border p-3",
                alert.alertType === "out-of-stock"
                  ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
                  : "border-amber-200 bg-white dark:border-amber-800 dark:bg-amber-950/10",
              )}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{alert.feedTypeName}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      alert.alertType === "out-of-stock"
                        ? "border-red-200 text-red-700"
                        : "border-amber-200 text-amber-700",
                    )}
                  >
                    {alert.alertType === "out-of-stock"
                      ? t("inventory:alerts.outOfStock")
                      : t("inventory:alerts.lowStock")}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("inventory:alerts.shortage", {
                    amount: alert.minimumStockLevel - alert.currentQuantity,
                    unit: alert.unit,
                  })}
                </p>
                {alert.supplierName && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">
                      {alert.supplierName}
                    </span>
                    {alert.supplierPhone && (
                      <a
                        href={`tel:${alert.supplierPhone}`}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Phone className="h-3 w-3" />
                        {alert.supplierPhone}
                      </a>
                    )}
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAcknowledge(alert.id)}
                disabled={acknowledgingId === alert.id}
              >
                <Check className="mr-1 h-4 w-4" />
                {acknowledgingId === alert.id
                  ? t("common:actions.loading")
                  : t("inventory:alerts.acknowledge")}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
