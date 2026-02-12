import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Link2, Unlink, AlertTriangle } from "lucide-react";
import type { ProviderInfo } from "@/types/auth";

const PROVIDER_IDS = ["password", "google.com", "apple.com"] as const;

function getProviderKey(providerId: string): "password" | "google" | "apple" {
  if (providerId === "google.com") return "google";
  if (providerId === "apple.com") return "apple";
  return "password";
}

function ProviderIcon({ providerId }: { providerId: string }) {
  if (providerId === "google.com") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
    );
  }
  if (providerId === "apple.com") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
      </svg>
    );
  }
  // Email/password
  return (
    <svg
      className="h-5 w-5 text-muted-foreground"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

export default function LinkedAccountsCard() {
  const { t } = useTranslation(["account"]);
  const { user, linkGoogle, linkApple, unlinkProvider, refreshProfile } =
    useAuth();
  const { toast } = useToast();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState<string | null>(null);

  if (!user) return null;

  const linkedIds = new Set(user.linkedProviders.map((p) => p.providerId));
  const canUnlink = user.linkedProviders.length > 1;

  function getLinkedProvider(providerId: string): ProviderInfo | undefined {
    return user!.linkedProviders.find((p) => p.providerId === providerId);
  }

  async function handleLink(providerId: string) {
    const key = getProviderKey(providerId);
    const providerName = t(`account:linkedAccounts.providers.${key}`);
    setLoadingProvider(providerId);

    try {
      if (providerId === "google.com") {
        await linkGoogle();
      } else if (providerId === "apple.com") {
        await linkApple();
      }
      toast({
        description: t("account:linkedAccounts.success.linked", {
          provider: providerName,
        }),
      });
    } catch (err: any) {
      const code = err?.code as string | undefined;
      if (code === "auth/credential-already-in-use") {
        toast({
          variant: "destructive",
          description: t("account:linkedAccounts.warnings.alreadyInUse", {
            provider: providerName,
          }),
        });
      } else if (code === "auth/popup-closed-by-user") {
        toast({ description: t("account:linkedAccounts.errors.cancelled") });
      } else if (code === "auth/requires-recent-login") {
        toast({
          variant: "destructive",
          description: t("account:linkedAccounts.errors.recentLoginRequired"),
        });
      } else if (code === "auth/provider-already-linked") {
        await refreshProfile();
      } else {
        toast({
          variant: "destructive",
          description: t("account:linkedAccounts.errors.linkFailed", {
            provider: providerName,
          }),
        });
      }
    } finally {
      setLoadingProvider(null);
    }
  }

  async function handleUnlink(providerId: string) {
    const key = getProviderKey(providerId);
    const providerName = t(`account:linkedAccounts.providers.${key}`);
    setConfirmUnlink(null);
    setLoadingProvider(providerId);

    try {
      await unlinkProvider(providerId);
      toast({
        description: t("account:linkedAccounts.success.unlinked", {
          provider: providerName,
        }),
      });
    } catch (err: any) {
      const code = err?.code as string | undefined;
      if (code === "auth/requires-recent-login") {
        toast({
          variant: "destructive",
          description: t("account:linkedAccounts.errors.recentLoginRequired"),
        });
      } else {
        toast({
          variant: "destructive",
          description: t("account:linkedAccounts.errors.unlinkFailed", {
            provider: providerName,
          }),
        });
      }
    } finally {
      setLoadingProvider(null);
    }
  }

  const confirmProvider = confirmUnlink ? getProviderKey(confirmUnlink) : null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("account:linkedAccounts.title")}</CardTitle>
          <CardDescription>
            {t("account:linkedAccounts.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {PROVIDER_IDS.map((providerId) => {
            const linked = getLinkedProvider(providerId);
            const key = getProviderKey(providerId);
            const isLinked = linkedIds.has(providerId);
            const isLoading = loadingProvider === providerId;

            // Password provider has no "Connect" flow — hide when not linked
            if (providerId === "password" && !isLinked) return null;

            const emailMismatch =
              isLinked &&
              linked?.email &&
              user.email &&
              linked.email.toLowerCase() !== user.email.toLowerCase();

            return (
              <div
                key={providerId}
                className="flex items-center justify-between gap-4 rounded-lg border p-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ProviderIcon providerId={providerId} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {t(`account:linkedAccounts.providers.${key}`)}
                    </p>
                    {isLinked && linked?.email && (
                      <p className="text-xs text-muted-foreground truncate">
                        {t("account:linkedAccounts.linkedAs", {
                          email: linked.email,
                        })}
                      </p>
                    )}
                    {emailMismatch && (
                      <div className="flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">
                          {t("account:linkedAccounts.warnings.emailMismatch")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {isLinked ? (
                    providerId === "password" ? (
                      <Badge variant="secondary">
                        {t(`account:linkedAccounts.providers.${key}`)}
                      </Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canUnlink || isLoading}
                        onClick={() => setConfirmUnlink(providerId)}
                        title={
                          !canUnlink
                            ? t(
                                "account:linkedAccounts.warnings.cannotDisconnect",
                              )
                            : undefined
                        }
                      >
                        <Unlink className="h-4 w-4 mr-1" />
                        {t("account:linkedAccounts.disconnect")}
                      </Button>
                    )
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLoading}
                      onClick={() => handleLink(providerId)}
                    >
                      <Link2 className="h-4 w-4 mr-1" />
                      {t("account:linkedAccounts.connect")}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <AlertDialog
        open={confirmUnlink !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmUnlink(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmProvider &&
                t("account:linkedAccounts.confirmDisconnect.title", {
                  provider: t(
                    `account:linkedAccounts.providers.${confirmProvider}`,
                  ),
                })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmProvider &&
                t("account:linkedAccounts.confirmDisconnect.description", {
                  provider: t(
                    `account:linkedAccounts.providers.${confirmProvider}`,
                  ),
                })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("account:linkedAccounts.confirmDisconnect.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmUnlink && handleUnlink(confirmUnlink)}
            >
              {t("account:linkedAccounts.confirmDisconnect.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
