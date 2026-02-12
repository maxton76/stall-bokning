import { useState, useEffect, useCallback, useRef } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";

const POLL_INTERVAL = 3000; // 3 seconds
const RESEND_COOLDOWN = 60; // 60 seconds

export default function VerifyEmailPage() {
  const { t } = useTranslation("auth");
  const { user, signOut, refreshEmailVerification } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fix 7: Redirect unauthenticated users to login
  if (!auth.currentUser) {
    return <Navigate to="/login" replace />;
  }

  const userEmail = auth.currentUser?.email ?? user?.email ?? "";

  const redirectAfterVerification = useCallback(() => {
    setVerified(true);
    setTimeout(() => {
      if (inviteToken) {
        navigate(`/organizations?invite=${inviteToken}`, { replace: true });
      } else {
        navigate("/overview", { replace: true });
      }
    }, 1500);
  }, [navigate, inviteToken]);

  // Fix 4: If user is already verified, redirect immediately
  useEffect(() => {
    if (user?.emailVerified) {
      redirectAfterVerification();
    }
  }, [user?.emailVerified, redirectAfterVerification]);

  // Fix 5: Poll for email verification — clear interval immediately on success
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) return;

        await firebaseUser.reload();
        if (firebaseUser.emailVerified) {
          if (pollRef.current) clearInterval(pollRef.current);
          await refreshEmailVerification();
          redirectAfterVerification();
        }
      } catch {
        // Silently retry on next poll
      }
    }, POLL_INTERVAL);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refreshEmailVerification, redirectAfterVerification]);

  // Fix 6: Cooldown timer — only start/stop on boolean transition, not every tick
  useEffect(() => {
    if (resendCooldown <= 0) return;

    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resendCooldown > 0]);

  const handleResend = async () => {
    setResendError(null);
    setResendSuccess(false);

    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;

      await sendEmailVerification(firebaseUser);
      setResendSuccess(true);
      setResendCooldown(RESEND_COOLDOWN);
    } catch {
      setResendError(t("verifyEmail.resendFailed"));
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  if (verified) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium">{t("verifyEmail.verified")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Mail className="h-16 w-16 text-muted-foreground" />
          </div>
          <CardTitle>{t("verifyEmail.title")}</CardTitle>
          <CardDescription>
            {t("verifyEmail.subtitle")}{" "}
            <span className="font-medium text-foreground">{userEmail}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            {t("verifyEmail.checkInbox")}
          </p>
          <p className="text-sm text-muted-foreground text-center">
            {t("verifyEmail.checkSpam")}
          </p>

          {resendSuccess && (
            <Alert>
              <AlertDescription>{t("verifyEmail.resent")}</AlertDescription>
            </Alert>
          )}

          {resendError && (
            <Alert variant="destructive">
              <AlertDescription>{resendError}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleResend}
            variant="outline"
            className="w-full"
            disabled={resendCooldown > 0}
          >
            {resendCooldown > 0
              ? t("verifyEmail.resendCooldown", { seconds: resendCooldown })
              : t("verifyEmail.resend")}
          </Button>

          <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t("verifyEmail.checking")}
          </div>

          <div className="pt-2 text-center">
            <button
              onClick={handleSignOut}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              {t("verifyEmail.signOut")}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
