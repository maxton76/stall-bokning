import { useTranslation } from "react-i18next";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePwa } from "@/hooks/usePwa";

interface PwaUpdateNotificationProps {
  className?: string;
}

export function PwaUpdateNotification({
  className,
}: PwaUpdateNotificationProps) {
  const { t } = useTranslation("common");
  const { hasUpdate, update } = usePwa();

  if (!hasUpdate) {
    return null;
  }

  return (
    <AlertDialog open={hasUpdate}>
      <AlertDialogContent className={className}>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            {t("pwa.updateTitle", "Ny version tillgänglig")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              "pwa.updateDescription",
              "En ny version av appen är tillgänglig. Uppdatera för att få de senaste förbättringarna och buggfixarna.",
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {t("pwa.updateLater", "Senare")}
          </AlertDialogCancel>
          <AlertDialogAction onClick={update}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("pwa.updateNow", "Uppdatera nu")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Inline notification variant (for less intrusive update notice)
export function PwaUpdateBanner({ className }: PwaUpdateNotificationProps) {
  const { t } = useTranslation("common");
  const { hasUpdate, update } = usePwa();

  if (!hasUpdate) {
    return null;
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 p-2 bg-blue-600 text-white text-center text-sm ${className}`}
    >
      <div className="container mx-auto flex items-center justify-center gap-4">
        <span>{t("pwa.updateAvailable", "En ny version är tillgänglig")}</span>
        <Button
          variant="secondary"
          size="sm"
          onClick={update}
          className="h-7 px-3"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          {t("pwa.refresh", "Uppdatera")}
        </Button>
      </div>
    </div>
  );
}

export default PwaUpdateNotification;
