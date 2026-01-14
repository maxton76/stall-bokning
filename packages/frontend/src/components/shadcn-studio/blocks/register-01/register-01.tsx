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
import RegisterForm from "@/components/shadcn-studio/blocks/register-01/register-form";

const Register = () => {
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
          // User has a profile, go to dashboard
          navigate("/dashboard");
        }
      } else {
        navigate("/dashboard");
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
      <div className="absolute z-0">
        <AuthBackgroundShape />
      </div>

      <Card className="z-10 w-full border-none shadow-md sm:max-w-lg">
        <CardHeader className="gap-6">
          <Logo className="gap-3" />

          <div>
            <CardTitle className="mb-1.5 text-2xl">Join StableBook</CardTitle>
            <CardDescription className="text-base">
              Start managing your stable bookings today
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {/* Register Form */}
          <div className="space-y-4">
            <RegisterForm />

            <p className="text-muted-foreground text-center">
              Already have an account?{" "}
              <a href="/login" className="text-card-foreground hover:underline">
                Sign in instead
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

export default Register;
