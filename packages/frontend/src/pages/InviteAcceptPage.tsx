import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, X, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getInviteDetails,
  acceptOrganizationInvite,
  declineOrganizationInvite,
  acceptMembershipInvite,
  declineMembershipInvite,
  getPendingInvites,
} from "@/services/inviteService";

interface InviteDetails {
  organizationName?: string;
  inviterName?: string;
  roles?: string[];
  expiresAt?: { seconds: number; nanoseconds: number };
}

export default function InviteAcceptPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation(["invites", "common"]);

  const token = searchParams.get("token");
  const memberId = searchParams.get("memberId");

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteDetails | null>(null);

  const loadInvite = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const details = await getInviteDetails(token);
      setInvite(details);
      setError(null);
    } catch (err: any) {
      setError(err.message || t("invites:errors.notFound"));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  const loadMembershipDetails = useCallback(async () => {
    if (!memberId) return;

    try {
      setLoading(true);
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
      }
      setError(null);
    } catch {
      // Non-critical — we can still show accept/decline
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    if (token) {
      loadInvite();
    } else if (memberId) {
      loadMembershipDetails();
    } else {
      setError(t("invites:errors.notFound"));
      setLoading(false);
    }
  }, [token, memberId, loadInvite, loadMembershipDetails, t]);

  const handleAccept = async () => {
    try {
      setProcessing(true);
      setError(null);

      if (!user) {
        if (token) {
          navigate(`/signup?invite=${token}`);
        } else {
          navigate("/login");
        }
        return;
      }

      if (token) {
        await acceptOrganizationInvite(token);
      } else if (memberId) {
        await acceptMembershipInvite(memberId);
      }

      navigate("/organizations");
    } catch (err: any) {
      setError(err.message || t("invites:errors.acceptFailed"));
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (
      !confirm(
        t("invites:pendingBanner.declineConfirm", {
          organizationName: invite?.organizationName || "",
        }),
      )
    ) {
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      if (token) {
        await declineOrganizationInvite(token);
      } else if (memberId) {
        await declineMembershipInvite(memberId);
      }

      navigate("/");
    } catch (err: any) {
      setError(err.message || t("invites:errors.declineFailed"));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t("common:labels.loading")}</p>
        </div>
      </div>
    );
  }

  if (error && !invite && !memberId) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{t("invites:titles.acceptInvitation")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-6 flex gap-4">
              <Button onClick={() => navigate("/")} variant="outline">
                {t("common:buttons.back")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("invites:titles.acceptInvitation")}</CardTitle>
          <CardDescription>
            {invite?.organizationName
              ? t("invites:pendingBanner.message", {
                  organizationName: invite.organizationName,
                })
              : t("invites:titles.pendingInvitations")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
                      <span
                        key={role}
                        className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
                      >
                        {role}
                      </span>
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

          {memberId && !invite && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("invites:titles.pendingInvitations")}
              </p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4 pt-4">
            <Button
              onClick={handleAccept}
              disabled={processing}
              className="flex-1"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common:buttons.submitting")}
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {t("invites:buttons.accept")}
                </>
              )}
            </Button>

            <Button
              onClick={handleDecline}
              disabled={processing}
              variant="outline"
              className="flex-1"
            >
              <X className="mr-2 h-4 w-4" />
              {t("invites:buttons.decline")}
            </Button>
          </div>

          {!user && (
            <p className="text-sm text-center text-muted-foreground">
              {t("common:labels.loginRequired")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
