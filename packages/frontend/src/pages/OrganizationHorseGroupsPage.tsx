import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useDialog } from "@/hooks/useDialog";
import { useCRUD } from "@/hooks/useCRUD";
import { queryKeys, cacheInvalidation } from "@/lib/queryClient";
import {
  createHorseGroup,
  getOrganizationHorseGroups,
  updateHorseGroup,
  deleteHorseGroup,
} from "@/services/horseGroupService";
import { unassignHorsesFromGroup } from "@/services/horseService";
import { HorseGroupFormDialog } from "@/components/HorseGroupFormDialog";
import { CrudPageLayout } from "@/components/shared/CrudPageLayout";
import type { HorseGroup } from "@/types/roles";

export default function OrganizationHorseGroupsPage() {
  const { t } = useTranslation(["horses", "common"]);
  const { selectedOrganization } = useOrganization();
  const { user } = useAuth();

  const groupDialog = useDialog<HorseGroup>();
  const groupsQuery = useApiQuery<HorseGroup[]>(
    queryKeys.horseGroups.byOrganization(selectedOrganization ?? ""),
    () => getOrganizationHorseGroups(selectedOrganization!),
    {
      enabled: !!selectedOrganization,
      staleTime: 5 * 60 * 1000,
    },
  );
  const groupsData = groupsQuery.data ?? [];
  const groupsLoading = groupsQuery.isLoading;

  const {
    create: createGroup,
    update: updateGroup,
    remove: removeGroup,
  } = useCRUD<HorseGroup>({
    createFn: async (groupData) => {
      if (!selectedOrganization || !user)
        throw new Error("Missing organizationId or user");
      const {
        id,
        organizationId: _,
        createdAt,
        updatedAt,
        createdBy,
        ...data
      } = groupData as HorseGroup;
      await createHorseGroup(selectedOrganization, user.uid, data as any);
    },
    updateFn: async (groupId: string, updates) => {
      if (!user) throw new Error("Missing user");
      await updateHorseGroup(groupId, user.uid, updates as any);
    },
    deleteFn: async (groupId: string) => {
      if (!user) throw new Error("Missing user");
      await unassignHorsesFromGroup(groupId, user.uid);
      await deleteHorseGroup(groupId);
    },
    onSuccess: async () => {
      await cacheInvalidation.horseGroups.all();
    },
    successMessages: {
      create: t("horses:settings.groups.messages.createSuccess"),
      update: t("horses:settings.groups.messages.updateSuccess"),
      delete: t("horses:settings.groups.messages.deleteSuccess"),
    },
  });

  return (
    <CrudPageLayout
      title={t("horses:settings.groups.title")}
      description={t("horses:settings.groups.description")}
      noOrganization={!selectedOrganization}
      headerActions={
        <Button size="sm" onClick={() => groupDialog.openDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          {t("horses:settings.groups.addGroup")}
        </Button>
      }
    >
      <Card>
        <CardHeader />
        <CardContent>
          {groupsLoading ? (
            <p className="text-sm text-muted-foreground">
              {t("horses:settings.loading.groups")}
            </p>
          ) : groupsData.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("horses:settings.groups.noGroups")}
            </p>
          ) : (
            <div className="space-y-2">
              {groupsData.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {group.color && (
                      <div
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: group.color }}
                      />
                    )}
                    <div>
                      <p className="font-medium">{group.name}</p>
                      {group.description && (
                        <p className="text-sm text-muted-foreground">
                          {group.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => groupDialog.openDialog(group)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        removeGroup(
                          group.id,
                          t("horses:settings.groups.deleteConfirm"),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <HorseGroupFormDialog
        open={groupDialog.open}
        onOpenChange={groupDialog.closeDialog}
        group={groupDialog.data}
        title={
          groupDialog.data
            ? t("horses:settings.groups.dialog.editTitle")
            : t("horses:settings.groups.dialog.createTitle")
        }
        onSave={async (groupData) => {
          if (groupDialog.data) {
            await updateGroup(groupDialog.data.id, groupData);
          } else {
            await createGroup(groupData);
          }
          groupDialog.closeDialog();
        }}
      />
    </CrudPageLayout>
  );
}
