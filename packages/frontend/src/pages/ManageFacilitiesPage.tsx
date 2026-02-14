import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useDialog } from "@/hooks/useDialog";
import { useCRUD } from "@/hooks/useCRUD";
import { useUserStables } from "@/hooks/useUserStables";
import { useDefaultStableId } from "@/hooks/useUserPreferences";
import { useOrgPermissions } from "@/hooks/useOrgPermissions";
import { queryKeys, cacheInvalidation } from "@/lib/queryClient";
import {
  getFacilitiesByStable,
  createFacility,
  updateFacility,
  deleteFacility,
} from "@/services/facilityService";
import type {
  Facility,
  FacilityType,
  FacilityAvailabilitySchedule,
  CreateFacilityData,
  UpdateFacilityData,
} from "@/types/facility";

type FacilitySaveData = (CreateFacilityData | UpdateFacilityData) & {
  availabilitySchedule?: FacilityAvailabilitySchedule;
};
import { useToast } from "@/hooks/use-toast";
import { FacilityFormDialog } from "@/components/FacilityFormDialog";

const STATUS_COLORS = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  maintenance: "bg-yellow-100 text-yellow-800",
};

export default function ManageFacilitiesPage() {
  const { t } = useTranslation(["facilities", "common", "constants"]);
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganization();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStableId, setSelectedStableId] = useState<string>("");
  const facilityDialog = useDialog<Facility>();

  // Helper function to get translated facility type
  const getFacilityTypeLabel = (type: FacilityType) =>
    t(`constants:facilityTypes.${type}`);

  // Check permissions
  const { hasPermission, isLoading: permissionsLoading } = useOrgPermissions(
    currentOrganizationId,
  );

  // Load user's stables
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);
  const defaultStableId = useDefaultStableId();

  // Auto-select default stable (or first) when stables load
  useEffect(() => {
    if (stables.length > 0 && !selectedStableId) {
      const preferred =
        defaultStableId && stables.some((s) => s.id === defaultStableId)
          ? defaultStableId
          : stables[0]?.id;
      setSelectedStableId(preferred ?? "");
    }
  }, [stables, selectedStableId, defaultStableId]);

  // Load facilities for selected stable
  const facilitiesQuery = useApiQuery<Facility[]>(
    queryKeys.facilities.list({ stableId: selectedStableId }),
    () => getFacilitiesByStable(selectedStableId),
    {
      enabled: !!selectedStableId,
      staleTime: 5 * 60 * 1000,
    },
  );
  const facilitiesData = facilitiesQuery.data ?? [];
  const facilitiesLoading = facilitiesQuery.isLoading;

  // CRUD operations
  const { create, update, remove } = useCRUD<Facility>({
    createFn: async (data) => {
      if (!selectedStableId || !user) throw new Error("Missing required data");
      return await createFacility(
        selectedStableId,
        data as CreateFacilityData,
        user.uid,
      );
    },
    updateFn: async (id, data) => {
      if (!user) throw new Error("User not authenticated");
      await updateFacility(id, data as UpdateFacilityData, user.uid);
    },
    deleteFn: async (id) => {
      if (!user) throw new Error("User not authenticated");
      await deleteFacility(id, user.uid);
    },
    onSuccess: async () => {
      await cacheInvalidation.facilities.all();
    },
    successMessages: {
      create: t("facilities:messages.createSuccess"),
      update: t("facilities:messages.updateSuccess"),
      delete: t("facilities:messages.deleteSuccess"),
    },
  });

  // Filter facilities by search query
  const filteredFacilities = useMemo(() => {
    if (facilitiesData.length === 0) return [];

    if (!searchQuery.trim()) return facilitiesData;

    const query = searchQuery.toLowerCase();

    return facilitiesData.filter(
      (facility) =>
        facility.name.toLowerCase().includes(query) ||
        getFacilityTypeLabel(facility.type).toLowerCase().includes(query),
    );
  }, [facilitiesData, searchQuery]);

  const handleAddFacility = () => {
    facilityDialog.openDialog();
  };

  const handleEditFacility = (facility: Facility) => {
    facilityDialog.openDialog(facility);
  };

  const handleDeleteFacility = async (facility: Facility) => {
    if (confirm(t("common:messages.confirmDelete"))) {
      await remove(facility.id);
    }
  };

  const handleSaveFacility = async (data: FacilitySaveData) => {
    try {
      if (facilityDialog.data) {
        // Update existing facility
        await update(facilityDialog.data.id, data as UpdateFacilityData);
      } else {
        // Create new facility
        await create(data as CreateFacilityData);
      }
      facilityDialog.closeDialog();
    } catch (error) {
      console.error("Failed to save facility:", error);
      toast({
        title: t("common:messages.error"),
        description: t("common:messages.saveFailed"),
        variant: "destructive",
      });
    }
  };

  // Loading state - wait for both permissions and stables
  if (permissionsLoading || stablesLoading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">{t("common:labels.loading")}</p>
      </div>
    );
  }

  // Permission check - user must have manage_facilities permission
  if (!hasPermission("manage_facilities")) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">
              {t("common:messages.unauthorized")}
            </h3>
            <p className="text-muted-foreground">
              {t("facilities:messages.noPermission")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (stables.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">
              {t("facilities:emptyState.title")}
            </h3>
            <p className="text-muted-foreground">
              {t("facilities:emptyState.description")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("facilities:page.manageTitle")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("facilities:page.manageDescription")}
          </p>
        </div>
        <Button onClick={handleAddFacility} disabled={!selectedStableId}>
          <Plus className="mr-2 h-4 w-4" />
          {t("facilities:actions.addFacility")}
        </Button>
      </div>

      {/* Stable Selector */}
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                {t("common:navigation.stables")}
              </label>
              <Select
                value={selectedStableId}
                onValueChange={setSelectedStableId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("common:navigation.stables")} />
                </SelectTrigger>
                <SelectContent>
                  {stables.map((stable) => (
                    <SelectItem key={stable.id} value={stable.id}>
                      {stable.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search */}
      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("common:buttons.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Facilities Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t("facilities:page.title")} ({filteredFacilities.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredFacilities.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery
                  ? t("common:messages.noResults")
                  : t("facilities:emptyState.title")}
              </p>
              {!searchQuery && (
                <Button
                  onClick={handleAddFacility}
                  variant="outline"
                  className="mt-4"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t("facilities:actions.addFacility")}
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common:labels.name")}</TableHead>
                    <TableHead>{t("common:labels.type")}</TableHead>
                    <TableHead>{t("common:labels.status")}</TableHead>
                    <TableHead>
                      {t("facilities:form.sections.availability")}
                    </TableHead>
                    <TableHead>
                      {t("facilities:bookingRules.maxHorsesPerReservation")}
                    </TableHead>
                    <TableHead>
                      {t("facilities:bookingRules.minSlotDuration")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("common:labels.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFacilities.map((facility) => (
                    <TableRow key={facility.id}>
                      <TableCell className="font-medium">
                        {facility.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getFacilityTypeLabel(facility.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[facility.status]}>
                          {t(`constants:facilityStatus.${facility.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {facility.availableFrom} - {facility.availableTo}
                      </TableCell>
                      <TableCell>{facility.maxHorsesPerReservation}</TableCell>
                      <TableCell>
                        {facility.minTimeSlotDuration
                          ? `${facility.minTimeSlotDuration} min`
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditFacility(facility)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteFacility(facility)}
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

      {/* Facility Form Dialog */}
      <FacilityFormDialog
        open={facilityDialog.open}
        onOpenChange={facilityDialog.closeDialog}
        facility={facilityDialog.data || undefined}
        onSave={handleSaveFacility}
      />
    </div>
  );
}
