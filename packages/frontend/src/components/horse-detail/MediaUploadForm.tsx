import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, Loader2, X, Image, Video, FileText } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { authFetch } from "@/lib/authFetch";
import type { MediaType, MediaCategory } from "@shared/types/media";
import { cn } from "@/lib/utils";

const MEDIA_CATEGORIES: { value: MediaCategory; en: string; sv: string }[] = [
  { value: "passport", en: "Passport", sv: "Pass" },
  { value: "insurance", en: "Insurance", sv: "Försäkring" },
  { value: "registration", en: "Registration", sv: "Registrering" },
  { value: "medical", en: "Medical", sv: "Medicinskt" },
  { value: "conformation", en: "Conformation", sv: "Exteriör" },
  { value: "competition", en: "Competition", sv: "Tävling" },
  { value: "training", en: "Training", sv: "Träning" },
  { value: "other", en: "Other", sv: "Annat" },
];

const MAX_FILE_SIZES: Record<MediaType, number> = {
  photo: 10 * 1024 * 1024, // 10MB
  video: 100 * 1024 * 1024, // 100MB
  document: 25 * 1024 * 1024, // 25MB
};

const SUPPORTED_EXTENSIONS: Record<MediaType, string[]> = {
  photo: ["jpg", "jpeg", "png", "gif", "webp", "heic"],
  video: ["mp4", "mov", "avi", "webm"],
  document: ["pdf", "doc", "docx", "xls", "xlsx", "txt"],
};

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.enum([
    "passport",
    "insurance",
    "registration",
    "medical",
    "conformation",
    "competition",
    "training",
    "other",
  ]),
  description: z.string().optional(),
  tags: z.string().optional(),
  expirationDate: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface MediaUploadFormProps {
  horseId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MediaUploadForm({
  horseId,
  onSuccess,
  onCancel,
}: MediaUploadFormProps) {
  const { t, i18n } = useTranslation(["horses", "common"]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      title: "",
      category: "other",
      description: "",
      tags: "",
      expirationDate: "",
    },
  });

  const getMediaType = (file: File): MediaType | null => {
    const extension = file.name.split(".").pop()?.toLowerCase() || "";

    if (SUPPORTED_EXTENSIONS.photo.includes(extension)) return "photo";
    if (SUPPORTED_EXTENSIONS.video.includes(extension)) return "video";
    if (SUPPORTED_EXTENSIONS.document.includes(extension)) return "document";

    return null;
  };

  const validateFile = (file: File): string | null => {
    const mediaType = getMediaType(file);

    if (!mediaType) {
      return t("horses:media.unsupportedType", "Unsupported file type");
    }

    const maxSize = MAX_FILE_SIZES[mediaType];
    if (file.size > maxSize) {
      const maxMB = maxSize / (1024 * 1024);
      return t("horses:media.fileTooLarge", "File exceeds {{max}}MB limit", {
        max: maxMB,
      });
    }

    return null;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      form.setError("root", { message: error });
      return;
    }

    setSelectedFile(file);

    // Generate title from filename if empty
    if (!form.getValues("title")) {
      const titleFromName = file.name.split(".").slice(0, -1).join(".");
      form.setValue("title", titleFromName);
    }

    // Generate preview for images
    const mediaType = getMediaType(file);
    if (mediaType === "photo") {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!selectedFile) throw new Error("No file selected");

      const mediaType = getMediaType(selectedFile);
      if (!mediaType) throw new Error("Invalid file type");

      // 1. Get signed upload URL
      const urlResponse = await authFetch("/api/v1/horse-media/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          horseId,
          fileName: selectedFile.name,
          contentType: selectedFile.type,
        }),
      });

      if (!urlResponse.ok) {
        const error = await urlResponse.json();
        throw new Error(error.message || "Failed to get upload URL");
      }

      const { uploadUrl, filePath } = await urlResponse.json();

      // 2. Upload file to Firebase Storage
      setUploadProgress(10);

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": selectedFile.type,
        },
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      setUploadProgress(70);

      // 3. Create media record
      const tags = values.tags
        ? values.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      const mediaResponse = await authFetch("/api/v1/horse-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          horseId,
          type: mediaType,
          category: values.category,
          title: values.title,
          description: values.description || undefined,
          filePath,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          mimeType: selectedFile.type,
          tags: tags.length > 0 ? tags : undefined,
          expirationDate: values.expirationDate || undefined,
        }),
      });

      setUploadProgress(100);

      if (!mediaResponse.ok) {
        const error = await mediaResponse.json();
        throw new Error(error.message || "Failed to create media record");
      }

      return mediaResponse.json();
    },
    onSuccess: () => {
      clearFile();
      onSuccess();
    },
    onError: () => {
      setUploadProgress(0);
    },
  });

  const onSubmit = (values: FormValues) => {
    uploadMutation.mutate(values);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = () => {
    if (!selectedFile) return null;
    const mediaType = getMediaType(selectedFile);
    switch (mediaType) {
      case "photo":
        return <Image className="h-8 w-8" />;
      case "video":
        return <Video className="h-8 w-8" />;
      case "document":
        return <FileText className="h-8 w-8" />;
      default:
        return null;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* File Upload Area */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
            selectedFile
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 cursor-pointer",
          )}
          onClick={() => !selectedFile && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept={[
              ...SUPPORTED_EXTENSIONS.photo.map((e) => `.${e}`),
              ...SUPPORTED_EXTENSIONS.video.map((e) => `.${e}`),
              ...SUPPORTED_EXTENSIONS.document.map((e) => `.${e}`),
            ].join(",")}
          />

          {selectedFile ? (
            <div className="space-y-3">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="mx-auto max-h-32 rounded-lg object-contain"
                />
              ) : (
                <div className="mx-auto w-fit p-4 rounded-lg bg-muted">
                  {getFileIcon()}
                </div>
              )}
              <div>
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
              >
                <X className="h-4 w-4 mr-1" />
                {t("horses:media.changeFile", "Change File")}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t("horses:media.dropHint", "Click to select or drag and drop")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t(
                  "horses:media.supportedFormats",
                  "Photos (10MB), Videos (100MB), Documents (25MB)",
                )}
              </p>
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {uploadMutation.isPending && uploadProgress > 0 && (
          <div className="space-y-2">
            <Progress value={uploadProgress} />
            <p className="text-xs text-center text-muted-foreground">
              {t("horses:media.uploading", "Uploading...")} {uploadProgress}%
            </p>
          </div>
        )}

        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("horses:media.titleField", "Title")} *</FormLabel>
              <FormControl>
                <Input
                  placeholder={t(
                    "horses:media.titlePlaceholder",
                    "e.g., Vaccination certificate 2024",
                  )}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("horses:media.category", "Category")} *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {MEDIA_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {i18n.language === "sv" ? cat.sv : cat.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("horses:media.description", "Description")}
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t(
                    "horses:media.descriptionPlaceholder",
                    "Optional description...",
                  )}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tags */}
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("horses:media.tags", "Tags")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t(
                    "horses:media.tagsPlaceholder",
                    "e.g., vet, 2024, important (comma separated)",
                  )}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {t("horses:media.tagsHint", "Separate tags with commas")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Expiration Date (for documents) */}
        <FormField
          control={form.control}
          name="expirationDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("horses:media.expirationDate", "Expiration Date")}
              </FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormDescription>
                {t(
                  "horses:media.expirationHint",
                  "For documents like insurance or passports",
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("common:buttons.cancel", "Cancel")}
          </Button>
          <Button
            type="submit"
            disabled={uploadMutation.isPending || !selectedFile}
          >
            {uploadMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t("common:buttons.upload", "Upload")}
          </Button>
        </div>

        {(form.formState.errors.root || uploadMutation.isError) && (
          <p className="text-sm text-destructive">
            {form.formState.errors.root?.message ||
              (uploadMutation.error instanceof Error
                ? uploadMutation.error.message
                : t("common:errors.unknown", "An error occurred"))}
          </p>
        )}
      </form>
    </Form>
  );
}
