/**
 * AvailabilityIndicator Component
 * Visual indicator showing real-time availability status
 */

import { useTranslation } from "react-i18next";
import { CheckCircle, AlertTriangle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AvailabilityIndicatorProps {
  status: "available" | "limited" | "full" | "closed" | "checking";
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function AvailabilityIndicator({
  status,
  className,
  showLabel = true,
  size = "md",
}: AvailabilityIndicatorProps) {
  const { t } = useTranslation(["facilities", "common"]);

  const config = {
    available: {
      icon: CheckCircle,
      label: t("facilities:availability.available"),
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-950",
      borderColor: "border-green-300",
    },
    limited: {
      icon: AlertTriangle,
      label: t("facilities:availability.limited"),
      color: "text-yellow-600",
      bgColor: "bg-yellow-100 dark:bg-yellow-950",
      borderColor: "border-yellow-300",
    },
    full: {
      icon: XCircle,
      label: t("facilities:availability.full"),
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-950",
      borderColor: "border-red-300",
    },
    closed: {
      icon: XCircle,
      label: t("facilities:availability.closed"),
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      borderColor: "border-muted",
    },
    checking: {
      icon: Clock,
      label: t("common:loading.default"),
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      borderColor: "border-muted",
    },
  };

  const { icon: Icon, label, color, bgColor, borderColor } = config[status];

  const iconSize = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }[size];

  if (!showLabel) {
    return <Icon className={cn(iconSize, color, className)} />;
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "flex items-center gap-1.5",
        bgColor,
        borderColor,
        color,
        className,
      )}
    >
      <Icon className={iconSize} />
      <span className="text-xs font-medium">{label}</span>
    </Badge>
  );
}
