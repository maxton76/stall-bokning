import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { useAuth } from "@/contexts/AuthContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useDialog } from "@/hooks/useDialog";
import { useHorse } from "@/hooks/useHorses";
import { queryKeys } from "@/lib/queryClient";
import { updateHorse } from "@/services/horseService";
import { getOrganizationHorseGroups } from "@/services/horseGroupService";
import { HorseFormDialog } from "@/components/HorseFormDialog";
import { BasicInfoCard } from "@/components/horse-detail/BasicInfoCard";
import { LocationCard } from "@/components/horse-detail/LocationCard";
import { OwnershipCard } from "@/components/horse-detail/OwnershipCard";
import { CareCard } from "@/components/horse-detail/CareCard";
import { VaccinationCard } from "@/components/horse-detail/VaccinationCard";
import { ActivitiesCard } from "@/components/horse-detail/ActivitiesCard";
import { TeamCard } from "@/components/horse-detail/TeamCard";
import { RoutineHistoryCard } from "@/components/horse-detail/RoutineHistoryCard";
import type { Horse, HorseGroup } from "@/types/roles";

export default function HorseDetailPage() {
  const { horseId } = useParams<{ horseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Data fetching
  const {
    horse: horseData,
    loading: horseLoading,
    reload: reloadHorse,
    query: horseQuery,
  } = useHorse(horseId);

  // Horse groups for the form
  const horseGroupsQuery = useApiQuery<HorseGroup[]>(
    queryKeys.horseGroups.byOrganization(horseData?.currentStableId || ""),
    () => getOrganizationHorseGroups(horseData!.currentStableId!),
    {
      enabled: !!horseData?.currentStableId,
      staleTime: 5 * 60 * 1000,
    },
  );
  const horseGroupsData = horseGroupsQuery.data ?? [];

  // Dialog state for edit
  const formDialog = useDialog<Horse>();

  // Handle edit
  const handleEdit = () => {
    if (horseData) {
      formDialog.openDialog(horseData);
    }
  };

  // Handle save after edit
  const handleSave = async (
    data: Omit<
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
    if (!user || !horseData) return;

    await updateHorse(horseData.id, user.uid, data);
    formDialog.closeDialog();
    await reloadHorse();
  };

  // Loading skeleton
  const HorseDetailSkeleton = () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  // Custom error fallback for horse not found
  const HorseNotFoundError = () => (
    <div className="container mx-auto p-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-destructive mb-2">
          Horse not found
        </h2>
        <p className="text-muted-foreground mb-4">
          The horse you're looking for doesn't exist or you don't have
          permission to view it.
        </p>
        <Button onClick={() => navigate("/horses")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My Horses
        </Button>
      </div>
    </div>
  );

  return (
    <QueryBoundary
      query={horseQuery}
      loadingFallback={<HorseDetailSkeleton />}
      errorFallback={<HorseNotFoundError />}
    >
      {(horse) => (
        <div className="container mx-auto p-2 sm:p-6 space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="space-y-4">
            {/* Breadcrumb */}
            <Breadcrumb className="hidden sm:block">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/horses">Home</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/horses">My Horses</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{horse.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            {/* Title and Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {horse.name}
                </h1>
                {horse.breed && (
                  <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    {horse.breed}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate("/horses")}
                  size="sm"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </div>
            </div>
          </div>

          {/* Card Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            <BasicInfoCard horse={horse} onEdit={handleEdit} />
            <LocationCard horse={horse} onUpdate={() => reloadHorse()} />
          </div>

          <div className="grid gap-6">
            <OwnershipCard horse={horse} />
            <CareCard horse={horse} />
            <VaccinationCard horse={horse} />
            <ActivitiesCard horse={horse} />
            <RoutineHistoryCard horse={horse} />
            <TeamCard horse={horse} />
          </div>

          {/* Edit Dialog */}
          <HorseFormDialog
            open={formDialog.open}
            onOpenChange={(open) => !open && formDialog.closeDialog()}
            horse={formDialog.data}
            onSave={handleSave}
            allowStableAssignment={true}
            availableStables={[]}
            availableGroups={horseGroupsData}
          />
        </div>
      )}
    </QueryBoundary>
  );
}
