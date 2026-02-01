import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Search,
  MoreHorizontal,
  Users,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryClient";
import { useRequireOrganization } from "@/hooks/useRequireOrganization";
import {
  getBillingGroups,
  createBillingGroup,
  updateBillingGroup,
  deleteBillingGroup,
} from "@/services/billingGroupService";
import type {
  BillingGroup,
  BillingGroupRelationshipType,
} from "@equiduty/shared";

// ============================================================================
// Constants
// ============================================================================

const RELATIONSHIP_TYPE_OPTIONS: BillingGroupRelationshipType[] = [
  "parent",
  "guardian",
  "company",
  "sponsor",
  "other",
];

// ============================================================================
// Form State
// ============================================================================

interface BillingGroupFormState {
  billingContactId: string;
  memberIdsText: string;
  relationshipType: BillingGroupRelationshipType;
  label: string;
}

const EMPTY_FORM: BillingGroupFormState = {
  billingContactId: "",
  memberIdsText: "",
  relationshipType: "parent",
  label: "",
};

function formStateFromItem(item: BillingGroup): BillingGroupFormState {
  return {
    billingContactId: item.billingContactId,
    memberIdsText: item.memberIds.join(", "),
    relationshipType: item.relationshipType,
    label: item.label || "",
  };
}

// ============================================================================
// Page Component
// ============================================================================

export default function BillingGroupsPage() {
  const { t } = useTranslation(["invoices", "common"]);
  const { toast } = useToast();
  const selectedOrganization = useRequireOrganization();
  const queryClient = useQueryClient();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BillingGroup | null>(null);
  const [formState, setFormState] = useState<BillingGroupFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingItem, setDeletingItem] = useState<BillingGroup | null>(null);

  // Data
  const groupsQuery = useApiQuery<BillingGroup[]>(
    queryKeys.billingGroups.byOrganization(selectedOrganization ?? ""),
    () => getBillingGroups(selectedOrganization!),
    {
      enabled: !!selectedOrganization,
      staleTime: 5 * 60 * 1000,
    },
  );
  const groupsData = groupsQuery.data;
  const groupsLoading = groupsQuery.isLoading;

  // Filtered groups
  const filteredGroups = useMemo(() => {
    if (!groupsData) return [];

    let groups = groupsData;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      groups = groups.filter(
        (group) =>
          (group.label && group.label.toLowerCase().includes(query)) ||
          group.billingContactId.toLowerCase().includes(query),
      );
    }

    return groups;
  }, [groupsData, searchQuery]);

  // Invalidate cache
  const invalidateGroups = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.billingGroups.byOrganization(
        selectedOrganization ?? "",
      ),
    });
  }, [queryClient, selectedOrganization]);

  // Open create dialog
  const handleOpenCreate = useCallback(() => {
    setEditingItem(null);
    setFormState(EMPTY_FORM);
    setDialogOpen(true);
  }, []);

  // Open edit dialog
  const handleOpenEdit = useCallback((item: BillingGroup) => {
    setEditingItem(item);
    setFormState(formStateFromItem(item));
    setDialogOpen(true);
  }, []);

  // Save (create or update)
  const handleSave = useCallback(async () => {
    if (!selectedOrganization) return;

    // Basic validation
    if (!formState.billingContactId.trim()) {
      toast({
        title: t("invoices:billingGroups.errors.billingContactRequired"),
        variant: "destructive",
      });
      return;
    }

    const memberIds = formState.memberIdsText
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (memberIds.length === 0) {
      toast({
        title: t("invoices:billingGroups.errors.membersRequired"),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editingItem) {
        await updateBillingGroup(selectedOrganization, editingItem.id, {
          billingContactId: formState.billingContactId.trim(),
          relationshipType: formState.relationshipType,
          label: formState.label.trim() || undefined,
        });
        toast({ title: t("invoices:billingGroups.messages.updated") });
      } else {
        await createBillingGroup(selectedOrganization, {
          billingContactId: formState.billingContactId.trim(),
          memberIds,
          relationshipType: formState.relationshipType,
          label: formState.label.trim() || undefined,
        });
        toast({ title: t("invoices:billingGroups.messages.created") });
      }
      setDialogOpen(false);
      await invalidateGroups();
    } catch {
      toast({
        title: editingItem
          ? t("invoices:billingGroups.errors.updateFailed")
          : t("invoices:billingGroups.errors.createFailed"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedOrganization,
    formState,
    editingItem,
    toast,
    invalidateGroups,
    t,
  ]);

  // Delete with confirmation
  const handleRequestDelete = useCallback((item: BillingGroup) => {
    setDeletingItem(item);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedOrganization || !deletingItem) return;
    try {
      await deleteBillingGroup(selectedOrganization, deletingItem.id);
      toast({ title: t("invoices:billingGroups.messages.deleted") });
      await invalidateGroups();
    } catch {
      toast({
        title: t("common:errors.generic", "Något gick fel"),
        variant: "destructive",
      });
    } finally {
      setDeletingItem(null);
    }
  }, [selectedOrganization, deletingItem, toast, invalidateGroups, t]);

  // Update form field helper
  const updateField = useCallback(
    <K extends keyof BillingGroupFormState>(
      field: K,
      value: BillingGroupFormState[K],
    ) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  // ============================================================================
  // Render
  // ============================================================================

  if (!selectedOrganization) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">
              {t("common:labels.selectStable", "Välj en organisation")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {t("invoices:billingGroups.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("invoices:billingGroups.description")}
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("invoices:billingGroups.createGroup")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common:search.placeholder", "Sök...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("invoices:billingGroups.table.label")}</TableHead>
                <TableHead>
                  {t("invoices:billingGroups.table.billingContact")}
                </TableHead>
                <TableHead>
                  {t("invoices:billingGroups.table.relationshipType")}
                </TableHead>
                <TableHead className="text-right">
                  {t("invoices:billingGroups.table.memberCount")}
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))
              ) : filteredGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {searchQuery
                          ? t("common:messages.noResults", "Inga resultat")
                          : t("invoices:billingGroups.noGroups")}
                      </p>
                      {!searchQuery && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleOpenCreate}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          {t("invoices:billingGroups.createGroup")}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredGroups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <span className="font-medium">{group.label || "-"}</span>
                    </TableCell>
                    {/* TODO: Resolve billingContactId to display name using a contact lookup */}
                    <TableCell>{group.billingContactId}</TableCell>
                    <TableCell>
                      {t(
                        `invoices:billingGroups.relationshipTypes.${group.relationshipType}`,
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {group.memberIds.length}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleOpenEdit(group)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            {t("invoices:billingGroups.actions.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleRequestDelete(group)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t("invoices:billingGroups.actions.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem
                ? t("invoices:billingGroups.dialogs.edit.title")
                : t("invoices:billingGroups.dialogs.create.title")}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? t("invoices:billingGroups.dialogs.edit.description")
                : t("invoices:billingGroups.dialogs.create.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Label */}
            <div className="grid gap-2">
              <Label htmlFor="bg-label">
                {t("invoices:billingGroups.fields.label")}
              </Label>
              <Input
                id="bg-label"
                value={formState.label}
                onChange={(e) => updateField("label", e.target.value)}
                placeholder={t("invoices:billingGroups.placeholders.label")}
              />
            </div>

            {/* Billing Contact ID */}
            <div className="grid gap-2">
              <Label htmlFor="bg-billing-contact">
                {t("invoices:billingGroups.fields.billingContactId")} *
              </Label>
              <Input
                id="bg-billing-contact"
                value={formState.billingContactId}
                onChange={(e) =>
                  updateField("billingContactId", e.target.value)
                }
                placeholder={t(
                  "invoices:billingGroups.placeholders.billingContactId",
                )}
              />
            </div>

            {/* Member IDs */}
            <div className="grid gap-2">
              <Label htmlFor="bg-members">
                {t("invoices:billingGroups.fields.members")} *
              </Label>
              <Input
                id="bg-members"
                value={formState.memberIdsText}
                onChange={(e) => updateField("memberIdsText", e.target.value)}
                placeholder={t("invoices:billingGroups.placeholders.members")}
              />
            </div>

            {/* Relationship Type */}
            <div className="grid gap-2">
              <Label>
                {t("invoices:billingGroups.fields.relationshipType")} *
              </Label>
              <Select
                value={formState.relationshipType}
                onValueChange={(value) =>
                  updateField(
                    "relationshipType",
                    value as BillingGroupRelationshipType,
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`invoices:billingGroups.relationshipTypes.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSaving}
            >
              {t("common:buttons.cancel", "Avbryt")}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving
                ? t("invoices:common.saving")
                : editingItem
                  ? t("invoices:common.update")
                  : t("invoices:common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingItem}
        onOpenChange={(open) => {
          if (!open) setDeletingItem(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("common:confirmDelete.title", "Bekräfta borttagning")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "common:confirmDelete.description",
                "Är du säker? Denna åtgärd kan inte ångras.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("common:buttons.cancel", "Avbryt")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              {t("common:buttons.delete", "Ta bort")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
