import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2, UserPlus } from "lucide-react";
import { usePendingMemberships } from "@/hooks/usePendingMemberships";
import { formatDistanceToNow } from "date-fns";
import { sv, enUS } from "date-fns/locale";

export function PendingInviteBanner() {
  const { t, i18n } = useTranslation(["invites"]);
  const {
    pendingMemberships,
    isLoading,
    accept,
    decline,
    processingId,
    isAccepting,
    isDeclining,
  } = usePendingMemberships();

  if (isLoading || pendingMemberships.length === 0) {
    return null;
  }

  const dateLocale = i18n.language === "sv" ? sv : enUS;

  return (
    <div className="border-b bg-blue-50 dark:bg-blue-950/20">
      <div className="px-4 py-3 space-y-2">
        {pendingMemberships.map((membership) => {
          const expiresAt = membership.expiresAt
            ? new Date(membership.expiresAt.seconds * 1000)
            : null;
          const timeLeft = expiresAt
            ? formatDistanceToNow(expiresAt, {
                addSuffix: true,
                locale: dateLocale,
              })
            : "";

          return (
            <div
              key={membership.id}
              className="flex items-center justify-between gap-4 flex-wrap"
            >
              <div className="flex items-center gap-3 min-w-0">
                <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {t("invites:pendingBanner.message", {
                      organizationName: membership.organizationName,
                    })}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {membership.inviterName &&
                      t("invites:pendingBanner.invitedBy", {
                        inviterName: membership.inviterName,
                      })}
                    {timeLeft &&
                      ` · ${t("invites:pendingBanner.expiresIn", { timeLeft })}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => accept(membership.id)}
                  disabled={processingId !== null}
                >
                  {isAccepting && processingId === membership.id ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Check className="h-3 w-3 mr-1" />
                  )}
                  {t("invites:pendingBanner.accept")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (
                      confirm(
                        t("invites:pendingBanner.declineConfirm", {
                          organizationName: membership.organizationName,
                        }),
                      )
                    ) {
                      decline(membership.id);
                    }
                  }}
                  disabled={processingId !== null}
                >
                  {isDeclining && processingId === membership.id ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <X className="h-3 w-3 mr-1" />
                  )}
                  {t("invites:pendingBanner.decline")}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
