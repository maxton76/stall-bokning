import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  applyActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Mail,
  KeyRound,
  ShieldCheck,
} from "lucide-react";

type ActionMode = "verifyEmail" | "resetPassword" | "recoverEmail";
type Status = "idle" | "loading" | "success" | "error";

export default function AuthActionPage() {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const mode = searchParams.get("mode") as ActionMode | null;
  const oobCode = searchParams.get("oobCode");
  const continueUrl = searchParams.get("continueUrl");

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  // Reset password state
  const [email, setEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // Validate oobCode for reset password on mount
  useEffect(() => {
    if (mode === "resetPassword" && oobCode) {
      verifyPasswordResetCode(auth, oobCode)
        .then((resolvedEmail) => setEmail(resolvedEmail))
        .catch(() => {
          setStatus("error");
          setError(t("authAction.invalidLink"));
        });
    }
  }, [mode, oobCode, t]);

  if (!mode || !oobCode) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <p className="text-lg font-medium">{t("authAction.invalidLink")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleVerifyEmail = async () => {
    setStatus("loading");
    setError(null);
    try {
      await applyActionCode(auth, oobCode);
      setStatus("success");
      // Redirect after a short delay
      setTimeout(() => {
        if (continueUrl) {
          window.location.href = continueUrl;
        } else {
          navigate("/login", { replace: true });
        }
      }, 2000);
    } catch {
      setStatus("error");
      setError(t("authAction.verifyEmail.error"));
    }
  };

  const handleRecoverEmail = async () => {
    setStatus("loading");
    setError(null);
    try {
      await applyActionCode(auth, oobCode);
      setStatus("success");
    } catch {
      setStatus("error");
      setError(t("authAction.recoverEmail.error"));
    }
  };

  const handleResetPassword = async () => {
    setError(null);
    if (newPassword.length < 6) {
      setError(t("errors.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError(t("errors.passwordsDontMatch"));
      return;
    }
    setStatus("loading");
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setStatus("success");
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2000);
    } catch {
      setStatus("error");
      setError(t("authAction.resetPassword.error"));
    }
  };

  if (mode === "verifyEmail") {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {status === "success" ? (
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              ) : (
                <Mail className="h-16 w-16 text-muted-foreground" />
              )}
            </div>
            <CardTitle>{t("authAction.verifyEmail.title")}</CardTitle>
            <CardDescription>
              {status === "success"
                ? t("authAction.verifyEmail.success")
                : t("authAction.verifyEmail.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {status !== "success" && (
              <Button
                onClick={handleVerifyEmail}
                className="w-full"
                disabled={status === "loading"}
              >
                {status === "loading" && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("authAction.verifyEmail.button")}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === "resetPassword") {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {status === "success" ? (
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              ) : (
                <KeyRound className="h-16 w-16 text-muted-foreground" />
              )}
            </div>
            <CardTitle>{t("authAction.resetPassword.title")}</CardTitle>
            <CardDescription>
              {status === "success"
                ? t("authAction.resetPassword.success")
                : email
                  ? t("authAction.resetPassword.description", { email })
                  : t("authAction.resetPassword.description", { email: "" })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {status !== "success" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">
                    {t("authAction.resetPassword.newPasswordLabel")}
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t(
                      "authAction.resetPassword.newPasswordPlaceholder",
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmNewPassword">
                    {t("authAction.resetPassword.confirmPasswordLabel")}
                  </Label>
                  <Input
                    id="confirmNewPassword"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder={t(
                      "authAction.resetPassword.confirmPasswordPlaceholder",
                    )}
                  />
                </div>
                <Button
                  onClick={handleResetPassword}
                  className="w-full"
                  disabled={status === "loading" || status === "error"}
                >
                  {status === "loading" && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {t("authAction.resetPassword.button")}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === "recoverEmail") {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {status === "success" ? (
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              ) : (
                <ShieldCheck className="h-16 w-16 text-muted-foreground" />
              )}
            </div>
            <CardTitle>{t("authAction.recoverEmail.title")}</CardTitle>
            <CardDescription>
              {status === "success"
                ? t("authAction.recoverEmail.success")
                : t("authAction.recoverEmail.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {status !== "success" && (
              <Button
                onClick={handleRecoverEmail}
                className="w-full"
                disabled={status === "loading"}
              >
                {status === "loading" && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("authAction.recoverEmail.button")}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Unknown mode
  return (
    <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <p className="text-lg font-medium">{t("authAction.invalidLink")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
