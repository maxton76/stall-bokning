import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { EyeIcon, EyeOffIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerUser } from "@/services/userService";
import { useToast } from "@/hooks/use-toast";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

const RegisterForm = () => {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setCurrentOrganizationId } = useOrganizationContext();

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
  });

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

    try {
      setIsLoading(true);

      const organizationId = await registerUser({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });

      // Set the new organization as current
      setCurrentOrganizationId(organizationId);

      toast({
        title: t("success.accountCreated"),
        description: t("success.accountCreated"),
      });

      // Navigate to horses page (user is already logged in after registration)
      navigate("/horses");
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

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {/* First Name */}
      <div className="space-y-1">
        <Label className="leading-5" htmlFor="firstName">
          {t("register.firstNameLabel")}
        </Label>
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
      <div className="space-y-1">
        <Label className="leading-5" htmlFor="lastName">
          {t("register.lastNameLabel")}
        </Label>
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

      {/* Email */}
      <div className="space-y-1">
        <Label className="leading-5" htmlFor="userEmail">
          {t("register.emailLabel")}
        </Label>
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
      <div className="w-full space-y-1">
        <Label className="leading-5" htmlFor="password">
          {t("register.passwordLabel")}
        </Label>
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
      <div className="w-full space-y-1">
        <Label className="leading-5" htmlFor="confirmPassword">
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
      <div className="flex items-center gap-3">
        <Checkbox
          id="agreedToTerms"
          className="size-6"
          checked={formData.agreedToTerms}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, agreedToTerms: checked === true })
          }
          disabled={isLoading}
        />
        <Label htmlFor="agreedToTerms">
          <span className="text-muted-foreground">
            {t("register.agreeToTerms")}
          </span>{" "}
          <a href="#">{t("register.termsOfService")}</a>
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
