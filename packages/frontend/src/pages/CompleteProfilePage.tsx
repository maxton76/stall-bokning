import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
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

export default function CompleteProfilePage() {
  const { t } = useTranslation("auth");
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Pre-fill name from Google if available
    if (user?.displayName) {
      const nameParts = user.displayName.split(" ");
      setFormData((prev) => ({
        ...prev,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
      }));
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.firstName || !formData.lastName) {
      setError(t("completeProfile.requiredFields"));
      return;
    }

    if (!user) {
      setError(t("completeProfile.notAuthenticated"));
      return;
    }

    try {
      setLoading(true);

      // Call backend to create Firestore user document
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error(t("completeProfile.notAuthenticated"));
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/auth/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: user.email!,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phoneNumber: formData.phoneNumber || undefined,
            systemRole: "stable_user",
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t("completeProfile.failed"));
      }

      // Refresh user profile in AuthContext
      await refreshProfile();

      // If invite token, accept the invite and go to organizations
      if (inviteToken) {
        try {
          await acceptOrganizationInvite(inviteToken);
        } catch (inviteErr) {
          console.error("Failed to accept invite:", inviteErr);
        }
        navigate("/organizations");
      } else {
        navigate("/horses");
      }
    } catch (err: any) {
      console.error("Profile completion error:", err);
      setError(err.message || t("completeProfile.failed"));
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("completeProfile.title")}</CardTitle>
          <CardDescription>{t("completeProfile.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email (read-only) */}
            <div>
              <label htmlFor="email" className="text-sm font-medium">
                {t("completeProfile.emailLabel")}
              </label>
              <Input
                id="email"
                type="email"
                value={user.email || ""}
                disabled
                className="bg-muted"
              />
            </div>

            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="text-sm font-medium">
                {t("completeProfile.firstNameLabel")}{" "}
                <span className="text-destructive">*</span>
              </label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="text-sm font-medium">
                {t("completeProfile.lastNameLabel")}{" "}
                <span className="text-destructive">*</span>
              </label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>

            {/* Phone Number (optional) */}
            <div>
              <label htmlFor="phoneNumber" className="text-sm font-medium">
                {t("completeProfile.phoneLabel")}
              </label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder={t("completeProfile.phonePlaceholder")}
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
                  {t("completeProfile.submitting")}
                </>
              ) : (
                t("completeProfile.submit")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
