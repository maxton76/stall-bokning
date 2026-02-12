import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Loader2, Users, Building2 } from "lucide-react";
import {
  acceptOrganizationInvite,
  getInviteDetails,
} from "@/services/inviteService";

export default function SignupPage() {
  const { t } = useTranslation(["auth", "organizations"]);
  const { signInWithGoogle } = useAuth();
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

  // Organization type selection (only for new registrations without invite)
  const [organizationType, setOrganizationType] = useState<
    "personal" | "business"
  >("personal");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invite details state
  const [inviteDetails, setInviteDetails] = useState<{
    organizationName: string;
    inviterName: string;
    roles: string[];
    email: string;
    firstName?: string;
    lastName?: string;
  } | null>(null);

  const [loadingInvite, setLoadingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Fetch invite details on mount if invite token exists
  useEffect(() => {
    if (inviteToken) {
      fetchInviteDetails();
    }
  }, [inviteToken]);

  const fetchInviteDetails = async () => {
    try {
      setLoadingInvite(true);
      const details = await getInviteDetails(inviteToken!);

      setInviteDetails(details);

      // Pre-fill form with invite data
      setFormData((prev) => ({
        ...prev,
        email: details.email,
        firstName: details.firstName || "",
        lastName: details.lastName || "",
      }));
    } catch (err: any) {
      setInviteError(err.message || t("register.loadingInviteFailed"));
    } finally {
      setLoadingInvite(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      await signInWithGoogle();

      // Check if user already has a profile
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error(t("errors.registrationFailed"));
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/auth/me`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.status === 404) {
        // No profile yet — redirect to complete profile with invite token
        const params = inviteToken ? `?invite=${inviteToken}` : "";
        navigate(`/complete-profile${params}`);
      } else if (!response.ok) {
        // Non-404 error (500, network issue, etc.)
        throw new Error(t("errors.registrationFailed"));
      } else {
        // Profile exists — accept invite directly if present
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
      }
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      // Don't show error if user cancelled the popup
      if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message || t("errors.registrationFailed"));
      }
    } finally {
      setGoogleLoading(false);
    }
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

      // Step 1.5: Send verification email
      await sendEmailVerification(userCredential.user);

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
            // Only include organization type if not accepting an invite
            ...(inviteToken ? {} : { organizationType }),
          }),
        },
      );

      if (!response.ok) {
        throw new Error(t("errors.registrationFailed"));
      }

      // Step 3: If there's an invite token, accept it, then redirect to verify-email
      if (inviteToken) {
        try {
          await acceptOrganizationInvite(inviteToken);
        } catch (inviteError: any) {
          // Signup succeeded but invite acceptance failed
          console.error("Failed to accept invite:", inviteError);
        }
        navigate(`/verify-email?invite=${inviteToken}`);
      } else {
        navigate("/verify-email");
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
          {/* Loading state for invite */}
          {loadingInvite ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">{t("register.loadingInvite")}</span>
            </div>
          ) : null}

          {/* Invite error state */}
          {inviteError && !loadingInvite ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                {inviteError}
                <p className="mt-2 text-sm">
                  {t("register.continueWithoutInvite")}
                </p>
              </AlertDescription>
            </Alert>
          ) : null}

          {/* Invitation context display */}
          {inviteDetails && !loadingInvite ? (
            <Alert className="mb-4 bg-blue-50 border-blue-200">
              <AlertDescription className="text-sm">
                <p className="font-semibold mb-1">
                  {t("register.invitationFrom", {
                    organization: inviteDetails.organizationName,
                  })}
                </p>
                <p className="text-muted-foreground">
                  {t("register.invitedBy", {
                    name: inviteDetails.inviterName,
                  })}
                </p>
                <p className="text-muted-foreground mt-1">
                  {t("register.roles")}: {inviteDetails.roles.join(", ")}
                </p>
              </AlertDescription>
            </Alert>
          ) : null}

          {/* Google Sign-up */}
          {!loadingInvite && (
            <div className="space-y-4 mb-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={loadingInvite || googleLoading}
              >
                {googleLoading
                  ? t("register.signingUp")
                  : t("register.continueWithGoogle")}
              </Button>

              <div className="flex items-center gap-4">
                <Separator className="flex-1" />
                <p className="text-muted-foreground text-sm">
                  {t("register.or")}
                </p>
                <Separator className="flex-1" />
              </div>
            </div>
          )}

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
                disabled={!!inviteDetails}
                className={inviteDetails ? "bg-muted cursor-not-allowed" : ""}
              />
              {inviteDetails && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t("register.emailFromInvite")}
                </p>
              )}
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
                {t("auth:register.lastNameLabel")}
              </label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                required
                placeholder={t("auth:register.lastNamePlaceholder")}
              />
            </div>

            {/* Organization Type - Only show when NOT accepting an invite */}
            {!inviteToken && (
              <div className="space-y-3 pt-2">
                <Label>{t("auth:register.organizationType.label")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("auth:register.organizationType.description")}
                </p>
                <RadioGroup
                  value={organizationType}
                  onValueChange={(v) =>
                    setOrganizationType(v as "personal" | "business")
                  }
                  className="grid grid-cols-1 gap-3"
                >
                  <div className="flex items-start space-x-3 p-3 border rounded-md hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem
                      value="personal"
                      id="org-personal"
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor="org-personal"
                        className="font-medium cursor-pointer flex items-center gap-2"
                      >
                        <Users className="h-4 w-4" />
                        {t("auth:register.organizationType.personal.title")}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {t(
                          "auth:register.organizationType.personal.description",
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 border rounded-md hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem
                      value="business"
                      id="org-business"
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor="org-business"
                        className="font-medium cursor-pointer flex items-center gap-2"
                      >
                        <Building2 className="h-4 w-4" />
                        {t("auth:register.organizationType.business.title")}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {t(
                          "auth:register.organizationType.business.description",
                        )}
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            )}

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
