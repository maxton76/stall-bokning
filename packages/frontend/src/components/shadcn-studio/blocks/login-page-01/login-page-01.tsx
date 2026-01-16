import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import AuthBackgroundShape from "@/assets/svg/auth-background-shape";
import LoginForm from "@/components/shadcn-studio/blocks/login-page-01/login-form";

const Login = () => {
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [quickLoginCredentials, setQuickLoginCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleQuickLogin = (type: "user" | "admin") => {
    if (type === "admin") {
      setQuickLoginCredentials({
        email: "maxkrax@gmail.com",
        password: "Admin123!",
      });
    } else {
      // For demo purposes, you can add a test user here
      setQuickLoginCredentials({
        email: "user@example.com",
        password: "User123!",
      });
    }
  };

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
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to sign in with Google",
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="relative flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8">
      <div className="absolute pointer-events-none">
        <AuthBackgroundShape />
      </div>

      <Card className="relative z-10 w-full border-none shadow-md sm:max-w-lg">
        <CardHeader className="gap-6">
          <Logo className="gap-3" />

          <div>
            <CardTitle className="mb-1.5 text-2xl">
              Sign in to StableBook
            </CardTitle>
            <CardDescription className="text-base">
              Manage your stable bookings with ease
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <p className="text-muted-foreground mb-6">
            Quick login for testing{" "}
            <span className="text-card-foreground text-xs">(Demo only)</span>
          </p>

          {/* Quick Login Buttons */}
          <div className="mb-6 flex flex-wrap gap-4 sm:gap-6">
            <Button
              variant="outline"
              className="grow"
              onClick={() => handleQuickLogin("user")}
            >
              Login as User
            </Button>
            <Button
              variant="outline"
              className="grow"
              onClick={() => handleQuickLogin("admin")}
            >
              Login as Admin
            </Button>
          </div>

          {/* Login Form */}
          <div className="space-y-4">
            <LoginForm
              email={quickLoginCredentials?.email}
              password={quickLoginCredentials?.password}
            />

            <p className="text-muted-foreground text-center">
              New to StableBook?{" "}
              <a
                href="/register"
                className="text-card-foreground hover:underline"
              >
                Create an account
              </a>
            </p>

            <div className="flex items-center gap-4">
              <Separator className="flex-1" />
              <p>or</p>
              <Separator className="flex-1" />
            </div>

            <Button
              variant="ghost"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
            >
              {googleLoading ? "Signing in..." : "Sign in with Google"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
