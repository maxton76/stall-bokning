import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import type { StableMember } from "@/types/roles";
import { formatDisplayName } from "@/lib/nameUtils";

interface RemoveMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: StableMember | null;
  horseCount: number;
  onConfirm: (memberId: string) => Promise<void>;
}

export function RemoveMemberDialog({
  open,
  onOpenChange,
  member,
  horseCount,
  onConfirm,
}: RemoveMemberDialogProps) {
  const { t } = useTranslation(["stables", "common"]);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!member) return;

    try {
      setLoading(true);
      await onConfirm(member.userId);
      onOpenChange(false);
    } catch (error) {
      console.error("Error removing member:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!member) return null;

  const memberName = formatDisplayName(
    {
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.userEmail,
    },
    {
      fallback: t("stables:members.unknownUser"),
    },
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("stables:members.removeMember.title")}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                {t("stables:members.removeMember.confirmText", {
                  name: memberName,
                  role: member.role,
                  interpolation: { escapeValue: false },
                })}
              </p>

              {horseCount > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{t("stables:members.removeMember.warning")}</strong>{" "}
                    {t("stables:members.removeMember.horseWarning", {
                      count: horseCount,
                    })}{" "}
                    {t("stables:members.removeMember.horseUnassignNote")}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {t("stables:members.removeMember.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading
              ? t("stables:members.removeMember.removing")
              : t("stables:members.removeMember.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
