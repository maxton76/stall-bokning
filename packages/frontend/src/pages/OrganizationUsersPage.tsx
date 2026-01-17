import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge, StatusBadge } from "@/utils/badgeHelpers";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useDialog } from "@/hooks/useDialog";
import { useCRUD } from "@/hooks/useCRUD";
import { InviteUserDialog } from "@/components/InviteUserDialog";
import { getOrganization } from "@/services/organizationService";
import {
  getOrganizationMembers,
  removeOrganizationMember,
  inviteOrganizationMember,
} from "@/services/organizationMemberService";
import type {
  Organization,
  OrganizationMember,
} from "../../../shared/src/types/organization";

export default function OrganizationUsersPage() {
  const { t } = useTranslation(["organizations", "common"]);
  const { organizationId } = useParams<{ organizationId: string }>();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const inviteDialog = useDialog();

  // Organization data
  const organization = useAsyncData<Organization | null>({
    loadFn: async () => {
      if (!organizationId) return null;
      return await getOrganization(organizationId);
    },
  });

  // Members data
  const members = useAsyncData<OrganizationMember[]>({
    loadFn: async () => {
      if (!organizationId) return [];
      return await getOrganizationMembers(organizationId);
    },
  });

  // Load data when organizationId changes
  useEffect(() => {
    organization.load();
    members.load();
  }, [organizationId]);

  // CRUD operations
  const { remove: handleRemoveMember } = useCRUD({
    deleteFn: async (userId: string) => {
      if (!organizationId || !user)
        throw new Error("Missing organizationId or user");
      await removeOrganizationMember(userId, organizationId);
    },
    onSuccess: () => {
      members.load();
    },
  });

  // Handle invite user
  const handleInviteUser = async (data: any) => {
    try {
      if (!organizationId || !user)
        throw new Error("Missing organizationId or user");

      // Call API - backend will handle existing vs non-existing users
      const response = await inviteOrganizationMember(
        organizationId,
        user.uid, // inviterId
        {
          email: data.email,
          roles: data.roles,
          primaryRole: data.primaryRole,
          firstName: data.firstName,
          lastName: data.lastName,
          phoneNumber: data.phoneNumber,
          showInPlanning: data.showInPlanning,
          stableAccess: data.stableAccess,
          assignedStableIds: data.assignedStableIds,
        },
      );

      inviteDialog.closeDialog();

      // Show appropriate success message based on response type
      if (response.type === "new_user") {
        // Non-existing user - invite sent
        alert(t("organizations:invite.inviteSent", { email: data.email }));
      } else {
        // Existing user - pending membership created
        alert(t("organizations:invite.inviteSent", { email: data.email }));
      }

      members.reload();
    } catch (error: any) {
      if (error.response?.status === 409) {
        alert(t("organizations:invite.alreadyMember"));
      } else {
        alert(t("organizations:invite.inviteFailed"));
      }
      throw error;
    }
  };

  // Filter members based on search query
  const filteredMembers =
    members.data?.filter((member: OrganizationMember) => {
      const query = searchQuery.toLowerCase();
      return (
        member.firstName?.toLowerCase().includes(query) ||
        member.lastName?.toLowerCase().includes(query) ||
        member.userEmail.toLowerCase().includes(query) ||
        member.roles.some((role) => role.toLowerCase().includes(query))
      );
    }) || [];

  if (organization.loading || !organization.data) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">{t("common:labels.loading")}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <PageHeader
        title={`${organization.data.name} - ${t("organizations:members.title")}`}
        description={t("organizations:members.description")}
        backLink={
          organizationId
            ? {
                href: `/organizations/${organizationId}`,
                label: t("common:navigation.organizations"),
              }
            : undefined
        }
        action={{
          label: t("organizations:invite.button"),
          icon: <Plus className="h-4 w-4 mr-2" />,
          onClick: () => inviteDialog.openDialog(),
        }}
      />

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("organizations:members.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t("organizations:members.title")} ({filteredMembers.length})
          </CardTitle>
          <CardDescription>
            {t("organizations:members.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.loading ? (
            <p className="text-sm text-muted-foreground">
              {t("common:labels.loading")}
            </p>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? t("organizations:members.noSearchResults")
                  : t("organizations:members.emptyState")}
              </p>
              {!searchQuery && (
                <Button onClick={() => inviteDialog.openDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("organizations:invite.button")}
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common:labels.name")}</TableHead>
                    <TableHead>
                      {t("organizations:form.labels.email")}
                    </TableHead>
                    <TableHead>
                      {t("organizations:form.labels.phone")}
                    </TableHead>
                    <TableHead>{t("organizations:members.roles")}</TableHead>
                    <TableHead>{t("common:labels.status")}</TableHead>
                    <TableHead>{t("common:navigation.stables")}</TableHead>
                    <TableHead className="text-right">
                      {t("common:buttons.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.firstName && member.lastName
                          ? `${member.firstName} ${member.lastName}`
                          : member.userEmail.split("@")[0]}
                      </TableCell>
                      <TableCell>{member.userEmail}</TableCell>
                      <TableCell>{member.phoneNumber || "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {member.roles.map((role) => (
                            <RoleBadge
                              key={role}
                              role={role}
                              className="text-xs"
                            />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={member.status} />
                      </TableCell>
                      <TableCell>
                        {member.stableAccess === "all" ? (
                          <span className="text-sm text-muted-foreground">
                            {t("organizations:members.allStables")}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {member.assignedStableIds?.length || 0}{" "}
                            {t("organizations:members.assigned")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              /* TODO: Open edit dialog */
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (
                                confirm(
                                  t("organizations:members.confirmRemove", {
                                    email: member.userEmail,
                                  }),
                                )
                              ) {
                                handleRemoveMember(member.userId);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite User Dialog */}
      <InviteUserDialog
        open={inviteDialog.open}
        onOpenChange={(open) =>
          open ? inviteDialog.openDialog() : inviteDialog.closeDialog()
        }
        onSave={handleInviteUser}
      />
    </div>
  );
}
