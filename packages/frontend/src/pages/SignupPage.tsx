import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { acceptOrganizationInvite } from "@/services/inviteService";

export default function SignupPage() {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError(t("errors.passwordsDontMatch"));
      return;
    }

    if (formData.password.length < 6) {
      setError(t("errors.passwordTooShort"));
      return;
    }

    if (!formData.email || !formData.firstName || !formData.lastName) {
      setError(t("errors.emailAndPasswordRequired"));
      return;
    }

    try {
      setLoading(true);

      // Step 1: Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password,
      );

      // Step 2: Call backend to create Firestore user document and migrate invites
      const token = await userCredential.user.getIdToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/auth/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            systemRole: "stable_user",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(t("errors.registrationFailed"));
      }

      // Step 3: If there's an invite token, accept it
      if (inviteToken) {
        try {
          await acceptOrganizationInvite(inviteToken);
          alert(t("success.accountCreated"));
          navigate("/organizations");
        } catch (inviteError: any) {
          // Signup succeeded but invite acceptance failed
          console.error("Failed to accept invite:", inviteError);
          alert(t("success.accountCreated"));
          navigate("/organizations");
        }
      } else {
        alert(t("success.accountCreated"));
        navigate("/horses");
      }
    } catch (err: any) {
      console.error("Signup error:", err);

      if (err.code === "auth/email-already-in-use") {
        setError(t("errors.emailInUse"));
      } else if (err.code === "auth/invalid-email") {
        setError(t("errors.invalidCredentials"));
      } else if (err.code === "auth/weak-password") {
        setError(t("errors.weakPassword"));
      } else {
        setError(err.message || t("errors.registrationFailed"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("register.title")}</CardTitle>
          <CardDescription>
            {inviteToken
              ? t("completeProfile.subtitle")
              : t("register.subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="text-sm font-medium">
                {t("register.emailLabel")}
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder={t("register.emailPlaceholder")}
              />
            </div>

            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="text-sm font-medium">
                {t("register.firstNameLabel")}
              </label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                required
                placeholder={t("register.firstNamePlaceholder")}
              />
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="text-sm font-medium">
                {t("register.lastNameLabel")}
              </label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                required
                placeholder={t("register.lastNamePlaceholder")}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="text-sm font-medium">
                {t("register.passwordLabel")}
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder={t("register.passwordPlaceholder")}
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                {t("register.confirmPasswordLabel")}
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder={t("register.confirmPasswordPlaceholder")}
              />
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("register.creatingAccount")}
                </>
              ) : (
                t("register.createAccount")
              )}
            </Button>

            {/* Login Link */}
            <p className="text-center text-sm text-muted-foreground">
              {t("register.alreadyHaveAccount")}{" "}
              <Link to="/login" className="text-primary hover:underline">
                {t("register.signIn")}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
