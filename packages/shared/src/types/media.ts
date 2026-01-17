import type { Timestamp } from "firebase/firestore";

/**
 * Horse media types for documents, photos, and videos
 */

/**
 * Media file types
 */
export type MediaType = "photo" | "video" | "document";

/**
 * Media categories for organization
 */
export type MediaCategory =
  | "passport"
  | "insurance"
  | "registration"
  | "medical"
  | "conformation"
  | "competition"
  | "training"
  | "purchase"
  | "contract"
  | "other";

/**
 * Horse media document structure
 * Stored as subcollection: horses/{horseId}/media/{mediaId}
 */
export interface HorseMedia {
  id: string;
  horseId: string;
  horseName?: string; // Cached for display

  // File information
  type: MediaType;
  category: MediaCategory;
  title: string;
  description?: string;

  // Storage information
  fileUrl: string; // Full URL to file in Firebase Storage
  thumbnailUrl?: string; // For photos/videos, smaller preview
  storagePath: string; // Firebase Storage path for deletion
  fileName: string; // Original filename
  fileSize: number; // In bytes
  mimeType: string;

  // Video-specific
  duration?: number; // In seconds, for videos

  // Image-specific
  width?: number;
  height?: number;

  // Document-specific
  pageCount?: number;
  expiryDate?: Timestamp; // For documents like insurance, passports

  // Organization
  tags?: string[];
  isFavorite?: boolean;
  isPublic?: boolean; // Can be shared externally

  // Metadata
  uploadedBy: string;
  uploadedByName?: string; // Cached for display
  uploadedAt: Timestamp;
  updatedAt: Timestamp;
  lastModifiedBy: string;
}

/**
 * Media summary for list views
 */
export interface MediaSummary {
  id: string;
  type: MediaType;
  category: MediaCategory;
  title: string;
  thumbnailUrl?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  uploadedAt: Timestamp;
  isFavorite?: boolean;
}

/**
 * Media filter options
 */
export interface MediaFilters {
  type?: MediaType;
  category?: MediaCategory;
  tags?: string[];
  isFavorite?: boolean;
  uploadedAfter?: Timestamp;
  uploadedBefore?: Timestamp;
}

/**
 * Upload media input
 */
export interface UploadMediaInput {
  horseId: string;
  type: MediaType;
  category: MediaCategory;
  title: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  expiryDate?: Timestamp | Date;
  // File data handled separately
}

/**
 * Update media metadata input
 */
export interface UpdateMediaInput {
  title?: string;
  description?: string;
  category?: MediaCategory;
  tags?: string[];
  isFavorite?: boolean;
  isPublic?: boolean;
  expiryDate?: Timestamp | Date;
}

/**
 * Media upload progress
 */
export interface MediaUploadProgress {
  mediaId: string;
  fileName: string;
  progress: number; // 0-100
  status: "pending" | "uploading" | "processing" | "completed" | "failed";
  error?: string;
}

/**
 * Media gallery stats for a horse
 */
export interface MediaGalleryStats {
  totalFiles: number;
  totalPhotos: number;
  totalVideos: number;
  totalDocuments: number;
  totalSizeBytes: number;
  expiringDocuments: number; // Documents expiring within 30 days
}

/**
 * Batch media operation result
 */
export interface BatchMediaResult {
  successful: string[];
  failed: { id: string; error: string }[];
}

/**
 * Supported file extensions by type
 */
export const SUPPORTED_MEDIA_EXTENSIONS: Record<MediaType, string[]> = {
  photo: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"],
  video: [".mp4", ".mov", ".avi", ".webm", ".m4v"],
  document: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt"],
};

/**
 * Maximum file sizes by type (in bytes)
 */
export const MAX_FILE_SIZES: Record<MediaType, number> = {
  photo: 10 * 1024 * 1024, // 10 MB
  video: 100 * 1024 * 1024, // 100 MB
  document: 25 * 1024 * 1024, // 25 MB
};

/**
 * Helper function to get media type from file extension
 */
export function getMediaTypeFromExtension(fileName: string): MediaType | null {
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf("."));

  for (const [type, extensions] of Object.entries(SUPPORTED_MEDIA_EXTENSIONS)) {
    if (extensions.includes(ext)) {
      return type as MediaType;
    }
  }

  return null;
}

/**
 * Helper function to format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
