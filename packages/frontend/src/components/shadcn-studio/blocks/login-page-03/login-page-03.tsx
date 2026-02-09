import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Chrome } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";

import Logo from "@/components/shadcn-studio/logo";
import LoginForm from "@/components/shadcn-studio/blocks/login-page-03/login-form";

const Login = () => {
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
        title: t("errors.loginFailed"),
        description:
          error instanceof Error ? error.message : t("errors.loginFailed"),
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left Column - Login Form */}
      <div className="flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="flex justify-center lg:justify-start">
            <Logo className="gap-3" />
          </div>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {t("login.title")}
            </h1>
            <p className="text-muted-foreground">{t("login.subtitle")}</p>
          </div>

          {/* Social Login */}
          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
            >
              <Chrome className="mr-2 h-4 w-4" />
              {googleLoading
                ? t("login.signingIn")
                : t("login.continueWithGoogle")}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {t("login.or")}
                </span>
              </div>
            </div>
          </div>

          {/* Login Form */}
          <LoginForm />

          {/* Sign Up Link */}
          <p className="text-center text-sm text-muted-foreground">
            {t("login.noAccount")}{" "}
            <a
              href="/register"
              className="font-medium text-primary hover:underline"
            >
              {t("login.signUp")}
            </a>
          </p>
        </div>
      </div>

      {/* Right Column - Testimonial */}
      <div className="hidden bg-muted lg:flex lg:items-center lg:justify-center lg:p-12">
        <Card className="max-w-md border-none bg-card/50 shadow-lg backdrop-blur">
          <CardContent className="space-y-6 p-8">
            {/* Quote */}
            <div className="space-y-4">
              <p className="text-lg leading-relaxed">
                "{t("login.testimonial.quote")}"
              </p>
            </div>

            {/* Author */}
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage
                  src="https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png"
                  alt={t("login.testimonial.author")}
                />
                <AvatarFallback>AS</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{t("login.testimonial.author")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("login.testimonial.role")}
                </p>
              </div>
            </div>

            {/* Additional User Avatars */}
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                <Avatar className="h-8 w-8 border-2 border-background">
                  <AvatarImage
                    src="https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png"
                    alt="User 1"
                  />
                  <AvatarFallback>U1</AvatarFallback>
                </Avatar>
                <Avatar className="h-8 w-8 border-2 border-background">
                  <AvatarImage
                    src="https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-2.png"
                    alt="User 2"
                  />
                  <AvatarFallback>U2</AvatarFallback>
                </Avatar>
                <Avatar className="h-8 w-8 border-2 border-background">
                  <AvatarImage
                    src="https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png"
                    alt="User 3"
                  />
                  <AvatarFallback>U3</AvatarFallback>
                </Avatar>
                <Avatar className="h-8 w-8 border-2 border-background">
                  <AvatarImage
                    src="https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-4.png"
                    alt="User 4"
                  />
                  <AvatarFallback>U4</AvatarFallback>
                </Avatar>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("login.testimonial.trustedBy")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
