import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  X,
  Mail,
  Upload,
  UserPlus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys, cacheInvalidation } from "@/lib/queryClient";
import { useDialog } from "@/hooks/useDialog";
import { useToast } from "@/hooks/use-toast";
import { InviteUserDialog } from "@/components/InviteUserDialog";
import { EditMemberDialog } from "@/components/EditMemberDialog";
import { RemoveMemberDialog } from "@/components/RemoveMemberDialog";
import { BulkImportWizard } from "@/components/bulk-import";
import { HorseBulkImportWizard } from "@/components/horse-bulk-import";
import { getOrganization } from "@/services/organizationService";
import { getStablesByOrganization } from "@/services/stableService";
import {
  getOrganizationMembers,
  inviteOrganizationMember,
  updateOrganizationMember,
} from "@/services/organizationMemberService";
import {
  getOrganizationInvites,
  resendOrganizationInvite,
  cancelOrganizationInvite,
  forceActivateInvites,
} from "@/services/inviteService";
import type {
  Organization,
  OrganizationMember,
  OrganizationInvite,
} from "../../../shared/src/types/organization";
import type { Stable } from "@equiduty/shared";

export default function OrganizationUsersPage() {
  const { t } = useTranslation(["organizations", "common"]);
  const { organizationId } = useParams<{ organizationId: string }>();
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganization();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(
    null,
  );
  const [editingMember, setEditingMember] = useState<OrganizationMember | null>(
    null,
  );
  const [removingMember, setRemovingMember] =
    useState<OrganizationMember | null>(null);
  const inviteDialog = useDialog();
  const editDialog = useDialog();
  const removeDialog = useDialog();
  const bulkImportDialog = useDialog();
  const horseBulkImportDialog = useDialog();
  const [selectedInviteIds, setSelectedInviteIds] = useState<Set<string>>(
    new Set(),
  );
  const [forceActivating, setForceActivating] = useState(false);

  // Sorting state
  type SortColumn = "name" | "email" | "phone" | "status";
  type SortDirection = "asc" | "desc";
  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Security: Validate URL organizationId matches user's current organization context
  // This prevents URL manipulation attacks where users try to access other organizations
  useEffect(() => {
    if (
      organizationId &&
      currentOrganizationId &&
      organizationId !== currentOrganizationId
    ) {
      console.warn(
        `[OrganizationUsersPage] Organization mismatch detected: URL=${organizationId}, current=${currentOrganizationId}`,
      );
      navigate("/dashboard", { replace: true });
    }
  }, [organizationId, currentOrganizationId, navigate]);

  // Organization data
  const organizationQuery = useApiQuery<Organization | null>(
    queryKeys.organizations.detail(organizationId || ""),
    () => getOrganization(organizationId!),
    {
      enabled: !!organizationId,
      staleTime: 5 * 60 * 1000,
    },
  );
  const organizationData = organizationQuery.data ?? null;
  const organizationLoading = organizationQuery.isLoading;

  // Members data
  const membersQuery = useApiQuery<OrganizationMember[]>(
    queryKeys.organizationMembers.list(organizationId || ""),
    () => getOrganizationMembers(organizationId!),
    {
      enabled: !!organizationId,
      staleTime: 2 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  );
  const membersData = membersQuery.data ?? [];
  const membersLoading = membersQuery.isLoading;

  // Pending invites data
  const invitesQuery = useApiQuery<OrganizationInvite[]>(
    queryKeys.organizationInvites.list(organizationId || ""),
    async () => {
      const response = await getOrganizationInvites(organizationId!);
      return response.invites || [];
    },
    {
      enabled: !!organizationId,
      staleTime: 2 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  );
  const invitesData = invitesQuery.data ?? [];
  const invitesLoading = invitesQuery.isLoading;

  // Stables data (for horse bulk import)
  const stablesQuery = useApiQuery<Stable[]>(
    queryKeys.stables.list(organizationId || ""),
    () => getStablesByOrganization(organizationId!),
    {
      enabled: !!organizationId,
      staleTime: 5 * 60 * 1000,
    },
  );
  const stablesData = stablesQuery.data ?? [];

  // Handle remove member (open dialog)
  const handleOpenRemoveDialog = (member: OrganizationMember) => {
    setRemovingMember(member);
    removeDialog.openDialog();
  };

  // Handle remove member confirmation
  const handleRemoveMemberConfirm = async (userId: string) => {
    // The actual removal is handled by RemoveMemberDialog
    // This callback is for any additional cleanup after removal
    await cacheInvalidation.organizationMembers.list(organizationId!);
    toast({
      title: t("organizations:members.removeMember.success"),
      description: t("organizations:members.removeMember.successDescription"),
    });
  };

  // Handle horse transfer complete (refresh horse data if needed)
  const handleTransferComplete = async () => {
    // Refresh any horse-related data
    // This could invalidate horse cache if needed
  };

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
          firstName: data.firstName,
          lastName: data.lastName,
          phoneNumber: data.phoneNumber,
          // Contact type fields
          contactType: data.contactType,
          businessName: data.businessName,
          address: data.address,
          // Role assignment
          roles: data.roles,
          primaryRole: data.primaryRole,
          showInPlanning: data.showInPlanning,
          stableAccess: data.stableAccess,
          assignedStableIds: data.assignedStableIds,
        },
      );

      inviteDialog.closeDialog();

      // Show appropriate success message based on response type
      toast({
        title: t("organizations:invite.success"),
        description: t("organizations:invite.inviteSent", {
          email: data.email,
        }),
      });

      await cacheInvalidation.organizationMembers.list(organizationId!);
      await cacheInvalidation.organizationInvites.list(organizationId!);
    } catch (error: any) {
      if (error.response?.status === 409) {
        const code = error.response?.data?.code;
        toast({
          title: t("common:labels.error"),
          description:
            code === "INVITE_ALREADY_PENDING"
              ? t("organizations:invite.alreadyInvited")
              : t("organizations:invite.alreadyMember"),
          variant: "destructive",
        });
      } else {
        toast({
          title: t("common:labels.error"),
          description: t("organizations:invite.inviteFailed"),
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  // Handle resend invite
  const handleResendInvite = async (inviteId: string, email: string) => {
    if (!organizationId) return;

    try {
      setProcessingInviteId(inviteId);
      await resendOrganizationInvite(organizationId, inviteId);
      toast({
        title: t("organizations:invite.resent"),
        description: t("organizations:invite.resentDescription", { email }),
      });
      await cacheInvalidation.organizationInvites.list(organizationId!);
    } catch (error) {
      toast({
        title: t("common:labels.error"),
        description: t("organizations:invite.resendFailed"),
        variant: "destructive",
      });
    } finally {
      setProcessingInviteId(null);
    }
  };

  // Handle edit member
  const handleEditMember = (member: OrganizationMember) => {
    setEditingMember(member);
    editDialog.openDialog();
  };

  // Handle update member
  const handleUpdateMember = async (userId: string, data: any) => {
    try {
      if (!organizationId) throw new Error("Missing organizationId");

      await updateOrganizationMember(userId, organizationId, {
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        roles: data.roles,
        primaryRole: data.primaryRole,
        showInPlanning: data.showInPlanning,
        stableAccess: data.stableAccess,
        assignedStableIds: data.assignedStableIds,
      });

      editDialog.closeDialog();
      setEditingMember(null);

      toast({
        title: t("organizations:members.updateSuccess"),
        description: t("organizations:members.memberUpdated"),
      });

      await cacheInvalidation.organizationMembers.list(organizationId!);
    } catch (error: any) {
      toast({
        title: t("common:labels.error"),
        description: t("organizations:members.updateError"),
        variant: "destructive",
      });
      throw error;
    }
  };

  // Handle cancel invite
  const handleCancelInvite = async (inviteId: string, email: string) => {
    if (!organizationId) return;
    if (!confirm(t("organizations:invite.confirmCancel", { email }))) return;

    try {
      setProcessingInviteId(inviteId);
      await cancelOrganizationInvite(organizationId, inviteId);
      toast({
        title: t("organizations:invite.cancelled"),
        description: t("organizations:invite.cancelledDescription", { email }),
      });
      await cacheInvalidation.organizationInvites.list(organizationId!);
    } catch (error) {
      toast({
        title: t("common:labels.error"),
        description: t("organizations:invite.cancelFailed"),
        variant: "destructive",
      });
    } finally {
      setProcessingInviteId(null);
    }
  };

  // Handle force activate invites
  const handleForceActivate = async () => {
    if (!organizationId || selectedInviteIds.size === 0) return;

    const count = selectedInviteIds.size;
    if (!confirm(t("organizations:invites.forceActivateConfirm", { count })))
      return;

    const inviteIds = Array.from(selectedInviteIds);

    try {
      setForceActivating(true);
      const { results } = await forceActivateInvites(organizationId, inviteIds);

      const successCount = results.filter(
        (r) => r.status === "activated",
      ).length;
      const totalCount = results.length;

      if (successCount === totalCount) {
        toast({
          title: t("organizations:invites.forceActivateSuccess", {
            count: successCount,
          }),
        });
      } else if (successCount > 0) {
        const errors = results.filter((r) => r.status === "error");
        toast({
          title: t("organizations:invites.forceActivatePartial", {
            success: successCount,
            total: totalCount,
          }),
          description: errors.map((e) => e.error).join(", "),
          variant: "destructive",
        });
      } else {
        const errors = results.filter((r) => r.status === "error");
        toast({
          title: t("organizations:invites.forceActivateError"),
          description: errors.map((e) => e.error).join(", "),
          variant: "destructive",
        });
      }

      setSelectedInviteIds(new Set());
      // Refetch queries directly to ensure UI updates immediately
      await Promise.all([invitesQuery.refetch(), membersQuery.refetch()]);
    } catch (error) {
      toast({
        title: t("organizations:invites.forceActivateError"),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setForceActivating(false);
    }
  };

  // Toggle invite selection
  const toggleInviteSelection = (inviteId: string) => {
    setSelectedInviteIds((prev) => {
      const next = new Set(prev);
      if (next.has(inviteId)) {
        next.delete(inviteId);
      } else {
        next.add(inviteId);
      }
      return next;
    });
  };

  // Toggle select all invites
  const toggleSelectAllInvites = () => {
    if (selectedInviteIds.size === (invitesData?.length ?? 0)) {
      setSelectedInviteIds(new Set());
    } else {
      setSelectedInviteIds(
        new Set(invitesData?.map((i) => i.id!).filter(Boolean)),
      );
    }
  };

  // Handle column sort
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if clicking same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New column - default to ascending
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Get sort icon for column header
  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  // Filter and sort members
  const filteredMembers = useMemo(() => {
    // First, filter based on search query
    const filtered = membersData.filter((member: OrganizationMember) => {
      const query = searchQuery.toLowerCase();
      return (
        member.firstName?.toLowerCase().includes(query) ||
        member.lastName?.toLowerCase().includes(query) ||
        member.userEmail.toLowerCase().includes(query) ||
        member.roles.some((role) => role.toLowerCase().includes(query))
      );
    });

    // Then, sort the filtered results
    const sorted = [...filtered].sort((a, b) => {
      let aValue: string;
      let bValue: string;

      switch (sortColumn) {
        case "name":
          aValue =
            `${a.firstName || ""} ${a.lastName || ""}`.trim() || a.userEmail;
          bValue =
            `${b.firstName || ""} ${b.lastName || ""}`.trim() || b.userEmail;
          break;
        case "email":
          aValue = a.userEmail;
          bValue = b.userEmail;
          break;
        case "phone":
          aValue = a.phoneNumber || "";
          bValue = b.phoneNumber || "";
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      // Swedish locale comparison for proper alphabetical sorting
      const comparison = aValue.localeCompare(bValue, "sv", {
        sensitivity: "base",
      });

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [membersData, searchQuery, sortColumn, sortDirection]);

  if (organizationLoading || !organizationData) {
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
        title={`${organizationData.name} - ${t("organizations:members.title")}`}
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

      {/* Bulk Import Buttons */}
      <div className="flex justify-end gap-2 -mt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => bulkImportDialog.openDialog()}
        >
          <Upload className="h-4 w-4 mr-2" />
          {t("organizations:bulkImport.button")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => horseBulkImportDialog.openDialog()}
        >
          <Upload className="h-4 w-4 mr-2" />
          {t("horses:bulkImport.button")}
        </Button>
      </div>

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

      {/* Pending Invitations Table */}
      {(invitesData?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  {t("organizations:invites.title")} ({invitesData?.length || 0}
                  )
                </CardTitle>
                <CardDescription>
                  {t("organizations:invites.description")}
                </CardDescription>
              </div>
              {selectedInviteIds.size > 0 && (
                <Button
                  size="sm"
                  onClick={handleForceActivate}
                  disabled={forceActivating}
                >
                  <UserPlus
                    className={`h-4 w-4 mr-2 ${forceActivating ? "animate-spin" : ""}`}
                  />
                  {t("organizations:invites.forceActivate")} (
                  {selectedInviteIds.size})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {invitesLoading ? (
              <p className="text-sm text-muted-foreground">
                {t("common:labels.loading")}
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {t("organizations:form.labels.email")}
                      </TableHead>
                      <TableHead>{t("common:labels.name")}</TableHead>
                      <TableHead>{t("organizations:invites.sentOn")}</TableHead>
                      <TableHead>
                        {t("organizations:invites.expiresOn")}
                      </TableHead>
                      <TableHead>{t("organizations:members.roles")}</TableHead>
                      <TableHead>
                        {t("organizations:invites.resendCount")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("common:buttons.actions")}
                      </TableHead>
                      <TableHead className="text-center w-16">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs">
                            {t("organizations:invites.forceActivate")}
                          </span>
                          <Checkbox
                            checked={
                              invitesData.length > 0 &&
                              selectedInviteIds.size === invitesData.length
                            }
                            onCheckedChange={toggleSelectAllInvites}
                            aria-label={t("organizations:invites.selectAll")}
                          />
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitesData?.map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell className="font-medium">
                          {invite.email}
                        </TableCell>
                        <TableCell>
                          {invite.firstName && invite.lastName
                            ? `${invite.firstName} ${invite.lastName}`
                            : "-"}
                          {invite.contactType === "Business" &&
                            invite.businessName && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {invite.businessName}
                              </Badge>
                            )}
                        </TableCell>
                        <TableCell>
                          {invite.sentAt
                            ? new Date(
                                (invite.sentAt as any)._seconds * 1000 ||
                                  (invite.sentAt as any).seconds * 1000,
                              ).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {invite.expiresAt
                            ? new Date(
                                (invite.expiresAt as any)._seconds * 1000 ||
                                  (invite.expiresAt as any).seconds * 1000,
                              ).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {invite.roles.map((role) => (
                              <RoleBadge
                                key={role}
                                role={role}
                                className="text-xs"
                              >
                                {t(
                                  `organizations:invite.roles.${role}.label`,
                                  role,
                                )}
                              </RoleBadge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {invite.resentCount > 0 ? (
                            <Badge variant="secondary" className="text-xs">
                              {t("organizations:invites.resentTimes", {
                                count: invite.resentCount,
                              })}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <TooltipProvider>
                            <div className="flex gap-2 justify-end">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={processingInviteId === invite.id}
                                    onClick={() =>
                                      handleResendInvite(
                                        invite.id!,
                                        invite.email,
                                      )
                                    }
                                  >
                                    <RefreshCw
                                      className={`h-4 w-4 ${processingInviteId === invite.id ? "animate-spin" : ""}`}
                                    />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {t("organizations:invites.resend")}
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={processingInviteId === invite.id}
                                    onClick={() =>
                                      handleCancelInvite(
                                        invite.id!,
                                        invite.email,
                                      )
                                    }
                                  >
                                    <X className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {t("organizations:invites.cancel")}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={selectedInviteIds.has(invite.id!)}
                            onCheckedChange={() =>
                              toggleInviteSelection(invite.id!)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
          {membersLoading ? (
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
                    <TableHead>
                      <button
                        className="flex items-center hover:text-foreground transition-colors font-medium"
                        onClick={() => handleSort("name")}
                      >
                        {t("common:labels.name")}
                        {getSortIcon("name")}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center hover:text-foreground transition-colors font-medium"
                        onClick={() => handleSort("email")}
                      >
                        {t("organizations:form.labels.email")}
                        {getSortIcon("email")}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center hover:text-foreground transition-colors font-medium"
                        onClick={() => handleSort("phone")}
                      >
                        {t("organizations:form.labels.phone")}
                        {getSortIcon("phone")}
                      </button>
                    </TableHead>
                    <TableHead>{t("organizations:members.roles")}</TableHead>
                    <TableHead>
                      <button
                        className="flex items-center hover:text-foreground transition-colors font-medium"
                        onClick={() => handleSort("status")}
                      >
                        {t("common:labels.status")}
                        {getSortIcon("status")}
                      </button>
                    </TableHead>
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
                            >
                              {t(
                                `organizations:invite.roles.${role}.label`,
                                role,
                              )}
                            </RoleBadge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <StatusBadge status={member.status}>
                            {t(
                              `organizations:members.statuses.${member.status}`,
                              member.status,
                            )}
                          </StatusBadge>
                          {member.status === "expired" &&
                            member.expiredReason && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {t(
                                  `organizations:members.expiredReason.${member.expiredReason}`,
                                )}
                              </p>
                            )}
                        </div>
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
                          {member.status === "expired" ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (
                                    confirm(
                                      t(
                                        "organizations:members.confirmReinvite",
                                        {
                                          email: member.userEmail,
                                        },
                                      ),
                                    )
                                  ) {
                                    handleInviteUser({
                                      email: member.userEmail,
                                      firstName: member.firstName,
                                      lastName: member.lastName,
                                      phoneNumber: member.phoneNumber,
                                      roles: member.roles,
                                      primaryRole: member.primaryRole,
                                      showInPlanning: member.showInPlanning,
                                      stableAccess: member.stableAccess,
                                      assignedStableIds:
                                        member.assignedStableIds,
                                    });
                                  }
                                }}
                                title={t("organizations:members.reinvite")}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenRemoveDialog(member)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditMember(member)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenRemoveDialog(member)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
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
        existingEmails={membersData.map((m) => m.userEmail.toLowerCase())}
        pendingInviteEmails={invitesData.map((i) => i.email.toLowerCase())}
      />

      {/* Edit Member Dialog */}
      <EditMemberDialog
        open={editDialog.open}
        onOpenChange={(open) => {
          if (open) {
            editDialog.openDialog();
          } else {
            editDialog.closeDialog();
            setEditingMember(null);
          }
        }}
        member={editingMember}
        onSave={handleUpdateMember}
      />

      {/* Remove Member Dialog */}
      <RemoveMemberDialog
        open={removeDialog.open}
        onOpenChange={(open) => {
          if (open) {
            removeDialog.openDialog();
          } else {
            removeDialog.closeDialog();
            setRemovingMember(null);
          }
        }}
        member={removingMember}
        organizationId={organizationId || ""}
        onConfirm={handleRemoveMemberConfirm}
        onTransferComplete={handleTransferComplete}
      />

      {/* Bulk Import Wizard */}
      {organizationId && (
        <BulkImportWizard
          open={bulkImportDialog.open}
          onOpenChange={(open) =>
            open
              ? bulkImportDialog.openDialog()
              : bulkImportDialog.closeDialog()
          }
          organizationId={organizationId}
          existingMembers={membersData}
          existingInvites={
            invitesData as (OrganizationInvite & { id: string })[]
          }
        />
      )}

      {/* Horse Bulk Import Wizard */}
      {organizationId && (
        <HorseBulkImportWizard
          open={horseBulkImportDialog.open}
          onOpenChange={(open) =>
            open
              ? horseBulkImportDialog.openDialog()
              : horseBulkImportDialog.closeDialog()
          }
          organizationId={organizationId}
          stables={stablesData}
        />
      )}
    </div>
  );
}
