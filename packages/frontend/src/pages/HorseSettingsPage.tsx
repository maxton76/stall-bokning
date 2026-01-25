import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStables } from "@/hooks/useUserStables";
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
import { getUserOrganizations } from "@/services/organizationService";
import {
  createVaccinationRule,
  getAllAvailableVaccinationRules,
  updateVaccinationRule,
  deleteVaccinationRule,
  isSystemRule,
  isOrganizationRule,
  isUserRule,
} from "@/services/vaccinationRuleService";
import {
  unassignHorsesFromGroup,
  unassignHorsesFromVaccinationRule,
} from "@/services/horseService";
import { HorseGroupFormDialog } from "@/components/HorseGroupFormDialog";
import { VaccinationRuleFormDialog } from "@/components/VaccinationRuleFormDialog";
import type { HorseGroup, VaccinationRule } from "@/types/roles";

export default function HorseSettingsPage() {
  const { t } = useTranslation(["horses", "common"]);
  const { stableId: stableIdFromParams } = useParams<{ stableId: string }>();
  const { user } = useAuth();

  // Load user's stables if no stableId in URL
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);

  // Load user's organization
  const organizationsQuery = useApiQuery(
    queryKeys.organizations.list(user?.uid || ""),
    () => getUserOrganizations(user!.uid),
    {
      enabled: !!user?.uid,
      staleTime: 5 * 60 * 1000,
    },
  );
  const organizationsData = organizationsQuery.data ?? [];

  // Get first organization's ID (user should only have one organization)
  const organizationId = organizationsData[0]?.id;

  // Use stableId from URL (vaccination rules are stable-specific)
  const stableId = stableIdFromParams;

  // Horse Groups state - now organization-wide
  const groupDialog = useDialog<HorseGroup>();
  const groupsQuery = useApiQuery<HorseGroup[]>(
    queryKeys.horseGroups.byOrganization(organizationId || ""),
    () => getOrganizationHorseGroups(organizationId!),
    {
      enabled: !!organizationId,
      staleTime: 5 * 60 * 1000,
    },
  );
  const groupsData = groupsQuery.data ?? [];
  const groupsLoading = groupsQuery.isLoading;

  // Vaccination Rules state (includes system + organization + user rules)
  const ruleDialog = useDialog<VaccinationRule>();
  const rulesQuery = useApiQuery<VaccinationRule[]>(
    queryKeys.vaccinationRules.list(organizationId || null),
    () => getAllAvailableVaccinationRules(user?.uid, organizationId),
    {
      enabled: !!user?.uid || !!organizationId,
      staleTime: 5 * 60 * 1000,
    },
  );
  const rulesData = rulesQuery.data ?? [];
  const rulesLoading = rulesQuery.isLoading;

  // Group rules by scope
  const systemRules = rulesData.filter(isSystemRule);
  const orgRules = rulesData.filter(isOrganizationRule);
  const userRules = rulesData.filter(isUserRule);

  // Horse Groups CRUD
  const {
    create: createGroup,
    update: updateGroup,
    remove: removeGroup,
  } = useCRUD<HorseGroup>({
    createFn: async (groupData) => {
      if (!organizationId || !user)
        throw new Error("Missing organizationId or user");
      const {
        id,
        organizationId: _,
        createdAt,
        updatedAt,
        createdBy,
        ...data
      } = groupData as HorseGroup;
      await createHorseGroup(organizationId, user.uid, data as any);
    },
    updateFn: async (groupId: string, updates) => {
      if (!user) throw new Error("Missing user");
      await updateHorseGroup(groupId, user.uid, updates as any);
    },
    deleteFn: async (groupId: string) => {
      if (!user) throw new Error("Missing user");
      // Unassign horses from this group first
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

  // Vaccination Rules CRUD (only for organization and user rules, not system rules)
  const {
    create: createRule,
    update: updateRule,
    remove: removeRule,
  } = useCRUD<VaccinationRule>({
    createFn: async (ruleData) => {
      if (!user) throw new Error("Missing user");
      const rule = ruleData as any;

      // Determine scope and scopeId
      let scope: "organization" | "user";
      let scopeId: string;

      if (rule.scope === "organization") {
        if (!organizationId) throw new Error("Missing organizationId");
        scope = "organization";
        scopeId = organizationId;
      } else if (rule.scope === "user") {
        scope = "user";
        scopeId = user.uid;
      } else {
        throw new Error("Invalid scope - must be organization or user");
      }

      await createVaccinationRule(scope, user.uid, rule, scopeId);
    },
    updateFn: async (ruleId: string, updates) => {
      if (!user) throw new Error("Missing user");
      await updateVaccinationRule(ruleId, user.uid, updates as any);
    },
    deleteFn: async (ruleId: string) => {
      if (!user) throw new Error("Missing user");
      // Unassign horses from this rule first
      await unassignHorsesFromVaccinationRule(ruleId, user.uid);
      await deleteVaccinationRule(ruleId);
    },
    onSuccess: async () => {
      await cacheInvalidation.vaccinationRules.all();
    },
    successMessages: {
      create: t("horses:settings.vaccinationRules.messages.createSuccess"),
      update: t("horses:settings.vaccinationRules.messages.updateSuccess"),
      delete: t("horses:settings.vaccinationRules.messages.deleteSuccess"),
    },
  });

  if (stablesLoading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">
          {t("horses:settings.loading.stables")}
        </p>
      </div>
    );
  }

  if (!stableIdFromParams && stables.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">
              {t("horses:settings.noStables.title")}
            </h3>
            <p className="text-muted-foreground">
              {t("horses:settings.noStables.description")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper function to format period text
  const formatPeriod = (periodMonths: number, periodDays: number): string => {
    const parts: string[] = [];
    if (periodMonths > 0) {
      parts.push(
        `${periodMonths} ${t("horses:settings.vaccinationRules.months", { count: periodMonths })}`,
      );
    }
    if (periodDays > 0) {
      if (parts.length > 0) {
        parts.push(t("horses:settings.vaccinationRules.and"));
      }
      parts.push(
        `${periodDays} ${t("horses:settings.vaccinationRules.days", { count: periodDays })}`,
      );
    }
    return parts.join(" ");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        {stableIdFromParams && (
          <Link to={`/stables/${stableIdFromParams}`}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("horses:settings.navigation.backToStable")}
            </Button>
          </Link>
        )}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("horses:settings.page.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("horses:settings.page.description")}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Horse Groups Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("horses:settings.groups.title")}</CardTitle>
                <CardDescription>
                  {t("horses:settings.groups.description")}
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => groupDialog.openDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                {t("horses:settings.groups.addGroup")}
              </Button>
            </div>
          </CardHeader>
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

        {/* Vaccination Rules Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {t("horses:settings.vaccinationRules.title")}
                </CardTitle>
                <CardDescription>
                  {t("horses:settings.vaccinationRules.description")}
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => ruleDialog.openDialog()}
                title={t("horses:settings.vaccinationRules.addRule")}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("horses:settings.vaccinationRules.addRule")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {rulesLoading ? (
              <p className="text-sm text-muted-foreground">
                {t("horses:settings.loading.rules")}
              </p>
            ) : rulesData.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("horses:settings.vaccinationRules.noRules")}
              </p>
            ) : (
              <div className="space-y-2">
                {rulesData.map((rule) => {
                  const isStandard = isSystemRule(rule);
                  return (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{rule.name}</p>
                          {isStandard && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {t("horses:settings.vaccinationRules.standard")}
                            </span>
                          )}
                        </div>
                        {rule.description && (
                          <p className="text-sm text-muted-foreground mb-1">
                            {rule.description}
                          </p>
                        )}
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>
                            {t("horses:settings.vaccinationRules.period")}:{" "}
                            {formatPeriod(rule.periodMonths, rule.periodDays)}
                          </p>
                          <p>
                            {t(
                              "horses:settings.vaccinationRules.daysNotCompeting",
                            )}
                            : {rule.daysNotCompeting}
                          </p>
                        </div>
                      </div>
                      {!isStandard && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              ruleDialog.openDialog(rule as VaccinationRule)
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              removeRule(
                                rule.id,
                                t(
                                  "horses:settings.vaccinationRules.deleteConfirm",
                                ),
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
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

      <VaccinationRuleFormDialog
        open={ruleDialog.open}
        onOpenChange={ruleDialog.closeDialog}
        rule={ruleDialog.data}
        title={
          ruleDialog.data
            ? t("horses:settings.vaccinationRules.dialog.editTitle")
            : t("horses:settings.vaccinationRules.dialog.createTitle")
        }
        onSave={async (ruleData) => {
          if (ruleDialog.data) {
            await updateRule(ruleDialog.data.id, ruleData as any);
          } else {
            await createRule(ruleData as any);
          }
          ruleDialog.closeDialog();
        }}
      />
    </div>
  );
}
