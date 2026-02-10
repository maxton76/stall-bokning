import { useState, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Loader2Icon,
  Camera,
  Trash2,
  ImagePlus,
  Loader2,
} from "lucide-react";
import { BlurhashImage } from "@/components/ui/BlurhashImage";
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
import { useHorsePhotoUpload } from "@/hooks/useHorsePhotoUpload";
import { queryClient, queryKeys } from "@/lib/queryClient";
import { updateHorse } from "@/services/horseService";
import { getOrganizationHorseGroups } from "@/services/horseGroupService";
import { getStable } from "@/services/stableService";
import {
  validateImageFile,
  readFileAsDataURL,
  compressImage,
  COVER_COMPRESS,
} from "@/utils/imageUtils";
import { toast } from "@/hooks/use-toast";
import { HorseFormDialog } from "@/components/HorseFormDialog";
import { BasicInfoCard } from "@/components/horse-detail/BasicInfoCard";
import { LocationCard } from "@/components/horse-detail/LocationCard";
import { OwnershipCard } from "@/components/horse-detail/OwnershipCard";
import { CareCard } from "@/components/horse-detail/CareCard";
import { VaccinationCard } from "@/components/horse-detail/VaccinationCard";
import { ActivitiesCard } from "@/components/horse-detail/ActivitiesCard";
import { TeamCard } from "@/components/horse-detail/TeamCard";
import { RoutineHistoryCard } from "@/components/horse-detail/RoutineHistoryCard";
import { ImageCropDialog } from "@/components/horse-detail/ImageCropDialog";
import { DeleteHorseDialog } from "@/components/DeleteHorseDialog";
import type { Horse, HorseGroup } from "@/types/roles";

export default function HorseDetailPage() {
  const { horseId } = useParams<{ horseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation(["horses"]);

  // Data fetching
  const {
    horse: horseData,
    loading: horseLoading,
    reload: reloadHorse,
    query: horseQuery,
  } = useHorse(horseId);

  // UI-only visibility check — actual authorization enforced server-side in DELETE /api/v1/horses/:id
  const isOwner =
    user?.uid === horseData?.ownerId || user?.systemRole === "system_admin";

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

  // Fetch current stable data for boxes/paddocks
  const currentStableQuery = useApiQuery<any>(
    queryKeys.stables.detail(horseData?.currentStableId || ""),
    () => getStable(horseData!.currentStableId!),
    {
      enabled: !!horseData?.currentStableId,
      staleTime: 5 * 60 * 1000,
    },
  );
  const currentStableData = currentStableQuery.data;
  const availableStablesForForm = currentStableData
    ? [
        {
          id: currentStableData.id,
          name: currentStableData.name,
          boxes: currentStableData.boxes || [],
          paddocks: currentStableData.paddocks || [],
        },
      ]
    : [];

  // Dialog state for edit and delete
  const formDialog = useDialog<Horse>();
  const deleteDialog = useDialog<Horse>();

  // Photo upload hooks
  const avatarUpload = useHorsePhotoUpload({
    horseId: horseId || "",
    purpose: "avatar",
    onSuccess: reloadHorse,
  });
  const coverUpload = useHorsePhotoUpload({
    horseId: horseId || "",
    purpose: "cover",
    onSuccess: reloadHorse,
  });

  // Crop dialog state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  // Cover file input ref
  const coverInputRef = useRef<HTMLInputElement>(null);

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

  // Avatar upload flow: file → validate → read as data URL → open crop dialog
  const handleAvatarFileSelected = useCallback(
    async (file: File) => {
      const error = validateImageFile(file);
      if (error) {
        toast({
          title: t(`horses:photoUpload.${error}`),
          variant: "destructive",
        });
        return;
      }

      const dataUrl = await readFileAsDataURL(file);
      setCropImageSrc(dataUrl);
      setCropDialogOpen(true);
    },
    [t],
  );

  // After crop confirm: upload cropped blob
  const handleCropConfirm = useCallback(
    (croppedBlob: Blob) => {
      avatarUpload.upload(croppedBlob, "avatar.jpg");
    },
    [avatarUpload],
  );

  // Avatar remove
  const handleAvatarRemove = useCallback(() => {
    avatarUpload.remove();
  }, [avatarUpload]);

  // Cover upload flow: file → validate → compress → upload (no crop)
  const handleCoverFileSelected = useCallback(
    async (file: File) => {
      const error = validateImageFile(file);
      if (error) {
        toast({
          title: t(`horses:photoUpload.${error}`),
          variant: "destructive",
        });
        return;
      }

      const compressed = await compressImage(file, COVER_COMPRESS);
      coverUpload.upload(compressed, "cover.jpg");
    },
    [coverUpload, t],
  );

  const handleCoverInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleCoverFileSelected(file);
    }
    if (coverInputRef.current) {
      coverInputRef.current.value = "";
    }
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
      {(horse) => {
        const coverPhotoUrl =
          coverUpload.previewUrl || (horse as any).coverPhotoLargeURL;
        const coverBlurhash = (horse as any).coverPhotoBlurhash;
        const hasCoverPhoto = !!coverPhotoUrl;
        const canEdit = !!handleEdit;

        return (
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

              {/* Hero Cover Photo */}
              {hasCoverPhoto && (
                <div className="relative h-[220px] rounded-lg overflow-hidden group">
                  {coverUpload.previewUrl ? (
                    <img
                      src={coverUpload.previewUrl}
                      alt={horse.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <BlurhashImage
                      src={coverPhotoUrl}
                      blurhash={coverBlurhash}
                      alt={horse.name}
                      width={32}
                      height={32}
                      className="h-full w-full"
                    />
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  {/* Upload progress overlay */}
                  {coverUpload.isUploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="flex items-center gap-2 text-white">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm font-medium">
                          {t(
                            `horses:photoUpload.${coverUpload.progress === "getting-url" ? "preparing" : coverUpload.progress === "uploading" ? "uploading" : "saving"}`,
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Text overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                      {horse.name}
                    </h1>
                    {(horse.breed || horse.gender) && (
                      <p className="text-sm sm:text-base text-white/80 mt-1">
                        {[horse.breed, horse.gender]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>

                  {/* Back button overlay */}
                  <div className="absolute top-3 right-3 flex gap-2">
                    {/* Cover photo action buttons (hover only, when editable) */}
                    {canEdit && !coverUpload.isUploading && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="bg-white/90 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => coverInputRef.current?.click()}
                        >
                          <Camera className="mr-1 h-4 w-4" />
                          {t("horses:photoUpload.changeCover")}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="bg-white/90 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => coverUpload.remove()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="secondary"
                      onClick={() => navigate("/horses")}
                      size="sm"
                      className="bg-white/90 hover:bg-white"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                  </div>
                </div>
              )}

              {/* Cover photo placeholder (no cover + can edit) */}
              {!hasCoverPhoto && canEdit && (
                <div
                  className="relative h-[140px] rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-muted-foreground/40 hover:bg-muted/50 transition-colors"
                  onClick={() => coverInputRef.current?.click()}
                >
                  {coverUpload.isUploading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm">
                        {t(
                          `horses:photoUpload.${coverUpload.progress === "getting-url" ? "preparing" : coverUpload.progress === "uploading" ? "uploading" : "saving"}`,
                        )}
                      </span>
                    </div>
                  ) : (
                    <>
                      <ImagePlus className="h-8 w-8 text-muted-foreground/50" />
                      <span className="text-sm text-muted-foreground">
                        {t("horses:photoUpload.addCover")}
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Title and Actions (hidden when hero cover is visible) */}
              {!hasCoverPhoto && (
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
              )}
            </div>

            {/* Card Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              <BasicInfoCard
                horse={horse}
                onEdit={handleEdit}
                onDelete={() => deleteDialog.openDialog(horse)}
                isOwner={isOwner}
                onAvatarUpload={handleAvatarFileSelected}
                onAvatarRemove={handleAvatarRemove}
                isUploadingAvatar={avatarUpload.isUploading}
                avatarPreviewUrl={avatarUpload.previewUrl}
              />
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
              availableStables={availableStablesForForm}
              availableGroups={horseGroupsData}
            />

            {/* Avatar Crop Dialog */}
            <ImageCropDialog
              open={cropDialogOpen}
              onOpenChange={setCropDialogOpen}
              imageSrc={cropImageSrc}
              onConfirm={handleCropConfirm}
            />

            {/* Delete Horse Dialog */}
            <DeleteHorseDialog
              open={deleteDialog.open}
              onOpenChange={deleteDialog.closeDialog}
              horse={deleteDialog.data}
              onSuccess={() => {
                // Invalidate queries before navigation to ensure cache consistency
                queryClient.invalidateQueries({
                  queryKey: queryKeys.horses.all,
                });
                queryClient.invalidateQueries({
                  queryKey: queryKeys.admin.all,
                });
                navigate("/horses");
              }}
            />

            {/* Hidden cover file input */}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverInputChange}
              className="hidden"
            />
          </div>
        );
      }}
    </QueryBoundary>
  );
}
