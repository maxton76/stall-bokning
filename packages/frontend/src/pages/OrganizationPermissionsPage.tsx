import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Shield, Check, X, Lock, Info, RotateCcw, Save } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useFeatureToggle } from "@/hooks/useFeatureToggle";
import { useOrgPermissions } from "@/hooks/useOrgPermissions";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { apiClient } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import type {
  PermissionAction,
  PermissionCategory,
  OrganizationRole,
} from "@equiduty/shared";
import {
  PERMISSION_ACTIONS,
  PERMISSION_CATEGORIES,
  PROTECTED_PERMISSIONS,
  DEFAULT_PERMISSION_MATRIX,
} from "@equiduty/shared";
import type { PermissionMatrix } from "@equiduty/shared";

/** All 16 organization roles in display order. */
const ALL_ROLES: OrganizationRole[] = [
  "administrator",
  "stable_manager",
  "schedule_planner",
  "bookkeeper",
  "groom",
  "trainer",
  "training_admin",
  "horse_owner",
  "rider",
  "customer",
  "veterinarian",
  "farrier",
  "dentist",
  "saddle_maker",
  "inseminator",
  "support_contact",
];

/** Role groups for desktop table filtering. */
const ROLE_GROUPS: Record<string, readonly OrganizationRole[]> = {
  all: ALL_ROLES,
  staff: [
    "administrator",
    "stable_manager",
    "schedule_planner",
    "bookkeeper",
    "support_contact",
    "groom",
  ],
  professionals: [
    "veterinarian",
    "farrier",
    "dentist",
    "saddle_maker",
    "inseminator",
  ],
  owners: ["horse_owner", "rider", "customer"],
  training: ["trainer", "training_admin"],
};

const ROLE_GROUP_KEYS = Object.keys(
  ROLE_GROUPS,
) as (keyof typeof ROLE_GROUPS)[];

/** Role display colors for column headers. */
const ROLE_COLORS: Record<string, string> = {
  administrator: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  stable_manager:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  schedule_planner:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  bookkeeper: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  groom: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  trainer:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  training_admin:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  horse_owner:
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  rider: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  customer: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  veterinarian: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  farrier: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  dentist: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  saddle_maker:
    "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
  inseminator:
    "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
  support_contact:
    "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
};

/** i18n keys for role names (nested label key under invite section). */
const ROLE_I18N: Record<OrganizationRole, string> = {
  administrator: "invite.roles.administrator.label",
  stable_manager: "invite.roles.stable_manager.label",
  schedule_planner: "invite.roles.schedule_planner.label",
  bookkeeper: "invite.roles.bookkeeper.label",
  groom: "invite.roles.groom.label",
  trainer: "invite.roles.trainer.label",
  training_admin: "invite.roles.training_admin.label",
  horse_owner: "invite.roles.horse_owner.label",
  rider: "invite.roles.rider.label",
  customer: "invite.roles.customer.label",
  veterinarian: "invite.roles.veterinarian.label",
  farrier: "invite.roles.farrier.label",
  dentist: "invite.roles.dentist.label",
  saddle_maker: "invite.roles.saddle_maker.label",
  inseminator: "invite.roles.inseminator.label",
  support_contact: "invite.roles.support_contact.label",
};

interface MatrixResponse {
  matrix: PermissionMatrix;
  isCustom: boolean;
}

/** Group permission actions by category for rendering. */
function groupByCategory(
  actions: typeof PERMISSION_ACTIONS,
): Record<PermissionCategory, typeof PERMISSION_ACTIONS> {
  const groups = {} as Record<PermissionCategory, typeof PERMISSION_ACTIONS>;
  for (const meta of actions) {
    if (!groups[meta.category]) groups[meta.category] = [];
    groups[meta.category].push(meta);
  }
  return groups;
}

/** Maps permission categories to feature toggle keys. Categories not listed are always visible. */
const CATEGORY_FEATURE_MAP: Partial<Record<PermissionCategory, string>> = {
  billing: "invoicing",
  lessons: "rideLessons",
  integrations: "integrations",
};

/** Category display order. */
const CATEGORY_ORDER: PermissionCategory[] = [
  "organization",
  "billing",
  "stables",
  "horses",
  "scheduling",
  "activities",
  "lessons",
  "facilities",
  "records",
  "integrations",
];

export default function OrganizationPermissionsPage() {
  const { t } = useTranslation(["organizations", "common"]);
  const { currentOrganizationId } = useOrganization();
  const { isFeatureAvailable } = useSubscription();
  const { isFeatureEnabled } = useFeatureToggle();
  const { hasPermission, isLoading: permLoading } = useOrgPermissions(
    currentOrganizationId,
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canEdit =
    hasPermission("manage_org_settings") &&
    isFeatureAvailable("advancedPermissions");
  const hasManageSettings = hasPermission("manage_org_settings");

  // Fetch the current effective matrix
  const { data: matrixData, isLoading: matrixLoading } =
    useApiQuery<MatrixResponse>(
      ["permission-matrix", currentOrganizationId],
      () =>
        apiClient.get<MatrixResponse>(
          `/organizations/${currentOrganizationId}/permissions`,
        ),
      {
        enabled: !!currentOrganizationId,
        staleTime: 5 * 60 * 1000,
      },
    );

  // Local editable copy of the matrix
  const [editMatrix, setEditMatrix] = useState<PermissionMatrix | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Desktop role group selection
  const [roleGroup, setRoleGroup] = useState<string>("all");
  const visibleRoles = ROLE_GROUPS[roleGroup] as OrganizationRole[];

  // Mobile role selection
  const [selectedRole, setSelectedRole] =
    useState<OrganizationRole>("administrator");

  // Initialize editMatrix from server data
  const matrix = editMatrix ?? matrixData?.matrix ?? DEFAULT_PERMISSION_MATRIX;

  // Save mutation
  const saveMutation = useApiMutation(
    (updatedMatrix: PermissionMatrix) =>
      apiClient.put(`/organizations/${currentOrganizationId}/permissions`, {
        matrix: updatedMatrix,
      }),
    {
      successMessage: t("organizations:permissions.messages.saveSuccess"),
      errorMessage: t("organizations:permissions.messages.saveError"),
      onSuccess: () => {
        setIsDirty(false);
        setEditMatrix(null);
        queryClient.invalidateQueries({
          queryKey: ["permission-matrix", currentOrganizationId],
        });
        queryClient.invalidateQueries({
          queryKey: ["org-permissions", currentOrganizationId],
        });
      },
    },
  );

  // Reset mutation
  const resetMutation = useApiMutation(
    () =>
      apiClient.post(
        `/organizations/${currentOrganizationId}/permissions/reset`,
      ),
    {
      successMessage: t("organizations:permissions.messages.resetSuccess"),
      errorMessage: t("organizations:permissions.messages.resetError"),
      onSuccess: () => {
        setIsDirty(false);
        setEditMatrix(null);
        queryClient.invalidateQueries({
          queryKey: ["permission-matrix", currentOrganizationId],
        });
        queryClient.invalidateQueries({
          queryKey: ["org-permissions", currentOrganizationId],
        });
      },
    },
  );

  const grouped = useMemo(() => groupByCategory(PERMISSION_ACTIONS), []);

  /** Categories filtered by feature toggles. */
  const visibleCategories = useMemo(
    () =>
      CATEGORY_ORDER.filter((category) => {
        const featureKey = CATEGORY_FEATURE_MAP[category];
        return !featureKey || isFeatureEnabled(featureKey);
      }),
    [isFeatureEnabled],
  );

  const isProtected = useCallback(
    (action: PermissionAction, role: OrganizationRole) =>
      role === "administrator" &&
      (PROTECTED_PERMISSIONS as readonly string[]).includes(action),
    [],
  );

  const togglePermission = useCallback(
    (action: PermissionAction, role: OrganizationRole) => {
      if (!canEdit) return;
      if (isProtected(action, role)) {
        toast({
          title: t("organizations:permissions.messages.protectedPermission"),
          variant: "destructive",
        });
        return;
      }

      setEditMatrix((prev) => {
        const current = prev ?? matrixData?.matrix ?? DEFAULT_PERMISSION_MATRIX;
        const roleEntry = { ...current[action] };
        if (roleEntry[role]) {
          delete roleEntry[role];
        } else {
          roleEntry[role] = true;
        }
        return { ...current, [action]: roleEntry };
      });
      setIsDirty(true);
    },
    [canEdit, isProtected, matrixData, toast, t],
  );

  const handleSave = () => {
    if (editMatrix) {
      saveMutation.mutate(editMatrix);
    }
  };

  const handleReset = () => {
    if (window.confirm(t("organizations:permissions.buttons.resetConfirm"))) {
      resetMutation.mutate(undefined as never);
    }
  };

  const isLoading = permLoading || matrixLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-4 bg-muted rounded w-96" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("organizations:permissions.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("organizations:permissions.description")}
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={resetMutation.isPending}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t("organizations:permissions.buttons.reset")}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || saveMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending
                ? t("organizations:permissions.buttons.saving")
                : t("organizations:permissions.buttons.save")}
            </Button>
          </div>
        )}
      </div>

      {/* Read-only upgrade notice */}
      {hasManageSettings && !isFeatureAvailable("advancedPermissions") && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {t("organizations:permissions.matrix.readOnlyDescription")}
          </AlertDescription>
        </Alert>
      )}

      {/* Permission Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("organizations:permissions.matrix.title")}
          </CardTitle>
          <CardDescription>
            {t("organizations:permissions.matrix.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop/Wide Screen: Full Matrix Table */}
          <div className="hidden lg:block overflow-visible">
            <Tabs
              value={roleGroup}
              onValueChange={setRoleGroup}
              className="px-4 pt-4"
            >
              <TabsList>
                {ROLE_GROUP_KEYS.map((key) => (
                  <TabsTrigger key={key} value={key}>
                    {t(`organizations:permissions.roleGroups.${key}`)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <TooltipProvider>
              <table className="w-full border-collapse table-auto">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold sticky left-0 bg-background z-10 w-48 lg:w-1/6">
                      {t("organizations:permissions.matrix.action")}
                    </th>
                    {visibleRoles.map((role) => (
                      <th key={role} className="text-center p-2 w-20 lg:flex-1">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] leading-tight ${ROLE_COLORS[role] ?? ""}`}
                        >
                          {t(`organizations:${ROLE_I18N[role]}`)}
                        </Badge>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleCategories.map((category) => {
                    const actions = grouped[category];
                    if (!actions?.length) return null;
                    return (
                      <CategoryGroup
                        key={category}
                        category={category}
                        actions={actions}
                        roles={visibleRoles}
                        matrix={matrix}
                        canEdit={canEdit}
                        isProtected={isProtected}
                        togglePermission={togglePermission}
                        t={t}
                      />
                    );
                  })}
                </tbody>
              </table>
            </TooltipProvider>
          </div>

          {/* Mobile/Tablet: Role Dropdown + Permission List */}
          <div className="lg:hidden space-y-4 p-6">
            <MobileRoleSelector
              selectedRole={selectedRole}
              onRoleChange={setSelectedRole}
              t={t}
            />
            <MobilePermissionList
              role={selectedRole}
              matrix={matrix}
              canEdit={canEdit}
              isProtected={isProtected}
              togglePermission={togglePermission}
              grouped={grouped}
              categories={visibleCategories}
              t={t}
            />
          </div>
        </CardContent>
      </Card>

      {/* Custom Roles info */}
      {!isFeatureAvailable("advancedPermissions") && (
        <Card>
          <CardHeader>
            <CardTitle>
              {t("organizations:permissions.customRoles.title")}
            </CardTitle>
            <CardDescription>
              {t("organizations:permissions.customRoles.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t("organizations:permissions.customRoles.explanation")}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>
                {t("organizations:permissions.customRoles.specializedRoles")}
              </strong>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

interface CategoryGroupProps {
  category: PermissionCategory;
  actions: typeof PERMISSION_ACTIONS;
  roles: OrganizationRole[];
  matrix: PermissionMatrix;
  canEdit: boolean;
  isProtected: (action: PermissionAction, role: OrganizationRole) => boolean;
  togglePermission: (action: PermissionAction, role: OrganizationRole) => void;
  t: (key: string) => string;
}

function CategoryGroup({
  category,
  actions,
  roles,
  matrix,
  canEdit,
  isProtected,
  togglePermission,
  t,
}: CategoryGroupProps) {
  return (
    <>
      {/* Category header row */}
      <tr className="bg-muted/50">
        <td
          colSpan={roles.length + 1}
          className="p-2 pl-3 font-semibold text-sm text-muted-foreground uppercase tracking-wider sticky left-0"
        >
          {t(`organizations:${PERMISSION_CATEGORIES[category]}`)}
        </td>
      </tr>
      {/* Action rows */}
      {actions.map((meta) => (
        <tr
          key={meta.action}
          className="border-b hover:bg-accent/50 transition-colors"
        >
          <td className="p-3 text-sm sticky left-0 bg-background w-48 lg:w-auto">
            {t(`organizations:${meta.i18nKey}`)}
          </td>
          {roles.map((role) => {
            const granted = matrix[meta.action]?.[role] === true;
            const locked = isProtected(meta.action, role);
            return (
              <td key={role} className="text-center p-2">
                <PermissionCell
                  granted={granted}
                  locked={locked}
                  canEdit={canEdit}
                  onToggle={() => togglePermission(meta.action, role)}
                  t={t}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

interface PermissionCellProps {
  granted: boolean;
  locked: boolean;
  canEdit: boolean;
  onToggle: () => void;
  t: (key: string) => string;
}

function PermissionCell({
  granted,
  locked,
  canEdit,
  onToggle,
  t,
}: PermissionCellProps) {
  // Protected permission — always shown as locked check
  if (locked) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center justify-center">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {t("organizations:permissions.messages.protectedPermission")}
        </TooltipContent>
      </Tooltip>
    );
  }

  // Editable mode — use checkboxes
  if (canEdit) {
    return (
      <Checkbox
        checked={granted ?? false}
        onCheckedChange={onToggle}
        className="mx-auto"
      />
    );
  }

  // Read-only — show check/X icons
  return granted ? (
    <Check className="mx-auto h-4 w-4 text-green-600" />
  ) : (
    <X className="mx-auto h-4 w-4 text-muted-foreground/40" />
  );
}

// ─── Mobile Components ───────────────────────────────────────────

interface MobileRoleSelectorProps {
  selectedRole: OrganizationRole;
  onRoleChange: (role: OrganizationRole) => void;
  t: (key: string) => string;
}

function MobileRoleSelector({
  selectedRole,
  onRoleChange,
  t,
}: MobileRoleSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {t("organizations:permissions.mobile.selectRole")}
      </label>
      <Select value={selectedRole} onValueChange={onRoleChange}>
        <SelectTrigger>
          <SelectValue>
            <span
              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[selectedRole]}`}
            >
              {t(`organizations:${ROLE_I18N[selectedRole]}`)}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {ALL_ROLES.map((role) => (
            <SelectItem key={role} value={role}>
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[role]}`}
              >
                {t(`organizations:${ROLE_I18N[role]}`)}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface MobilePermissionListProps {
  role: OrganizationRole;
  matrix: PermissionMatrix;
  canEdit: boolean;
  isProtected: (action: PermissionAction, role: OrganizationRole) => boolean;
  togglePermission: (action: PermissionAction, role: OrganizationRole) => void;
  grouped: Record<PermissionCategory, typeof PERMISSION_ACTIONS>;
  categories: PermissionCategory[];
  t: (key: string) => string;
}

function MobilePermissionList({
  role,
  matrix,
  canEdit,
  isProtected,
  togglePermission,
  grouped,
  categories,
  t,
}: MobilePermissionListProps) {
  return (
    <div className="space-y-4">
      {categories.map((category) => {
        const actions = grouped[category];
        if (!actions?.length) return null;

        return (
          <div key={category} className="space-y-2">
            {/* Category Header */}
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2 bg-muted/50 rounded">
              {t(`organizations:${PERMISSION_CATEGORIES[category]}`)}
            </h3>

            {/* Permission Items */}
            <div className="space-y-1">
              {actions.map((meta) => {
                const granted = matrix[meta.action]?.[role] === true;
                const locked = isProtected(meta.action, role);

                return (
                  <div
                    key={meta.action}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <span className="text-sm flex-1">
                      {t(`organizations:${meta.i18nKey}`)}
                    </span>
                    <PermissionCell
                      granted={granted}
                      locked={locked}
                      canEdit={canEdit}
                      onToggle={() => togglePermission(meta.action, role)}
                      t={t}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
