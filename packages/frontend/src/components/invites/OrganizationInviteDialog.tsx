import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  acceptMembershipInvite,
  declineMembershipInvite,
  getPendingInvites,
} from "@/services/inviteService";

interface OrganizationInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  onSuccess?: () => void;
}

interface InviteDetails {
  organizationName?: string;
  inviterName?: string;
  roles?: string[];
  expiresAt?: { seconds: number; nanoseconds: number };
}

export function OrganizationInviteDialog({
  open,
  onOpenChange,
  memberId,
  onSuccess,
}: OrganizationInviteDialogProps) {
  const { t } = useTranslation(["invites", "common"]);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteDetails | null>(null);

  // Load invite details when dialog opens
  useEffect(() => {
    if (!open || !memberId) return;

    const loadInviteDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = (await getPendingInvites()) as {
          invites: unknown[];
          pendingMemberships: any[];
        };
        const membership = response.pendingMemberships?.find(
          (m: any) => m.id === memberId,
        );
        if (membership) {
          setInvite({
            organizationName: membership.organizationName,
            inviterName: membership.inviterName,
            roles: membership.roles,
            expiresAt: membership.expiresAt,
          });
        } else {
          setError(t("invites:errors.notFound"));
        }
      } catch (err: any) {
        console.error("Failed to load invite details:", err);
        setError(err.message || t("invites:messages.loadFailed"));
      } finally {
        setLoading(false);
      }
    };

    loadInviteDetails();
  }, [open, memberId, t]);

  const handleAccept = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      await acceptMembershipInvite(memberId);
      onOpenChange(false);
      if (onSuccess) onSuccess();
      navigate("/organizations");
    } catch (err: any) {
      setError(err.message || t("invites:errors.acceptFailed"));
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    try {
      setProcessing(true);
      setError(null);
      await declineMembershipInvite(memberId);
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || t("invites:errors.declineFailed"));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("invites:titles.acceptInvitation")}</DialogTitle>
          <DialogDescription>
            {invite?.organizationName
              ? t("invites:pendingBanner.message", {
                  organizationName: invite.organizationName,
                })
              : t("invites:titles.pendingInvitations")}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error && !invite ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {invite && (
              <div className="space-y-4">
                {invite.organizationName && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t("common:labels.organization")}
                    </label>
                    <p className="text-lg font-semibold">
                      {invite.organizationName}
                    </p>
                  </div>
                )}

                {invite.inviterName && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t("invites:pendingBanner.invitedByLabel")}
                    </label>
                    <p>{invite.inviterName}</p>
                  </div>
                )}

                {invite.roles && invite.roles.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t("common:labels.roles")}
                    </label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {invite.roles.map((role: string) => (
                        <Badge key={role} variant="secondary">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {invite.expiresAt && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t("common:labels.expires")}
                    </label>
                    <p className="text-sm">
                      {new Date(
                        invite.expiresAt.seconds * 1000,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            onClick={handleDecline}
            disabled={processing || loading}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {processing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <X className="mr-2 h-4 w-4" />
            )}
            {t("invites:buttons.decline")}
          </Button>
          <Button
            onClick={handleAccept}
            disabled={processing || loading || (error !== null && !invite)}
            className="w-full sm:w-auto"
          >
            {processing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            {t("invites:buttons.accept")}
          </Button>
        </DialogFooter>

        {!user && !loading && (
          <p className="text-sm text-center text-muted-foreground mt-2">
            {t("common:labels.loginRequired")}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
