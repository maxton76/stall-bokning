import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { WifiOff, Wifi, CloudOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePwa } from "@/hooks/usePwa";

interface OfflineIndicatorProps {
  className?: string;
  showOnlineStatus?: boolean;
  variant?: "badge" | "banner" | "icon";
}

export function OfflineIndicator({
  className,
  showOnlineStatus = false,
  variant = "badge",
}: OfflineIndicatorProps) {
  const { t } = useTranslation("common");
  const { isOnline } = usePwa();
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  // Track when we come back online
  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // Don't show anything if online and not showing online status
  if (isOnline && !showOnlineStatus && !showReconnected) {
    return null;
  }

  if (variant === "icon") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center ${className}`}>
              {isOnline ? (
                showReconnected ? (
                  <Wifi className="h-4 w-4 text-green-500 animate-pulse" />
                ) : showOnlineStatus ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : null
              ) : (
                <WifiOff className="h-4 w-4 text-destructive animate-pulse" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {isOnline
              ? showReconnected
                ? t("pwa.reconnected", "Återkopplad")
                : t("pwa.online", "Online")
              : t("pwa.offline", "Offline")}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === "banner") {
    if (isOnline && !showReconnected) {
      return null;
    }

    return (
      <div
        className={`fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-sm ${
          isOnline
            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
        } ${className}`}
      >
        <div className="flex items-center justify-center gap-2">
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4" />
              <span>{t("pwa.reconnected", "Återkopplad till internet")}</span>
            </>
          ) : (
            <>
              <CloudOff className="h-4 w-4" />
              <span>
                {t(
                  "pwa.offlineMode",
                  "Du är offline. Vissa funktioner är begränsade.",
                )}
              </span>
            </>
          )}
        </div>
      </div>
    );
  }

  // Default badge variant
  return (
    <Badge
      variant={isOnline ? "default" : "destructive"}
      className={`flex items-center gap-1 ${className}`}
    >
      {isOnline ? (
        showReconnected ? (
          <>
            <Wifi className="h-3 w-3" />
            {t("pwa.reconnected", "Återkopplad")}
          </>
        ) : (
          <>
            <Wifi className="h-3 w-3" />
            {t("pwa.online", "Online")}
          </>
        )
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          {t("pwa.offline", "Offline")}
        </>
      )}
    </Badge>
  );
}

export default OfflineIndicator;
