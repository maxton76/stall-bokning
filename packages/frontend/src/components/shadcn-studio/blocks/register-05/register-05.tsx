import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";

import Logo from "@/components/shadcn-studio/logo";
import AuthLines from "@/assets/svg/auth-lines";
import RegisterForm from "@/components/shadcn-studio/blocks/register-05/register-form";

const Register = () => {
  const { t } = useTranslation("auth");
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();

      // Check if user has a complete profile
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/v1/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (response.status === 404) {
          // User doesn't have a profile yet, redirect to complete it
          navigate("/complete-profile");
        } else {
          // User has a profile, go to horses page
          navigate("/horses");
        }
      } else {
        navigate("/horses");
      }
    } catch (error) {
      console.error("Google sign in error:", error);
      toast({
        title: t("errors.registrationFailed"),
        description:
          error instanceof Error
            ? error.message
            : t("errors.registrationFailed"),
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="bg-muted flex h-auto min-h-screen items-center justify-center px-4 py-10 sm:px-6 sm:py-16 lg:px-8 lg:py-24">
      <Card className="relative w-full max-w-md overflow-hidden border-none pt-12 shadow-lg">
        {/* Gradient Overlay */}
        <div className="to-primary/10 pointer-events-none absolute top-0 h-52 w-full rounded-t-xl bg-gradient-to-t from-transparent"></div>

        {/* Decorative Lines */}
        <AuthLines className="pointer-events-none absolute inset-x-0 top-0" />

        <CardHeader className="justify-center gap-6 text-center">
          <Logo className="justify-center gap-3" />

          <div>
            <CardTitle className="mb-1.5 text-2xl">
              {t("register.title")}
            </CardTitle>
            <CardDescription className="text-base">
              {t("register.subtitle")}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {/* Social Sign Up Button */}
          <div className="mb-6">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              aria-label={t("register.continueWithGoogle")}
            >
              <img
                src="https://cdn.shadcnstudio.com/ss-assets/brand-logo/google-icon.png"
                alt={t("register.continueWithGoogle")}
                className="size-5 mr-2"
              />
              {t("register.continueWithGoogle")}
            </Button>
          </div>

          {/* Divider */}
          <div className="mb-6 flex items-center gap-4">
            <Separator className="flex-1" />
            <p>{t("register.or")}</p>
            <Separator className="flex-1" />
          </div>

          {/* Registration Form */}
          <RegisterForm />

          {/* Sign In Link */}
          <p className="text-muted-foreground mt-4 text-center">
            {t("register.alreadyHaveAccount")}{" "}
            <a href="/login" className="text-card-foreground hover:underline">
              {t("register.signIn")}
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
