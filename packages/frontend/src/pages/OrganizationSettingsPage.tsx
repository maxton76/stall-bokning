import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import {
  getOrganization,
  updateOrganization,
} from "@/services/organizationService";
import { useToast } from "@/hooks/use-toast";

const organizationSettingsSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  contactType: z.enum(["Personal", "Business"]),
  primaryEmail: z.string().email("Invalid email"),
  phoneNumber: z.string().optional(),
  timezone: z.string().default("Europe/Stockholm"),
});

type OrganizationSettingsFormData = z.infer<typeof organizationSettingsSchema>;

export default function OrganizationSettingsPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Organization data
  const organization = useAsyncData({
    loadFn: async () => {
      if (!organizationId) return null;
      return await getOrganization(organizationId);
    },
  });

  // Load organization when organizationId changes
  useEffect(() => {
    organization.load();
  }, [organizationId]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<OrganizationSettingsFormData>({
    resolver: zodResolver(organizationSettingsSchema as any) as any,
    defaultValues: {
      name: "",
      description: "",
      contactType: "Personal",
      primaryEmail: "",
      phoneNumber: "",
      timezone: "Europe/Stockholm",
    },
    values: organization.data
      ? {
          name: organization.data.name,
          description: organization.data.description || "",
          contactType: organization.data.contactType,
          primaryEmail: organization.data.primaryEmail,
          phoneNumber: organization.data.phoneNumber || "",
          timezone: organization.data.timezone,
        }
      : undefined,
  });

  const contactType = watch("contactType");

  const onSubmit = async (data: OrganizationSettingsFormData) => {
    if (!organizationId || !user) return;

    setLoading(true);
    try {
      await updateOrganization(organizationId, user.uid, data);
      await organization.reload();
      toast({
        title: "Settings updated",
        description: "Organization settings have been saved successfully.",
      });
    } catch (error) {
      console.error("Failed to update organization:", error);
      toast({
        title: "Error",
        description: "Failed to update organization settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (organization.loading || !organization.data) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        {organizationId && (
          <Link to={`/organizations/${organizationId}`}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Organization
            </Button>
          </Link>
        )}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Organization Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your organization configuration
          </p>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="stables">Stables</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <form onSubmit={handleSubmit(onSubmit as any)}>
            <Card>
              <CardHeader>
                <CardTitle>General Information</CardTitle>
                <CardDescription>
                  Basic information about your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Organization Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Organization Name{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="My Stable Organization"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of your organization"
                    rows={3}
                    {...register("description")}
                  />
                </div>

                {/* Contact Type */}
                <div className="space-y-2">
                  <Label>Contact Type</Label>
                  <RadioGroup
                    value={contactType}
                    onValueChange={(value) =>
                      setValue("contactType", value as "Personal" | "Business")
                    }
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Personal" id="personal" />
                      <Label htmlFor="personal" className="font-normal">
                        Personal
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Business" id="business" />
                      <Label htmlFor="business" className="font-normal">
                        Business
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Primary Email */}
                <div className="space-y-2">
                  <Label htmlFor="primaryEmail">
                    Primary Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="primaryEmail"
                    type="email"
                    placeholder="contact@organization.com"
                    {...register("primaryEmail")}
                  />
                  {errors.primaryEmail && (
                    <p className="text-sm text-destructive">
                      {errors.primaryEmail.message}
                    </p>
                  )}
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="+46 70 123 45 67"
                    {...register("phoneNumber")}
                  />
                </div>

                {/* Timezone */}
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    placeholder="Europe/Stockholm"
                    {...register("timezone")}
                  />
                  <p className="text-xs text-muted-foreground">
                    IANA timezone identifier (e.g., Europe/Stockholm,
                    America/New_York)
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => reset()}
                    disabled={loading}
                  >
                    Reset
                  </Button>
                  <Button type="submit" disabled={loading}>
                    <Save className="mr-2 h-4 w-4" />
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        {/* Stables Tab */}
        <TabsContent value="stables">
          <Card>
            <CardHeader>
              <CardTitle>Stables Management</CardTitle>
              <CardDescription>
                View and manage stables within your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Stables: {organization.data.stats.stableCount}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Stable management features coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription">
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>
                Current plan and billing information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Current Plan</span>
                  <span className="text-sm text-muted-foreground capitalize">
                    {organization.data.subscriptionTier}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Members</span>
                  <span className="text-sm text-muted-foreground">
                    {organization.data.stats.totalMemberCount}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Subscription management features coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
