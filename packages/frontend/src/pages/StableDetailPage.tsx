import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Settings,
  Calendar,
  BarChart3,
  Pencil,
  Trash2,
  Plus,
  Loader2Icon,
  House as HorseIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShiftTypeDialog } from "@/components/ShiftTypeDialog";
import { HorseCard } from "@/components/HorseCard";
import { EmptyState } from "@/components/EmptyState";
import {
  getShiftTypesByStable,
  createShiftType,
  updateShiftType,
  deleteShiftType,
} from "@/services/shiftTypeService";
import { getStableHorses } from "@/services/horseService";
import { getStable } from "@/services/stableService";
import type { ShiftType } from "@/types/schedule";
import type { Horse } from "@/types/roles";
import { useToast } from "@/hooks/use-toast";
import { useDialog } from "@/hooks/useDialog";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useCRUD } from "@/hooks/useCRUD";
import { useAuth } from "@/contexts/AuthContext";

interface Stable {
  id: string;
  name: string;
  description?: string;
  address?: string;
  ownerId: string;
  ownerEmail?: string;
}

export default function StableDetailPage() {
  const { t } = useTranslation(["stables", "common", "horses", "schedule"]);
  const { stableId } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();

  // Dialog state management
  const shiftTypeDialog = useDialog<ShiftType>();

  // Data loading with custom hooks
  const stable = useAsyncData<Stable | null>({
    loadFn: async () => {
      if (!stableId) return null;
      return (await getStable(stableId)) as Stable | null;
    },
    errorMessage: "Failed to load stable data. Please try again.",
  });

  const shiftTypes = useAsyncData<ShiftType[]>({
    loadFn: () => getShiftTypesByStable(stableId!),
    errorMessage: "Failed to load shift types. Please try again.",
  });

  const horses = useAsyncData<Horse[]>({
    loadFn: () => getStableHorses(stableId!),
    errorMessage: "Failed to load horses. Please try again.",
  });

  // Load data on mount
  useEffect(() => {
    if (stableId) {
      stable.load();
      shiftTypes.load();
      horses.load();
    }
  }, [stableId]);

  // CRUD operations for shift types
  const shiftTypeCRUD = useCRUD<ShiftType>({
    createFn: async (data) => {
      if (!stableId || !user)
        throw new Error("Stable ID and user are required");
      return await createShiftType(
        stableId,
        data as Omit<
          ShiftType,
          "id" | "stableId" | "createdAt" | "updatedAt" | "lastModifiedBy"
        >,
        user.uid,
      );
    },
    updateFn: async (id, data) => {
      if (!user) throw new Error("User is required");
      await updateShiftType(
        id,
        data as Omit<
          ShiftType,
          "id" | "stableId" | "createdAt" | "lastModifiedBy"
        >,
        user.uid,
      );
    },
    deleteFn: deleteShiftType,
    onSuccess: async () => {
      await shiftTypes.reload();
    },
    successMessages: {
      create: "Shift type created successfully",
      update: "Shift type updated successfully",
      delete: "Shift type deleted successfully",
    },
  });

  // Shift type handlers
  const handleSaveShiftType = async (
    data: Omit<ShiftType, "id" | "stableId" | "createdAt" | "updatedAt">,
  ) => {
    if (shiftTypeDialog.data) {
      await shiftTypeCRUD.update(shiftTypeDialog.data.id, data);
    } else {
      await shiftTypeCRUD.create(data);
    }
    shiftTypeDialog.closeDialog();
  };

  const handleDeleteShiftType = async (shiftType: ShiftType) => {
    await shiftTypeCRUD.remove(
      shiftType.id,
      `Are you sure you want to delete ${shiftType.name}? This action cannot be undone.`,
    );
  };

  const handleCreateShiftType = () => {
    shiftTypeDialog.openDialog();
  };

  const handleEditShiftType = (shiftType: ShiftType) => {
    shiftTypeDialog.openDialog(shiftType);
  };

  if (stable.loading || !stable.data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <Link to="/stables">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("common:navigation.stables")}
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {stable.data.name}
            </h1>
            {stable.data.description && (
              <p className="text-muted-foreground mt-1">
                {stable.data.description}
              </p>
            )}
            {stable.data.address && (
              <p className="text-sm text-muted-foreground mt-1">
                {stable.data.address}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Link to={`/stables/${stableId}/schedule`}>
              <Button variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                {t("stables:schedule.title")}
              </Button>
            </Link>
            <Link to={`/stables/${stableId}/settings`}>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                {t("common:navigation.settings")}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("schedule:shiftTypes.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shiftTypes.data?.length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("stables:members.owner")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {stable.data.ownerEmail || t("common:labels.noData")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("common:labels.status")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium text-green-600">
              {t("common:status.active")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="horses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="horses">
            <HorseIcon className="mr-2 h-4 w-4" />
            {t("common:navigation.horses")}
            <Badge variant="secondary" className="ml-2">
              {horses.data?.length || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="shifts">
            <Calendar className="mr-2 h-4 w-4" />
            {t("schedule:shiftTypes.title")}
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="mr-2 h-4 w-4" />
            {t("schedule:statistics.title")}
          </TabsTrigger>
        </TabsList>

        {/* Horses Tab */}
        <TabsContent value="horses" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              {t("stables:members.title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {horses.data?.length || 0}{" "}
              {t("common:navigation.horses").toLowerCase()}
            </p>
          </div>

          {!horses.data || horses.data.length === 0 ? (
            <EmptyState
              icon={HorseIcon}
              title={t("horses:emptyState.title")}
              description={t("horses:emptyState.description")}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {horses.data.map((horse) => (
                <HorseCard
                  key={horse.id}
                  horse={horse}
                  showOwner={true}
                  showStable={false}
                  isOwner={false}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Shift Types Tab */}
        <TabsContent value="shifts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              {t("schedule:shiftTypes.title")}
            </h2>
            <Button onClick={handleCreateShiftType}>
              <Plus className="mr-2 h-4 w-4" />
              {t("schedule:shiftTypes.create")}
            </Button>
          </div>

          {shiftTypes.loading ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground text-center">
                  {t("common:labels.loading")}
                </p>
              </CardContent>
            </Card>
          ) : !shiftTypes.data || shiftTypes.data.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title={t("schedule:shiftTypes.emptyState.title")}
              description={t("schedule:shiftTypes.emptyState.description")}
              action={{
                label: t("schedule:shiftTypes.create"),
                onClick: handleCreateShiftType,
              }}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {shiftTypes.data.map((shiftType) => (
                <Card key={shiftType.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{shiftType.name}</CardTitle>
                        <CardDescription>{shiftType.time}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditShiftType(shiftType)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteShiftType(shiftType)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t("schedule:shiftTypes.form.points")}
                        </span>
                        <span className="font-medium">{shiftType.points}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t("schedule:shiftTypes.form.daysOfWeek")}
                        </span>
                        <span className="font-medium">
                          {shiftType.daysOfWeek.join(", ")}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-4">
          <h2 className="text-2xl font-semibold">
            {t("schedule:statistics.title")}
          </h2>
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground text-center py-12">
                {t("schedule:statistics.comingSoon")}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Shift Type Dialog */}
      <ShiftTypeDialog
        open={shiftTypeDialog.open}
        onOpenChange={(open) => !open && shiftTypeDialog.closeDialog()}
        onSave={handleSaveShiftType}
        shiftType={shiftTypeDialog.data}
        title={
          shiftTypeDialog.data
            ? t("schedule:shiftTypes.edit")
            : t("schedule:shiftTypes.create")
        }
      />
    </div>
  );
}
