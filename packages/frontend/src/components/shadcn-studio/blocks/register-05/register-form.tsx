import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { ArrowLeft, Building2, EyeIcon, EyeOffIcon, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerUser } from "@/services/userService";
import { useToast } from "@/hooks/use-toast";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

type AccountType = "personal" | "business";

const RegisterForm = () => {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setCurrentOrganizationId } = useOrganizationContext();

  const [step, setStep] = useState<1 | 2>(1);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreedToTerms: false,
    organizationName: "",
    contactEmail: "",
    phoneNumber: "",
  });

  const handleSelectType = (type: AccountType) => {
    setAccountType(type);
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.firstName.trim()) {
      toast({
        title: t("errors.registrationFailed"),
        description: t("errors.firstNameRequired"),
        variant: "destructive",
      });
      return;
    }

    if (!formData.lastName.trim()) {
      toast({
        title: t("errors.registrationFailed"),
        description: t("errors.lastNameRequired"),
        variant: "destructive",
      });
      return;
    }

    if (!formData.email.trim()) {
      toast({
        title: t("errors.registrationFailed"),
        description: t("errors.emailRequired"),
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: t("errors.registrationFailed"),
        description: t("errors.passwordTooShort"),
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: t("errors.registrationFailed"),
        description: t("errors.passwordsDontMatch"),
        variant: "destructive",
      });
      return;
    }

    if (!formData.agreedToTerms) {
      toast({
        title: t("errors.registrationFailed"),
        description: t("errors.mustAgreeToTerms"),
        variant: "destructive",
      });
      return;
    }

    if (accountType === "business" && !formData.organizationName.trim()) {
      toast({
        title: t("errors.registrationFailed"),
        description: t("errors.organizationNameRequired"),
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      await registerUser({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        organizationType: accountType || "personal",
        organizationName:
          accountType === "business" ? formData.organizationName : undefined,
        contactEmail:
          accountType === "business" && formData.contactEmail.trim()
            ? formData.contactEmail
            : undefined,
        phoneNumber:
          accountType === "business" && formData.phoneNumber.trim()
            ? formData.phoneNumber
            : undefined,
      });

      toast({
        title: t("success.accountCreated"),
        description: t("success.checkEmailForVerification"),
      });

      navigate("/verify-email");
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: t("errors.registrationFailed"),
        description:
          error instanceof Error
            ? error.message
            : t("errors.registrationFailed"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Account type selection
  if (step === 1) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-medium">
            {t("register.organizationType.label")}
          </h3>
          <p className="text-muted-foreground text-sm">
            {t("register.organizationType.description")}
          </p>
        </div>

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => handleSelectType("personal")}
            className="border-border hover:border-primary hover:bg-primary/5 flex items-start gap-4 rounded-lg border p-4 text-left transition-colors"
          >
            <div className="bg-primary/10 text-primary mt-0.5 rounded-lg p-2">
              <User className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-medium">
                {t("register.organizationType.personal.title")}
              </div>
              <div className="text-muted-foreground mt-1 text-sm">
                {t("register.organizationType.personal.description")}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelectType("business")}
            className="border-border hover:border-primary hover:bg-primary/5 flex items-start gap-4 rounded-lg border p-4 text-left transition-colors"
          >
            <div className="bg-primary/10 text-primary mt-0.5 rounded-lg p-2">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-medium">
                {t("register.organizationType.business.title")}
              </div>
              <div className="text-muted-foreground mt-1 text-sm">
                {t("register.organizationType.business.description")}
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Registration form
  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {/* Back button and step indicator */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("register.back")}
        </button>
        <span className="text-muted-foreground text-sm">
          {t("register.step", { current: 2, total: 2 })}
        </span>
      </div>

      {/* First Name */}
      <div className="space-y-2">
        <Label htmlFor="firstName">{t("register.firstNameLabel")}</Label>
        <Input
          type="text"
          id="firstName"
          autoComplete="given-name"
          placeholder={t("register.firstNamePlaceholder")}
          value={formData.firstName}
          onChange={(e) =>
            setFormData({ ...formData, firstName: e.target.value })
          }
          disabled={isLoading}
        />
      </div>

      {/* Last Name */}
      <div className="space-y-2">
        <Label htmlFor="lastName">{t("register.lastNameLabel")}</Label>
        <Input
          type="text"
          id="lastName"
          autoComplete="family-name"
          placeholder={t("register.lastNamePlaceholder")}
          value={formData.lastName}
          onChange={(e) =>
            setFormData({ ...formData, lastName: e.target.value })
          }
          disabled={isLoading}
        />
      </div>

      {/* Business fields */}
      {accountType === "business" && (
        <div className="bg-muted/50 space-y-3 rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">
              {t("register.organizationDetails.title")}
            </p>
            <p className="text-muted-foreground text-xs">
              {t("register.organizationDetails.subtitle")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="organizationName">
              {t("register.organizationDetails.organizationName.label")}
            </Label>
            <Input
              type="text"
              id="organizationName"
              placeholder={t(
                "register.organizationDetails.organizationName.placeholder",
              )}
              value={formData.organizationName}
              onChange={(e) =>
                setFormData({ ...formData, organizationName: e.target.value })
              }
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail">
              {t("register.organizationDetails.contactEmail.label")}
            </Label>
            <Input
              type="email"
              id="contactEmail"
              placeholder={t(
                "register.organizationDetails.contactEmail.placeholder",
              )}
              value={formData.contactEmail}
              onChange={(e) =>
                setFormData({ ...formData, contactEmail: e.target.value })
              }
              disabled={isLoading}
            />
            <p className="text-muted-foreground text-xs">
              {t("register.organizationDetails.contactEmail.hint")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">
              {t("register.organizationDetails.phoneNumber.label")}
            </Label>
            <Input
              type="tel"
              id="phoneNumber"
              placeholder={t(
                "register.organizationDetails.phoneNumber.placeholder",
              )}
              value={formData.phoneNumber}
              onChange={(e) =>
                setFormData({ ...formData, phoneNumber: e.target.value })
              }
              disabled={isLoading}
            />
          </div>
        </div>
      )}

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="userEmail">{t("register.emailLabel")}</Label>
        <Input
          type="email"
          id="userEmail"
          autoComplete="email"
          placeholder={t("register.emailPlaceholder")}
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          disabled={isLoading}
        />
      </div>

      {/* Password */}
      <div className="w-full space-y-2">
        <Label htmlFor="password">{t("register.passwordLabel")}</Label>
        <div className="relative">
          <Input
            id="password"
            type={isPasswordVisible ? "text" : "password"}
            autoComplete="new-password"
            placeholder={t("register.passwordPlaceholder")}
            className="pr-9"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            disabled={isLoading}
          />
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => setIsPasswordVisible((prevState) => !prevState)}
            className="text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent"
            disabled={isLoading}
          >
            {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
            <span className="sr-only">
              {isPasswordVisible
                ? t("login.hidePassword")
                : t("login.showPassword")}
            </span>
          </Button>
        </div>
      </div>

      {/* Confirm Password */}
      <div className="w-full space-y-2">
        <Label htmlFor="confirmPassword">
          {t("register.confirmPasswordLabel")}
        </Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={isConfirmPasswordVisible ? "text" : "password"}
            autoComplete="new-password"
            placeholder={t("register.confirmPasswordPlaceholder")}
            className="pr-9"
            value={formData.confirmPassword}
            onChange={(e) =>
              setFormData({ ...formData, confirmPassword: e.target.value })
            }
            disabled={isLoading}
          />
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() =>
              setIsConfirmPasswordVisible((prevState) => !prevState)
            }
            className="text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent"
            disabled={isLoading}
          >
            {isConfirmPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
            <span className="sr-only">
              {isConfirmPasswordVisible
                ? t("login.hidePassword")
                : t("login.showPassword")}
            </span>
          </Button>
        </div>
      </div>

      {/* Privacy policy */}
      <div className="flex items-start gap-2">
        <Checkbox
          id="agreedToTerms"
          className="mt-1"
          checked={formData.agreedToTerms}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, agreedToTerms: checked === true })
          }
          disabled={isLoading}
        />
        <Label htmlFor="agreedToTerms" className="text-sm font-normal">
          <span className="text-muted-foreground">
            {t("register.agreeToTerms")}
          </span>{" "}
          <a
            href="https://equiduty.se/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {t("register.privacyPolicy")}
          </a>
          <span className="text-muted-foreground"> {t("register.and")} </span>
          <a
            href="https://equiduty.se/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {t("register.termsOfService")}
          </a>
        </Label>
      </div>

      <Button className="w-full" type="submit" disabled={isLoading}>
        {isLoading
          ? t("register.creatingAccount")
          : t("register.createAccount")}
      </Button>
    </form>
  );
};

export default RegisterForm;
