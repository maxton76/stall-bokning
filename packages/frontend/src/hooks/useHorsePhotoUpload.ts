import { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

type UploadPurpose = "avatar" | "cover";

type UploadProgress =
  | "idle"
  | "getting-url"
  | "uploading"
  | "saving"
  | "done"
  | "error";

interface UseHorsePhotoUploadOptions {
  horseId: string;
  purpose: UploadPurpose;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UploadUrlResponse {
  uploadUrl: string;
  readUrl: string;
  storagePath: string;
}

export function useHorsePhotoUpload({
  horseId,
  purpose,
  onSuccess,
  onError,
}: UseHorsePhotoUploadOptions) {
  const { t } = useTranslation(["horses"]);
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<UploadProgress>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const isUploading =
    progress !== "idle" && progress !== "done" && progress !== "error";

  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
  }, []);

  const upload = useCallback(
    async (blob: Blob, fileName: string) => {
      // Optimistic preview
      revokePreview();
      const objectUrl = URL.createObjectURL(blob);
      previewUrlRef.current = objectUrl;
      setPreviewUrl(objectUrl);

      try {
        // Step 1: Get signed upload URL
        setProgress("getting-url");
        const { uploadUrl, storagePath } =
          await apiClient.post<UploadUrlResponse>(`/horse-media/upload-url`, {
            horseId,
            fileName,
            mimeType: "image/jpeg",
            type: "photo",
            purpose,
          });

        // Step 2: Upload to GCS via signed URL (raw fetch, no auth headers)
        setProgress("uploading");
        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/jpeg" },
          body: blob,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.status}`);
        }

        // Step 3: Create media metadata record
        setProgress("saving");
        await apiClient.post("/horse-media", {
          horseId,
          storagePath,
          mimeType: "image/jpeg",
          type: "photo",
          category: purpose === "avatar" ? "profile" : "general",
          title: purpose === "avatar" ? "Profile Photo" : "Cover Photo",
          fileUrl: storagePath,
          fileName,
          fileSize: blob.size,
          purpose,
        });

        // Step 4: Update horse with photo path
        const pathField =
          purpose === "avatar" ? "avatarPhotoPath" : "coverPhotoPath";
        await apiClient.patch(`/horses/${horseId}`, {
          [pathField]: storagePath,
        });

        setProgress("done");

        // Invalidate horse cache to pick up new photo URLs
        await queryClient.invalidateQueries({
          queryKey: queryKeys.horses.detail(horseId),
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.horses.all,
        });

        toast({
          title: t("horses:photoUpload.uploadSuccess"),
        });

        onSuccess?.();
      } catch (error) {
        setProgress("error");
        revokePreview();
        const err = error instanceof Error ? error : new Error(String(error));

        toast({
          title: t("horses:photoUpload.uploadError"),
          variant: "destructive",
        });

        onError?.(err);
      }
    },
    [horseId, purpose, onSuccess, onError, queryClient, revokePreview, t],
  );

  const remove = useCallback(async () => {
    try {
      const pathField =
        purpose === "avatar" ? "avatarPhotoPath" : "coverPhotoPath";
      await apiClient.patch(`/horses/${horseId}`, {
        [pathField]: null,
      });

      revokePreview();
      setProgress("idle");

      await queryClient.invalidateQueries({
        queryKey: queryKeys.horses.detail(horseId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.horses.all,
      });

      toast({
        title: t("horses:photoUpload.removeSuccess"),
      });

      onSuccess?.();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      toast({
        title: t("horses:photoUpload.removeError"),
        variant: "destructive",
      });

      onError?.(err);
    }
  }, [horseId, purpose, onSuccess, onError, queryClient, revokePreview, t]);

  return {
    upload,
    remove,
    isUploading,
    progress,
    previewUrl,
  };
}
