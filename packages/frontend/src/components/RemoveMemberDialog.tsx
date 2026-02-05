import { useState, useEffect, useCallback } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Building2, User } from "lucide-react";
import type { StableMember } from "@/types/roles";
import type { OrganizationMember } from "@equiduty/shared";
import { formatDisplayName } from "@/lib/nameUtils";
import {
  getMemberHorses,
  batchTransferHorseOwnership,
  removeOrganizationMember,
} from "@/services/organizationMemberService";
import { useToast } from "@/hooks/use-toast";

interface MemberHorse {
  id: string;
  name: string;
  stableId?: string;
  stableName?: string;
}

// Member with common fields needed for the dialog
interface DialogMember {
  userId: string;
  firstName?: string;
  lastName?: string;
  userEmail?: string;
  email?: string;
}

interface RemoveMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: DialogMember | StableMember | OrganizationMember | null;
  organizationId: string;
  /** @deprecated Use organizationId and automatic horse fetching instead */
  horseCount?: number;
  onConfirm: (memberId: string) => Promise<void>;
  /** Optional: Called when horses need to be transferred before removal */
  onTransferComplete?: () => void;
}

type HorseAction = "transfer_to_stable" | "leave_with_member";

export function RemoveMemberDialog({
  open,
  onOpenChange,
  member,
  organizationId,
  horseCount: legacyHorseCount,
  onConfirm,
  onTransferComplete,
}: RemoveMemberDialogProps) {
  const { t } = useTranslation(["organizations", "stables", "common"]);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingHorses, setCheckingHorses] = useState(false);
  const [memberHorses, setMemberHorses] = useState<MemberHorse[]>([]);
  const [horseAction, setHorseAction] =
    useState<HorseAction>("transfer_to_stable");

  // Get userId from member (supports both types)
  const getMemberUserId = (
    m: DialogMember | StableMember | OrganizationMember,
  ): string => {
    if ("userId" in m && m.userId) {
      return m.userId;
    }
    // Legacy StableMember may use id format {userId}_{stableId}
    if ("id" in m && typeof m.id === "string") {
      return m.id.split("_")[0] || "";
    }
    return "";
  };

  // Fetch member's horses when dialog opens
  useEffect(() => {
    if (!open || !member || !organizationId) {
      // Reset state when dialog closes
      setMemberHorses([]);
      setHorseAction("transfer_to_stable");
      return;
    }

    const userId = getMemberUserId(member);
    if (!userId) return;

    let cancelled = false;

    const fetchMemberHorses = async () => {
      setCheckingHorses(true);
      try {
        const result = await getMemberHorses(userId, organizationId);
        if (!cancelled) {
          setMemberHorses(result.horses || []);
        }
      } catch (error) {
        console.error("Error fetching member horses:", error);
        // Fall back to legacy behavior if endpoint not available
        if (!cancelled) {
          setMemberHorses([]);
        }
      } finally {
        if (!cancelled) {
          setCheckingHorses(false);
        }
      }
    };

    fetchMemberHorses();

    return () => {
      cancelled = true;
    };
  }, [open, member, organizationId]);

  const handleConfirm = async () => {
    if (!member) return;

    const userId = getMemberUserId(member);
    if (!userId) return;

    try {
      setLoading(true);

      // If member has horses, handle them first
      if (memberHorses.length > 0) {
        const horseIds = memberHorses.map((h) => h.id);
        const transferResult = await batchTransferHorseOwnership(
          horseIds,
          horseAction,
          organizationId,
          userId,
        );

        if (!transferResult.success) {
          toast({
            title: t("organizations:members.removeMember.transferFailed"),
            description: t(
              "organizations:members.removeMember.transferFailedDescription",
            ),
            variant: "destructive",
          });
          return;
        }

        // Show success message for horse transfer
        const successCount = transferResult.results.filter(
          (r) => r.success,
        ).length;
        if (successCount > 0) {
          toast({
            title: t("organizations:members.removeMember.horsesTransferred"),
            description: t(
              "organizations:members.removeMember.horsesTransferredDescription",
              {
                count: successCount,
                action:
                  horseAction === "transfer_to_stable"
                    ? t("organizations:members.removeMember.toStable")
                    : t("organizations:members.removeMember.withMember"),
              },
            ),
          });
        }

        onTransferComplete?.();
      }

      // Now remove the member (with forceRemove=true since horses are handled)
      await removeOrganizationMember(userId, organizationId, true);

      // Call the onConfirm callback for any additional handling
      await onConfirm(userId);

      // Success - show toast and close dialog
      toast({
        title: t("organizations:members.removeMember.success"),
        description: t("organizations:members.removeMember.successDescription"),
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error removing member:", error);
      // Keep dialog open so user can see the error and retry
      toast({
        title: t("organizations:members.removeMember.failed"),
        description: t("organizations:members.removeMember.failedDescription"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!member) return null;

  // Get member name for display
  const memberEmail =
    "userEmail" in member && member.userEmail
      ? member.userEmail
      : "email" in member && member.email
        ? member.email
        : undefined;

  const memberName = formatDisplayName(
    {
      firstName: "firstName" in member ? member.firstName : undefined,
      lastName: "lastName" in member ? member.lastName : undefined,
      email: memberEmail,
    },
    {
      fallback: t("stables:members.unknownUser"),
    },
  );

  // Determine horse count - use fetched data or legacy prop
  const effectiveHorseCount = memberHorses.length || legacyHorseCount || 0;
  const hasHorses = effectiveHorseCount > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("organizations:members.removeMember.title")}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                {t("organizations:members.removeMember.confirmText", {
                  name: memberName,
                  interpolation: { escapeValue: false },
                })}
              </p>

              {checkingHorses && (
                <p className="text-sm text-muted-foreground">
                  {t("organizations:members.removeMember.checkingHorses")}
                </p>
              )}

              {hasHorses && !checkingHorses && (
                <>
                  <Alert
                    variant="default"
                    className="border-amber-500 bg-amber-50 dark:bg-amber-950/20"
                  >
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800 dark:text-amber-200">
                      <strong>
                        {t(
                          "organizations:members.removeMember.horseWarningTitle",
                        )}
                      </strong>
                      <p className="mt-1">
                        {t("organizations:members.removeMember.horseWarning", {
                          count: effectiveHorseCount,
                          name: memberName,
                        })}
                      </p>
                    </AlertDescription>
                  </Alert>

                  {/* Horse list */}
                  {memberHorses.length > 0 && (
                    <div className="rounded-md border p-3">
                      <p className="text-sm font-medium mb-2">
                        {t("organizations:members.removeMember.affectedHorses")}
                        :
                      </p>
                      <ul className="space-y-1">
                        {memberHorses.slice(0, 5).map((horse) => (
                          <li
                            key={horse.id}
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                          >
                            <span className="h-3 w-3 text-center">•</span>
                            <span>{horse.name}</span>
                            {horse.stableName && (
                              <span className="text-xs">
                                ({horse.stableName})
                              </span>
                            )}
                          </li>
                        ))}
                        {memberHorses.length > 5 && (
                          <li className="text-sm text-muted-foreground">
                            {t(
                              "organizations:members.removeMember.andMoreHorses",
                              {
                                count: memberHorses.length - 5,
                              },
                            )}
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Action selection */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">
                      {t("organizations:members.removeMember.whatShouldHappen")}
                    </p>
                    <RadioGroup
                      value={horseAction}
                      onValueChange={(value) =>
                        setHorseAction(value as HorseAction)
                      }
                      className="space-y-2"
                    >
                      <div className="flex items-start space-x-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
                        <RadioGroupItem
                          value="transfer_to_stable"
                          id="transfer_to_stable"
                          className="mt-1"
                        />
                        <Label
                          htmlFor="transfer_to_stable"
                          className="flex-1 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 font-medium">
                            <Building2 className="h-4 w-4" />
                            {t(
                              "organizations:members.removeMember.transferToStable",
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t(
                              "organizations:members.removeMember.transferToStableDescription",
                            )}
                          </p>
                        </Label>
                      </div>

                      <div className="flex items-start space-x-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
                        <RadioGroupItem
                          value="leave_with_member"
                          id="leave_with_member"
                          className="mt-1"
                        />
                        <Label
                          htmlFor="leave_with_member"
                          className="flex-1 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 font-medium">
                            <User className="h-4 w-4" />
                            {t(
                              "organizations:members.removeMember.leaveWithMember",
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t(
                              "organizations:members.removeMember.leaveWithMemberDescription",
                            )}
                          </p>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {t("common:buttons.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={loading || checkingHorses}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading
              ? t("organizations:members.removeMember.removing")
              : hasHorses
                ? t("organizations:members.removeMember.confirmWithHorses")
                : t("organizations:members.removeMember.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
