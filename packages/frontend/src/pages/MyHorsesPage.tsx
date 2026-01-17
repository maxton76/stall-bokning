import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2Icon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { HorseFormDialog } from "@/components/HorseFormDialog";
import { HorseAssignmentDialog } from "@/components/HorseAssignmentDialog";
import { VaccinationRecordDialog } from "@/components/VaccinationRecordDialog";
import { VaccinationHistoryTable } from "@/components/VaccinationHistoryTable";
import { HorseTable } from "@/components/horses/HorseTable";
import {
  HorseFilterPopover,
  HorseFilterBadges,
} from "@/components/HorseFilterPopover";
import { HorseExportButton } from "@/components/horses/HorseExportButton";
import { createHorseTableColumns } from "@/components/horses/HorseTableColumns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Horse } from "@/types/roles";
import type { VaccinationRecord } from "@shared/types/vaccination";
import type { FilterConfig } from "@shared/types/filters";
import {
  getUserHorses,
  createHorse,
  updateHorse,
  deleteHorse,
  assignHorseToStable,
  unassignHorseFromStable,
} from "@/services/horseService";
import {
  getHorseVaccinationRecords,
  deleteVaccinationRecord,
} from "@/services/vaccinationService";
import { queryKeys } from "@/lib/queryClient";
import { useDialog } from "@/hooks/useDialog";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useCRUD } from "@/hooks/useCRUD";
import { useHorseFilters } from "@/hooks/useHorseFilters";
import { useUserStables } from "@/hooks/useUserStables";

export default function MyHorsesPage() {
  const { t } = useTranslation(["horses", "common"]);
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Data loading with custom hooks
  const horses = useAsyncData<Horse[]>({
    loadFn: () => getUserHorses(user!.uid),
    errorMessage: t("horses:messages.loadError"),
  });
  const { stables } = useUserStables(user?.uid);

  // Filtering with unified hook
  const {
    filters,
    setFilters,
    filteredHorses,
    activeFilterCount,
    hasActiveFilters,
    clearAllFilters,
    getActiveFilterBadges,
  } = useHorseFilters({
    horses: horses.data || [],
    initialFilters: { status: "active" },
  });

  // Filter configuration for MyHorsesPage
  const filterConfig: FilterConfig = {
    showSearch: false, // Search is external, not in popover
    showStable: true,
    showGender: true,
    showAge: true,
    showUsage: true,
    showGroups: false,
    showStatus: true,
  };

  // Dialog state management
  const formDialog = useDialog<Horse>();
  const assignmentDialog = useDialog<Horse>();
  const vaccinationRecordDialog = useDialog<VaccinationRecord>();
  const [vaccinationHistoryOpen, setVaccinationHistoryOpen] = useState(false);
  const [selectedHorseForVaccination, setSelectedHorseForVaccination] =
    useState<Horse | null>(null);

  // Fetch vaccination records for selected horse
  const {
    data: vaccinationRecords = [],
    isLoading: loadingVaccinationRecords,
  } = useQuery({
    queryKey: queryKeys.vaccinations.byHorse(
      selectedHorseForVaccination?.id || "",
    ),
    queryFn: async () => {
      if (!selectedHorseForVaccination?.id) return [];
      return await getHorseVaccinationRecords(selectedHorseForVaccination.id);
    },
    enabled: !!selectedHorseForVaccination?.id,
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // CRUD operations
  const horseCRUD = useCRUD<Horse>({
    createFn: (data) =>
      createHorse(
        user!.uid,
        data as Omit<
          Horse,
          "id" | "createdAt" | "updatedAt" | "ownerId" | "lastModifiedBy"
        >,
      ),
    updateFn: (id, data) =>
      updateHorse(
        id,
        user!.uid,
        data as Omit<
          Horse,
          "id" | "createdAt" | "updatedAt" | "ownerId" | "lastModifiedBy"
        >,
      ),
    deleteFn: (id) => deleteHorse(id),
    onSuccess: async () => {
      await horses.reload();
    },
    successMessages: {
      create: t("horses:messages.addSuccess"),
      update: t("horses:messages.updateSuccess"),
      delete: t("horses:messages.deleteSuccess"),
    },
  });

  // Load data on mount
  useEffect(() => {
    if (user) {
      horses.load();
    }
  }, [user]);

  // CRUD Handlers
  const handleCreateHorse = () => {
    formDialog.openDialog();
  };

  const handleEditHorse = (horse: Horse) => {
    formDialog.openDialog(horse);
  };

  const handleSaveHorse = async (
    horseData: Omit<
      Horse,
      | "id"
      | "ownerId"
      | "ownerName"
      | "ownerEmail"
      | "createdAt"
      | "updatedAt"
      | "lastModifiedBy"
    >,
  ) => {
    if (formDialog.data) {
      await horseCRUD.update(formDialog.data.id, horseData);
    } else {
      await horseCRUD.create(horseData);
    }
    formDialog.closeDialog();
  };

  const handleDeleteHorse = async (horse: Horse) => {
    await horseCRUD.remove(
      horse.id,
      t("horses:messages.confirmDelete", { name: horse.name }),
    );
  };

  // Assignment Handlers
  const handleAssignClick = (horse: Horse) => {
    assignmentDialog.openDialog(horse);
  };

  const handleAssign = async (
    horseId: string,
    stableId: string,
    stableName: string,
  ) => {
    if (!user) return;

    try {
      await assignHorseToStable(horseId, stableId, stableName, user.uid);
      horses.reload();
      assignmentDialog.closeDialog();
    } catch (error) {
      console.error("Error assigning horse:", error);
      throw error;
    }
  };

  const handleUnassign = async (horse: Horse) => {
    if (!user) return;

    const confirmed = window.confirm(
      t("horses:actions.unassignFromStable") + `: ${horse.name}?`,
    );
    if (!confirmed) return;

    try {
      await unassignHorseFromStable(horse.id, user.uid);
      horses.reload();
    } catch (error) {
      console.error("Error unassigning horse:", error);
    }
  };

  // Vaccination Handlers
  const handleViewVaccinationHistory = () => {
    if (!formDialog.data) return;

    setSelectedHorseForVaccination(formDialog.data);
    setVaccinationHistoryOpen(true);
  };

  const handleAddVaccinationRecord = () => {
    if (!formDialog.data) return;

    setSelectedHorseForVaccination(formDialog.data);
    vaccinationRecordDialog.openDialog();
  };

  const handleEditVaccinationRecord = (record: VaccinationRecord) => {
    vaccinationRecordDialog.openDialog(record);
  };

  const handleDeleteVaccinationRecord = async (record: VaccinationRecord) => {
    const confirmed = window.confirm(t("common:messages.confirmDelete"));
    if (!confirmed) return;

    try {
      await deleteVaccinationRecord(record.id);

      // Invalidate vaccination records query
      if (selectedHorseForVaccination) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.vaccinations.byHorse(
            selectedHorseForVaccination.id,
          ),
        });
      }

      // Reload horses to update vaccination status
      await horses.reload();
    } catch (error) {
      console.error("Error deleting vaccination record:", error);
    }
  };

  const handleVaccinationRecordSuccess = async () => {
    vaccinationRecordDialog.closeDialog();

    // Invalidate vaccination records query
    if (selectedHorseForVaccination) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vaccinations.byHorse(
          selectedHorseForVaccination.id,
        ),
      });
    }

    // Reload horses to update vaccination status
    await horses.reload();
  };

  // Navigation Handler
  const handleViewDetails = (horse: Horse) => {
    navigate(`/horses/${horse.id}`);
  };

  // Table column configuration with action handlers
  const columns = createHorseTableColumns({
    onEdit: handleEditHorse,
    onAssign: handleAssignClick,
    onUnassign: handleUnassign,
    onDelete: handleDeleteHorse,
    onViewDetails: handleViewDetails,
  });

  if (horses.loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t("horses:page.title")}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {t("horses:page.description")}
          </p>
        </div>
        <div className="flex gap-2">
          <HorseExportButton horses={filteredHorses} />
          <Button onClick={handleCreateHorse} className="flex-1 sm:flex-none">
            <Plus className="mr-2 h-4 w-4" />
            {t("horses:actions.addHorse")}
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Filter Popover */}
          <HorseFilterPopover
            filters={filters}
            onFiltersChange={setFilters}
            config={filterConfig}
            stables={stables as any}
            activeFilterCount={activeFilterCount}
            onClearAll={clearAllFilters}
          />

          {/* Search Input */}
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("horses:filters.searchPlaceholder")}
              value={filters.searchQuery}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))
              }
              className="pl-9"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <HorseFilterBadges
            badges={getActiveFilterBadges()}
            onClearAll={clearAllFilters}
          />
        )}
      </div>

      {/* Horse Table */}
      <HorseTable
        data={filteredHorses}
        columns={columns}
        onRowClick={handleViewDetails}
      />

      {/* Dialogs */}
      <HorseFormDialog
        open={formDialog.open}
        onOpenChange={(open) => !open && formDialog.closeDialog()}
        horse={formDialog.data}
        onSave={handleSaveHorse}
        allowStableAssignment={stables.length > 0}
        availableStables={stables}
        onViewVaccinationHistory={handleViewVaccinationHistory}
        onAddVaccinationRecord={handleAddVaccinationRecord}
      />

      <HorseAssignmentDialog
        open={assignmentDialog.open}
        onOpenChange={(open) => !open && assignmentDialog.closeDialog()}
        horse={assignmentDialog.data}
        availableStables={stables}
        onAssign={handleAssign}
      />

      {/* Vaccination Record Dialog */}
      {selectedHorseForVaccination && (
        <VaccinationRecordDialog
          open={vaccinationRecordDialog.open}
          onOpenChange={(open) =>
            !open && vaccinationRecordDialog.closeDialog()
          }
          horse={selectedHorseForVaccination}
          organizationId={currentOrganizationId || ""}
          record={vaccinationRecordDialog.data}
          onSuccess={handleVaccinationRecordSuccess}
        />
      )}

      {/* Vaccination History Dialog */}
      {selectedHorseForVaccination && (
        <Dialog
          open={vaccinationHistoryOpen}
          onOpenChange={setVaccinationHistoryOpen}
        >
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {t("horses:vaccination.viewFullHistory")} -{" "}
                {selectedHorseForVaccination.name}
              </DialogTitle>
            </DialogHeader>
            <VaccinationHistoryTable
              records={vaccinationRecords}
              onEdit={handleEditVaccinationRecord}
              onDelete={handleDeleteVaccinationRecord}
              onAdd={() => vaccinationRecordDialog.openDialog()}
              loading={loadingVaccinationRecords}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
