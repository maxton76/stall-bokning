import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Settings, Bell, Users, Plus, Pencil, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { ActivityTypeFormDialog } from "@/components/ActivityTypeFormDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStables } from "@/hooks/useUserStables";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useCRUD } from "@/hooks/useCRUD";
import { useDialog } from "@/hooks/useDialog";
import type { ActivityTypeConfig } from "@/types/activity";
import {
  getActivityTypesByStable,
  createActivityType,
  updateActivityType,
  deleteActivityType,
  seedStandardActivityTypes,
} from "@/services/activityTypeService";
import { translateRoles } from "@/lib/activityTranslations";
import { useTranslatedActivityTypes } from "@/hooks/useTranslatedActivityTypes";

export default function ActivitiesSettingsPage() {
  const { t } = useTranslation(["activities", "common"]);
  const { user } = useAuth();
  const [selectedStableId, setSelectedStableId] = useState<string>("");
  const translateActivityType = useTranslatedActivityTypes();

  // Track which stables have had seeding attempted to prevent infinite loops
  const seedAttemptedRef = useRef<Set<string>>(new Set());

  // Dialog state using useDialog hook
  const formDialog = useDialog<ActivityTypeConfig>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingType, setDeletingType] = useState<
    ActivityTypeConfig | undefined
  >();

  // Load user's stables
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);

  // Auto-select first stable
  useEffect(() => {
    if (stables.length > 0 && !selectedStableId && stables[0]) {
      setSelectedStableId(stables[0].id);
    }
  }, [stables, selectedStableId]);

  // Load activity types for selected stable
  const activityTypes = useAsyncData<ActivityTypeConfig[]>({
    loadFn: async () => {
      if (!selectedStableId) return [];
      return await getActivityTypesByStable(selectedStableId, false); // Include inactive
    },
  });

  // Reload types when stable changes
  useEffect(() => {
    if (selectedStableId) {
      activityTypes.load();
    }
  }, [selectedStableId]);

  // Seed standard types if none exist (only attempt once per stable to prevent infinite loops)
  useEffect(() => {
    const seedIfNeeded = async () => {
      // Skip if already attempted for this stable
      if (seedAttemptedRef.current.has(selectedStableId)) {
        return;
      }

      if (
        selectedStableId &&
        activityTypes.data &&
        activityTypes.data.length === 0 &&
        user
      ) {
        // Mark as attempted BEFORE the async call to prevent race conditions
        seedAttemptedRef.current.add(selectedStableId);

        try {
          await seedStandardActivityTypes(selectedStableId, user.uid);
          activityTypes.load();
        } catch (error) {
          console.error("Failed to seed activity types:", error);
          // Note: We keep the stable in seedAttemptedRef to prevent infinite retries
          // User can manually trigger a refresh or navigate away and back if needed
        }
      }
    };
    seedIfNeeded();
  }, [selectedStableId, activityTypes.data, user]);

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailReminders: true,
    activityAssigned: true,
    taskCompleted: false,
    careActivityDue: true,
    dailyDigest: false,
  });

  const handleNotificationChange = (key: string) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  // CRUD operations using useCRUD hook
  const { create, update, remove } = useCRUD<ActivityTypeConfig>({
    createFn: async (data: any) => {
      if (!user || !selectedStableId) throw new Error("Missing required data");
      const nextSortOrder = (activityTypes.data || []).length + 1;
      return await createActivityType(user.uid, selectedStableId, {
        ...data,
        isStandard: false,
        isActive: true,
        sortOrder: nextSortOrder,
      });
    },
    updateFn: async (id, data) => {
      if (!user) throw new Error("User not authenticated");
      await updateActivityType(id, user.uid, data);
    },
    deleteFn: async (id) => {
      if (!user) throw new Error("User not authenticated");
      await deleteActivityType(id, user.uid);
    },
    onSuccess: async () => {
      await activityTypes.reload();
    },
    successMessages: {
      create: t("activities:types.messages.createSuccess"),
      update: t("activities:types.messages.updateSuccess"),
      delete: t("activities:types.messages.deleteSuccess"),
    },
  });

  // Handlers
  const handleAdd = () => {
    formDialog.openDialog();
  };

  const handleEdit = (type: ActivityTypeConfig) => {
    formDialog.openDialog(type);
  };

  const handleDelete = (type: ActivityTypeConfig) => {
    setDeletingType(type);
    setDeleteDialogOpen(true);
  };

  const handleSave = async (data: {
    name: string;
    color: string;
    category: "Sport" | "Care" | "Breeding";
    roles: string[];
    icon?: string;
  }) => {
    if (formDialog.data) {
      // Update existing type
      await update(formDialog.data.id, data);
    } else {
      // Create new type
      await create(data);
    }
    formDialog.closeDialog();
  };

  const confirmDelete = async () => {
    if (!deletingType) return;
    await remove(deletingType.id);
    setDeleteDialogOpen(false);
    setDeletingType(undefined);
  };

  // Group types by category
  const groupedTypes = (activityTypes.data || []).reduce(
    (acc, type) => {
      if (!acc[type.category]) acc[type.category] = [];
      acc[type.category]!.push(type);
      return acc;
    },
    {} as Record<string, ActivityTypeConfig[]>,
  );

  if (stablesLoading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">
          {t("activities:stable.loading")}
        </p>
      </div>
    );
  }

  if (stables.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">
              {t("activities:emptyState.noStables.title")}
            </h3>
            <p className="text-muted-foreground">
              {t("activities:emptyState.noStables.settings")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("activities:settings.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("activities:settings.description")}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Activity Types Management */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("activities:settings.types.title")}</CardTitle>
                <CardDescription>
                  {t("activities:settings.types.description")}
                </CardDescription>
              </div>
              <Button onClick={handleAdd} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                {t("activities:settings.types.addCustom")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {activityTypes.loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {t("activities:settings.types.loading")}
                </p>
              </div>
            ) : (activityTypes.data || []).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {t("activities:settings.types.noTypes")}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Table by Category */}
                {(["Care", "Sport", "Breeding"] as const).map((category) => {
                  const types = groupedTypes[category] || [];
                  if (types.length === 0) return null;

                  const categoryKey = category.toLowerCase() as
                    | "care"
                    | "sport"
                    | "breeding";

                  return (
                    <div key={category} className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        {t(
                          `activities:settings.types.categories.${categoryKey}`,
                        )}
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              {t("activities:settings.types.table.name")}
                            </TableHead>
                            <TableHead>
                              {t("activities:settings.types.table.roles")}
                            </TableHead>
                            <TableHead>
                              {t("activities:settings.types.table.status")}
                            </TableHead>
                            <TableHead className="w-24 text-right">
                              {t("activities:settings.types.table.actions")}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {types.map((type) => (
                            <TableRow key={type.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="px-3 py-1.5 rounded-md font-medium text-sm w-32"
                                    style={{
                                      backgroundColor: type.color,
                                      color: "#000",
                                      opacity: 0.85,
                                    }}
                                  >
                                    {translateActivityType(type)}
                                  </div>
                                  {type.isStandard && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {t("activities:types.standard")}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {translateRoles(type.roles)}
                              </TableCell>
                              <TableCell>
                                {type.isActive ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-green-50 text-green-700"
                                  >
                                    {t("common:labels.active")}
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="bg-gray-50 text-gray-700"
                                  >
                                    {t("common:labels.inactive")}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEdit(type)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  {!type.isStandard && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDelete(type)}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>
              {t("activities:settings.notifications.title")}
            </CardTitle>
            <CardDescription>
              {t("activities:settings.notifications.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-reminders">
                  {t("activities:settings.notifications.emailReminders.label")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "activities:settings.notifications.emailReminders.description",
                  )}
                </p>
              </div>
              <Switch
                id="email-reminders"
                checked={notificationSettings.emailReminders}
                onCheckedChange={() =>
                  handleNotificationChange("emailReminders")
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="activity-assigned">
                  {t(
                    "activities:settings.notifications.activityAssigned.label",
                  )}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "activities:settings.notifications.activityAssigned.description",
                  )}
                </p>
              </div>
              <Switch
                id="activity-assigned"
                checked={notificationSettings.activityAssigned}
                onCheckedChange={() =>
                  handleNotificationChange("activityAssigned")
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="task-completed">
                  {t("activities:settings.notifications.taskCompleted.label")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "activities:settings.notifications.taskCompleted.description",
                  )}
                </p>
              </div>
              <Switch
                id="task-completed"
                checked={notificationSettings.taskCompleted}
                onCheckedChange={() =>
                  handleNotificationChange("taskCompleted")
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="care-activity-due">
                  {t("activities:settings.notifications.careActivityDue.label")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "activities:settings.notifications.careActivityDue.description",
                  )}
                </p>
              </div>
              <Switch
                id="care-activity-due"
                checked={notificationSettings.careActivityDue}
                onCheckedChange={() =>
                  handleNotificationChange("careActivityDue")
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="daily-digest">
                  {t("activities:settings.notifications.dailyDigest.label")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "activities:settings.notifications.dailyDigest.description",
                  )}
                </p>
              </div>
              <Switch
                id="daily-digest"
                checked={notificationSettings.dailyDigest}
                onCheckedChange={() => handleNotificationChange("dailyDigest")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Default Assignees */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>{t("activities:settings.assignees.title")}</CardTitle>
            <CardDescription>
              {t("activities:settings.assignees.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-assign-self">
                    {t("activities:settings.assignees.autoAssignSelf.label")}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "activities:settings.assignees.autoAssignSelf.description",
                    )}
                  </p>
                </div>
                <Switch id="auto-assign-self" />
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {t("activities:settings.assignees.note")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="text-muted-foreground">
              <Settings className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {t("activities:settings.about.title")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("activities:settings.about.description")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <ActivityTypeFormDialog
        open={formDialog.open}
        onOpenChange={formDialog.closeDialog}
        activityType={formDialog.data || undefined}
        onSave={handleSave}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("activities:settings.types.delete.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("activities:settings.types.delete.description", {
                name: translateActivityType(deletingType),
              })}
              {deletingType?.isStandard
                ? ` ${t("activities:settings.types.delete.standardNote")}`
                : ` ${t("activities:settings.types.delete.customNote")}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:buttons.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              {t("common:buttons.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
