import { useState } from "react";
import { useParams } from "react-router-dom";
import { Save, User, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminUserDetail } from "@stall-bokning/shared";
import { getUser, updateUser } from "@/services/adminService";

function UserDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: 2 }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full" />
      ))}
    </div>
  );
}

function UserDetailContent({ user: initialUser }: { user: AdminUserDetail }) {
  const [systemRole, setSystemRole] = useState(initialUser.systemRole);
  const [disabled, setDisabled] = useState(initialUser.disabled || false);

  const saveMutation = useApiMutation(
    (data: { systemRole: string; disabled: boolean }) =>
      updateUser(initialUser.uid, data),
    {
      successMessage: "User updated successfully",
      errorMessage: "Failed to update user",
    },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${initialUser.firstName} ${initialUser.lastName}`}
        description={initialUser.email}
        badge={<User className="h-6 w-6 text-muted-foreground" />}
        backLink={{ href: "/admin/users", label: "Users" }}
        action={{
          label: saveMutation.isPending ? "Saving..." : "Save Changes",
          icon: <Save className="h-4 w-4 mr-2" />,
          onClick: () => saveMutation.mutate({ systemRole, disabled }),
        }}
      />

      {/* User Controls */}
      <Card>
        <CardHeader>
          <CardTitle>User Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>System Role</Label>
              <p className="text-xs text-muted-foreground">
                System-wide access level
              </p>
            </div>
            <Select value={systemRole} onValueChange={setSystemRole}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="stable_owner">Stable Owner</SelectItem>
                <SelectItem value="system_admin">System Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Account Disabled</Label>
              <p className="text-xs text-muted-foreground">
                Prevent user from logging in
              </p>
            </div>
            <Switch checked={disabled} onCheckedChange={setDisabled} />
          </div>
        </CardContent>
      </Card>

      {/* Organizations */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Memberships</CardTitle>
        </CardHeader>
        <CardContent>
          {initialUser.organizations.length === 0 ? (
            <p className="text-muted-foreground">No organization memberships</p>
          ) : (
            <div className="space-y-2">
              {initialUser.organizations.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{org.name}</span>
                  </div>
                  <Badge variant="secondary">{org.role}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Log (mocked) */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Activity log will be available in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();

  const query = useApiQuery<AdminUserDetail>(
    ["admin-user", id],
    () => getUser(id!),
    { enabled: !!id },
  );

  return (
    <div className="p-6">
      <QueryBoundary query={query} loadingFallback={<UserDetailSkeleton />}>
        {(user) => <UserDetailContent user={user} />}
      </QueryBoundary>
    </div>
  );
}
