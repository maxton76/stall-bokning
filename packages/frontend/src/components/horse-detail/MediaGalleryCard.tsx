import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Image,
  Video,
  FileText,
  Plus,
  Trash2,
  Loader2,
  Download,
  Star,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDialog } from "@/hooks/useDialog";
import { useTranslation } from "react-i18next";
import { authFetch } from "@/lib/authFetch";
import type { Horse } from "@/types/roles";
import type { HorseMedia, MediaType, MediaCategory } from "@shared/types/media";
import { toDate } from "@/utils/timestampUtils";
import { MediaUploadForm } from "./MediaUploadForm";

interface MediaGalleryCardProps {
  horse: Horse;
}

const MEDIA_TYPE_ICONS: Record<
  MediaType,
  React.ComponentType<{ className?: string }>
> = {
  photo: Image,
  video: Video,
  document: FileText,
};

const CATEGORY_COLORS: Record<MediaCategory, string> = {
  passport: "bg-blue-100 text-blue-800",
  insurance: "bg-green-100 text-green-800",
  registration: "bg-purple-100 text-purple-800",
  medical: "bg-red-100 text-red-800",
  conformation: "bg-amber-100 text-amber-800",
  competition: "bg-indigo-100 text-indigo-800",
  training: "bg-teal-100 text-teal-800",
  other: "bg-gray-100 text-gray-800",
};

const CATEGORY_LABELS: Record<MediaCategory, { en: string; sv: string }> = {
  passport: { en: "Passport", sv: "Pass" },
  insurance: { en: "Insurance", sv: "Försäkring" },
  registration: { en: "Registration", sv: "Registrering" },
  medical: { en: "Medical", sv: "Medicinskt" },
  conformation: { en: "Conformation", sv: "Exteriör" },
  competition: { en: "Competition", sv: "Tävling" },
  training: { en: "Training", sv: "Träning" },
  other: { en: "Other", sv: "Annat" },
};

const TYPE_LABELS: Record<MediaType, { en: string; sv: string }> = {
  photo: { en: "Photos", sv: "Foton" },
  video: { en: "Videos", sv: "Videor" },
  document: { en: "Documents", sv: "Dokument" },
};

export function MediaGalleryCard({ horse }: MediaGalleryCardProps) {
  const { t, i18n } = useTranslation(["horses", "common"]);
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Dialog states
  const uploadDialog = useDialog();
  const previewDialog = useDialog<HorseMedia>();
  const deleteDialog = useDialog<HorseMedia>();

  // Fetch media
  const { data: mediaItems = [], isLoading } = useQuery({
    queryKey: ["horseMedia", horse.id, filterType, filterCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterType !== "all") params.append("type", filterType);
      if (filterCategory !== "all") params.append("category", filterCategory);

      const response = await authFetch(
        `/api/v1/horse-media/horse/${horse.id}?${params}`,
      );
      if (!response.ok) throw new Error("Failed to fetch media");
      const data = await response.json();
      return data.media as HorseMedia[];
    },
    enabled: !!horse.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["horseMedia", horse.id, "stats"],
    queryFn: async () => {
      const response = await authFetch(
        `/api/v1/horse-media/horse/${horse.id}/stats`,
      );
      if (!response.ok) throw new Error("Failed to fetch media stats");
      return response.json();
    },
    enabled: !!horse.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch expiring documents
  const { data: expiringDocs } = useQuery({
    queryKey: ["horseMedia", horse.id, "expiring"],
    queryFn: async () => {
      const response = await authFetch(
        `/api/v1/horse-media/horse/${horse.id}/expiring?days=30`,
      );
      if (!response.ok) throw new Error("Failed to fetch expiring documents");
      const data = await response.json();
      return data.media as HorseMedia[];
    },
    enabled: !!horse.id,
    staleTime: 5 * 60 * 1000,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (media: HorseMedia) => {
      const response = await authFetch(
        `/api/v1/horse-media/${media.id}?horseId=${horse.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("Failed to delete media");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["horseMedia", horse.id] });
      deleteDialog.closeDialog();
    },
  });

  // Toggle favorite mutation
  const favoriteMutation = useMutation({
    mutationFn: async (media: HorseMedia) => {
      const response = await authFetch(
        `/api/v1/horse-media/${media.id}/favorite`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ horseId: horse.id }),
        },
      );
      if (!response.ok) throw new Error("Failed to toggle favorite");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["horseMedia", horse.id] });
    },
  });

  const handleUpload = () => {
    uploadDialog.openDialog(undefined);
  };

  const handlePreview = (media: HorseMedia) => {
    previewDialog.openDialog(media);
  };

  const handleDelete = (media: HorseMedia) => {
    deleteDialog.openDialog(media);
  };

  const confirmDelete = () => {
    if (!deleteDialog.data) return;
    deleteMutation.mutate(deleteDialog.data);
  };

  const handleSuccess = () => {
    uploadDialog.closeDialog();
    queryClient.invalidateQueries({ queryKey: ["horseMedia", horse.id] });
  };

  const getCategoryLabel = (category: MediaCategory) => {
    const locale = i18n.language === "sv" ? "sv" : "en";
    return CATEGORY_LABELS[category]?.[locale] || category;
  };

  const getTypeLabel = (type: MediaType) => {
    const locale = i18n.language === "sv" ? "sv" : "en";
    return TYPE_LABELS[type]?.[locale] || type;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image className="h-5 w-5 text-muted-foreground" />
              <CardTitle>
                {t("horses:media.title", "Media & Documents")}
              </CardTitle>
            </div>
            <Button size="sm" onClick={handleUpload}>
              <Plus className="h-4 w-4 mr-1" />
              {t("common:buttons.upload", "Upload")}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Stats Summary */}
          {stats && (
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border p-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Image className="h-4 w-4 text-muted-foreground" />
                  <p className="text-2xl font-bold">{stats.photoCount || 0}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("horses:media.photos", "Photos")}
                </p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <p className="text-2xl font-bold">{stats.videoCount || 0}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("horses:media.videos", "Videos")}
                </p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <p className="text-2xl font-bold">
                    {stats.documentCount || 0}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("horses:media.documents", "Documents")}
                </p>
              </div>
            </div>
          )}

          {/* Expiring Documents Warning */}
          {expiringDocs && expiringDocs.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span className="text-sm text-amber-700">
                {t(
                  "horses:media.expiringWarning",
                  "{{count}} document(s) expiring within 30 days",
                  { count: expiringDocs.length },
                )}
              </span>
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-4">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue
                  placeholder={t("horses:media.filterByType", "Type")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("horses:media.allTypes", "All Types")}
                </SelectItem>
                {Object.entries(TYPE_LABELS).map(([value, labels]) => (
                  <SelectItem key={value} value={value}>
                    {i18n.language === "sv" ? labels.sv : labels.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[150px]">
                <SelectValue
                  placeholder={t("horses:media.filterByCategory", "Category")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("horses:media.allCategories", "All Categories")}
                </SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([value, labels]) => (
                  <SelectItem key={value} value={value}>
                    {i18n.language === "sv" ? labels.sv : labels.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Media Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : mediaItems.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Image className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-1">
                {t("horses:media.noMedia", "No media files yet")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t(
                  "horses:media.uploadHint",
                  "Upload photos, videos, or documents to keep track of important files",
                )}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={handleUpload}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t("horses:media.uploadFirst", "Upload First File")}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {mediaItems.map((media) => {
                const TypeIcon = MEDIA_TYPE_ICONS[media.type];
                const uploadDate = toDate(media.uploadedAt);

                return (
                  <div
                    key={media.id}
                    className="group relative rounded-lg border overflow-hidden hover:border-primary transition-colors"
                  >
                    {/* Thumbnail / Preview */}
                    <div className="aspect-square bg-muted flex items-center justify-center relative">
                      {media.type === "photo" && media.thumbnailUrl ? (
                        <img
                          src={media.thumbnailUrl || media.fileUrl}
                          alt={media.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <TypeIcon className="h-12 w-12 text-muted-foreground" />
                      )}

                      {/* Favorite indicator */}
                      {media.isFavorite && (
                        <Star className="absolute top-2 left-2 h-4 w-4 text-yellow-500 fill-yellow-500" />
                      )}

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={() => handlePreview(media)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={() => favoriteMutation.mutate(media)}
                        >
                          <Star
                            className={`h-4 w-4 ${media.isFavorite ? "fill-yellow-500 text-yellow-500" : ""}`}
                          />
                        </Button>
                        <Button size="icon" variant="secondary" asChild>
                          <a
                            href={media.fileUrl}
                            download={media.fileName}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => handleDelete(media)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-2">
                      <p className="text-sm font-medium truncate">
                        {media.title}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <Badge
                          variant="outline"
                          className={`text-xs ${CATEGORY_COLORS[media.category]}`}
                        >
                          {getCategoryLabel(media.category)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(media.fileSize)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialog.open}
        onOpenChange={(open) => !open && uploadDialog.closeDialog()}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("horses:media.uploadFile", "Upload File")}
            </DialogTitle>
          </DialogHeader>
          <MediaUploadForm
            horseId={horse.id}
            onSuccess={handleSuccess}
            onCancel={() => uploadDialog.closeDialog()}
          />
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialog.open}
        onOpenChange={(open) => !open && previewDialog.closeDialog()}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewDialog.data?.title}</DialogTitle>
          </DialogHeader>
          {previewDialog.data && (
            <div className="space-y-4">
              {previewDialog.data.type === "photo" ? (
                <img
                  src={previewDialog.data.fileUrl}
                  alt={previewDialog.data.title}
                  className="w-full max-h-[70vh] object-contain rounded-lg"
                />
              ) : previewDialog.data.type === "video" ? (
                <video
                  src={previewDialog.data.fileUrl}
                  controls
                  className="w-full max-h-[70vh] rounded-lg"
                />
              ) : (
                <div className="flex flex-col items-center gap-4 py-8">
                  <FileText className="h-16 w-16 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {previewDialog.data.fileName}
                  </p>
                  <Button asChild>
                    <a
                      href={previewDialog.data.fileUrl}
                      download={previewDialog.data.fileName}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {t("common:buttons.download", "Download")}
                    </a>
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className={CATEGORY_COLORS[previewDialog.data.category]}
                >
                  {getCategoryLabel(previewDialog.data.category)}
                </Badge>
                <Badge variant="outline">
                  {getTypeLabel(previewDialog.data.type)}
                </Badge>
                <Badge variant="outline">
                  {formatFileSize(previewDialog.data.fileSize)}
                </Badge>
                {toDate(previewDialog.data.uploadedAt) && (
                  <Badge variant="outline">
                    {format(toDate(previewDialog.data.uploadedAt)!, "PPP")}
                  </Badge>
                )}
              </div>

              {previewDialog.data.description && (
                <p className="text-sm text-muted-foreground">
                  {previewDialog.data.description}
                </p>
              )}

              {previewDialog.data.tags &&
                previewDialog.data.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {previewDialog.data.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => !open && deleteDialog.closeDialog()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("horses:media.deleteFile", "Delete File")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "horses:media.deleteConfirm",
                "Are you sure you want to delete this file? This action cannot be undone.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("common:buttons.cancel", "Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("common:buttons.delete", "Delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
