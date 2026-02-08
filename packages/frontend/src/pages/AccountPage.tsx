import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserIcon, Mail, Calendar, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getUserOrganizations } from "@/services/organizationService";
import type { Organization } from "@shared/types";

export default function AccountPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation(["account", "common"]);
  const { toast } = useToast();
  const { currentOrganizationId, setCurrentOrganizationId } =
    useOrganizationContext();
  const { preferences, setDefaultOrganization } = useUserPreferences();
  const [isEditing, setIsEditing] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  // Load user's organizations
  useEffect(() => {
    async function loadOrganizations() {
      if (!user?.uid) return;
      try {
        const orgs = await getUserOrganizations(user.uid);
        setOrganizations(orgs);
      } catch (error) {
        console.error("Failed to load organizations:", error);
      }
    }
    loadOrganizations();
  }, [user?.uid]);

  const handleDefaultOrgChange = async (orgId: string) => {
    try {
      await setDefaultOrganization(orgId);
      setCurrentOrganizationId(orgId);
      toast({
        description: t("preferences.saved"),
      });
    } catch (error) {
      console.error("Failed to set default organization:", error);
      toast({
        variant: "destructive",
        description: t("common:errors.generic"),
      });
    }
  };

  const getJoinDate = () => {
    const locale = i18n.language === "sv" ? "sv-SE" : "en-US";
    // Handle both Timestamp objects and ISO string dates from API
    let date: Date;
    if (user?.createdAt) {
      // If it's a Timestamp object (has toDate method)
      if (typeof user.createdAt === "object" && "toDate" in user.createdAt) {
        date = (user.createdAt as any).toDate();
      } else {
        // Otherwise treat as ISO string or Date
        date = new Date(user.createdAt as any);
      }
    } else {
      date = new Date();
    }
    return date.toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("page.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("page.description")}</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("profile.title")}</CardTitle>
          <CardDescription>{t("profile.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <Avatar className="size-24">
              <AvatarImage src="" alt={user?.fullName || "User"} />
              <AvatarFallback className="text-2xl">
                {user?.initials || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{user?.fullName}</h3>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Button variant="outline" size="sm" disabled>
                {t("profile.changeAvatar")}
              </Button>
            </div>
          </div>

          {/* Account Details */}
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">{t("fields.email")}</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="uid">{t("fields.userId")}</Label>
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <Input id="uid" value={user?.uid || ""} disabled />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("fields.memberSince")}</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input value={getJoinDate()} disabled />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Status */}
      <Card>
        <CardHeader>
          <CardTitle>{t("status.title")}</CardTitle>
          <CardDescription>{t("status.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {t("status.accountStatus")}
              </span>
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                {t("status.active")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {t("status.emailVerified")}
              </span>
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                {t("status.verified")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      {organizations.length > 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>{t("preferences.title")}</CardTitle>
                <CardDescription>
                  {t("preferences.description")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="default-org">
                {t("preferences.defaultOrganization")}
              </Label>
              <Select
                value={preferences?.defaultOrganizationId || ""}
                onValueChange={handleDefaultOrgChange}
              >
                <SelectTrigger id="default-org" className="w-full max-w-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.displayName || org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("preferences.defaultOrganizationHint")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">
            {t("danger.title")}
          </CardTitle>
          <CardDescription>{t("danger.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" disabled>
            {t("danger.deleteAccount")}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            {t("danger.deleteWarning")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
