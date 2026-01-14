import { Link } from "react-router-dom";
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
  const { user } = useAuth();

  const { data: organizations, loading } = useAsyncData<Organization[]>({
    loadFn: async () => (user ? await getUserOrganizations(user.uid) : []),
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground mt-1">
            Manage your organizations and their members
          </p>
        </div>
        <Button asChild>
          <Link to="/organizations/create">
            <Plus className="h-4 w-4 mr-2" />
            Create Organization
          </Link>
        </Button>
      </div>

      {/* Organizations Grid */}
      {loading ? (
        <p className="text-muted-foreground">Loading organizations...</p>
      ) : organizations && organizations.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No organizations yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first organization to start managing multiple stables
              and team members
            </p>
            <Button asChild>
              <Link to="/organizations/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Organization
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
                      {org.description || "No description"}
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
                      <p className="text-muted-foreground">Stables</p>
                      <p className="text-2xl font-bold">
                        {org.stats.stableCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Members</p>
                      <p className="text-2xl font-bold">
                        {org.stats.totalMemberCount}
                      </p>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">Contact</p>
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
                        Users
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
                        Settings
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
