import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Users, Settings, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { getUserOrganizations } from "@/services/organizationService";
import type { Organization } from "@shared/types/organization";

export default function OrganizationsPage() {
  const { t } = useTranslation(["organizations", "common"]);
  const { user } = useAuth();

  const { data: organizations, loading } = useAsyncData<Organization[]>({
    loadFn: async () => (user ? await getUserOrganizations(user.uid) : []),
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("organizations:page.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("organizations:page.description")}
          </p>
        </div>
        <Button asChild>
          <Link to="/organizations/create">
            <Plus className="h-4 w-4 mr-2" />
            {t("organizations:form.title.create")}
          </Link>
        </Button>
      </div>

      {/* Organizations Grid */}
      {loading ? (
        <p className="text-muted-foreground">
          {t("organizations:dropdown.loading")}
        </p>
      ) : organizations && organizations.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {t("organizations:emptyState.title")}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("organizations:emptyState.description")}
            </p>
            <Button asChild>
              <Link to="/organizations/create">
                <Plus className="h-4 w-4 mr-2" />
                {t("organizations:form.title.create")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {organizations?.map((org) => (
            <Card key={org.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{org.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {org.description || t("common:labels.noData")}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {org.subscriptionTier}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">
                        {t("common:navigation.stables")}
                      </p>
                      <p className="text-2xl font-bold">
                        {org.stats.stableCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        {t("organizations:menu.members")}
                      </p>
                      <p className="text-2xl font-bold">
                        {org.stats.totalMemberCount}
                      </p>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">
                      {t("organizations:form.labels.email")}
                    </p>
                    <p className="font-medium">{org.primaryEmail}</p>
                    {org.phoneNumber && (
                      <p className="text-muted-foreground">{org.phoneNumber}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Link to={`/organizations/${org.id}/users`}>
                        <Users className="h-4 w-4 mr-2" />
                        {t("organizations:members.title")}
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Link to={`/organizations/${org.id}/settings`}>
                        <Settings className="h-4 w-4 mr-2" />
                        {t("organizations:menu.settings")}
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
