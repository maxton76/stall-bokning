import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwa } from "@/hooks/usePwa";

interface PwaInstallBannerProps {
  className?: string;
}

export function PwaInstallBanner({ className }: PwaInstallBannerProps) {
  const { t } = useTranslation("common");
  const { canInstall, isInstalled, install } = usePwa();
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Check if user has previously dismissed the banner
  useEffect(() => {
    const dismissedAt = localStorage.getItem("pwa-banner-dismissed");

    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const daysSinceDismissed =
        (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);

      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        setDismissed(true);
      }
    }
  }, []);

  const handleInstall = async () => {
    setInstalling(true);
    const success = await install();

    if (!success) {
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa-banner-dismissed", new Date().toISOString());
  };

  // Don't show if already installed, can't install, or dismissed
  if (isInstalled || !canInstall || dismissed) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 p-4 bg-primary text-primary-foreground shadow-lg animate-slide-up ${className}`}
    >
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-foreground/10 rounded-lg">
            <Smartphone className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm sm:text-base">
              {t("pwa.installTitle", "Installera EquiDuty")}
            </p>
            <p className="text-xs sm:text-sm opacity-90 truncate">
              {t("pwa.installDescription", "Snabbare och fungerar offline")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleInstall}
            disabled={installing}
            className="whitespace-nowrap"
          >
            {installing ? (
              <span className="animate-pulse">
                {t("common:loading.default")}
              </span>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {t("pwa.install", "Installera")}
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">{t("common:close")}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PwaInstallBanner;
