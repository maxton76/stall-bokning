import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { createStable } from "@/services/stableService";

export default function CreateStablePage() {
  const { t } = useTranslation(["stables", "common"]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();
  const [searchParams] = useSearchParams();
  // Prefer organization from context, fallback to URL params for compatibility
  const organizationId =
    currentOrganizationId || searchParams.get("organizationId");

  console.log("🏗️ CreateStablePage mounted:", {
    currentOrganizationId,
    urlOrganizationId: searchParams.get("organizationId"),
    finalOrganizationId: organizationId,
    userId: user?.uid,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    postalCode: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🚀 CreateStablePage: Form submitted");

    if (!user) {
      console.error("❌ CreateStablePage: No user authenticated");
      return;
    }

    console.log("👤 CreateStablePage: User authenticated:", user.uid);
    console.log("🏢 CreateStablePage: Organization ID:", organizationId);

    // Validate that we have an organization ID
    if (!organizationId) {
      const errorMsg = t("stables:messages.noOrganization");
      console.error("❌ CreateStablePage:", errorMsg);
      alert(errorMsg);
      return;
    }

    setIsLoading(true);

    try {
      console.log(
        "🏗️ CreateStablePage: Creating stable with organization:",
        organizationId,
      );

      // Create stable - organizationId is now always required
      const stableData = {
        name: formData.name,
        description: formData.description,
        address: `${formData.address}, ${formData.city} ${formData.postalCode}`,
        ownerId: user.uid,
        ownerEmail: user.email || undefined,
        organizationId, // Always include organizationId
      };

      console.log("📋 CreateStablePage: Stable data:", stableData);

      const stableId = await createStable(user.uid, stableData);
      console.log("✅ Stable created with ID:", stableId);

      // Navigate to the new stable's detail page
      navigate(`/stables/${stableId}`);
    } catch (error) {
      console.error("❌ Error creating stable:", error);
      alert(t("stables:messages.createFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/stables")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("common:navigation.stables")}
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("stables:form.title.create")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("stables:form.description.create")}
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t("stables:form.sections.basicInfo")}</CardTitle>
          <CardDescription>
            {t("stables:form.description.create")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Stable Name */}
            <div className="space-y-2">
              <Label htmlFor="name">{t("stables:form.labels.name")} *</Label>
              <Input
                id="name"
                name="name"
                placeholder={t("stables:form.placeholders.name")}
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                {t("stables:form.labels.description")}
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder={t("stables:form.placeholders.description")}
                value={formData.description}
                onChange={handleChange}
                rows={4}
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">
                {t("stables:form.labels.address")} *
              </Label>
              <Input
                id="address"
                name="address"
                placeholder={t("stables:form.placeholders.address")}
                value={formData.address}
                onChange={handleChange}
                required
              />
            </div>

            {/* City and Postal Code */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">{t("stables:form.labels.city")} *</Label>
                <Input
                  id="city"
                  name="city"
                  placeholder={t("stables:form.placeholders.city")}
                  value={formData.city}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">
                  {t("stables:form.labels.postalCode")} *
                </Label>
                <Input
                  id="postalCode"
                  name="postalCode"
                  placeholder={t("stables:form.placeholders.postalCode")}
                  value={formData.postalCode}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("common:labels.loading")}
                  </>
                ) : (
                  t("stables:actions.createStable")
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/stables")}
                disabled={isLoading}
              >
                {t("common:buttons.cancel")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
