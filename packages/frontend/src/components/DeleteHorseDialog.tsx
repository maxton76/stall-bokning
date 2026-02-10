import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { deleteHorse } from "@/services/horseService";
import type { Horse } from "@equiduty/shared";

interface DeleteHorseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  horse: Pick<Horse, "id" | "name"> | null;
  onSuccess: () => void;
}

export function DeleteHorseDialog({
  open,
  onOpenChange,
  horse,
  onSuccess,
}: DeleteHorseDialogProps) {
  const { t } = useTranslation(["horses", "common"]);
  const { toast } = useToast();
  const [showSecondConfirmation, setShowSecondConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  // Reset second confirmation state when dialog closes
  useEffect(() => {
    if (!open) {
      setShowSecondConfirmation(false);
    }
  }, [open]);

  const handleClose = () => {
    setShowSecondConfirmation(false);
    onOpenChange(false);
  };

  const handleFirstConfirm = () => {
    setShowSecondConfirmation(true);
  };

  const handleSecondCancel = () => {
    setShowSecondConfirmation(false);
  };

  const handleFinalDelete = async () => {
    if (!horse) return;

    setLoading(true);
    try {
      await deleteHorse(horse.id);

      toast({
        title: t("common:success"),
        description: t("horses:messages.deleteSuccess"),
      });

      handleClose();
      onSuccess();
    } catch (error) {
      console.error("Failed to delete horse:", error);
      toast({
        variant: "destructive",
        title: t("common:error"),
        description:
          error instanceof Error ? error.message : t("common:errors.generic"),
      });
    } finally {
      setLoading(false);
    }
  };

  // First confirmation dialog
  if (!showSecondConfirmation) {
    return (
      <AlertDialog open={open} onOpenChange={handleClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              {t("horses:deleteDialog.firstConfirmation.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("horses:deleteDialog.firstConfirmation.description", {
                horseName: horse?.name || "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleClose}>
              {t("horses:deleteDialog.firstConfirmation.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFirstConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t("horses:deleteDialog.firstConfirmation.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Second confirmation dialog
  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            {t("horses:deleteDialog.secondConfirmation.title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-destructive font-medium">
            {t("horses:deleteDialog.secondConfirmation.description", {
              horseName: horse?.name || "",
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleSecondCancel} disabled={loading}>
            {t("horses:deleteDialog.secondConfirmation.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleFinalDelete}
            disabled={loading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {loading
              ? t("common:loading")
              : t("horses:deleteDialog.secondConfirmation.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
