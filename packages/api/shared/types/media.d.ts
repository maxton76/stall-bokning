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
  horseName?: string;
  type: MediaType;
  category: MediaCategory;
  title: string;
  description?: string;
  fileUrl: string;
  thumbnailUrl?: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  duration?: number;
  width?: number;
  height?: number;
  pageCount?: number;
  expiryDate?: Timestamp;
  tags?: string[];
  isFavorite?: boolean;
  isPublic?: boolean;
  uploadedBy: string;
  uploadedByName?: string;
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
  progress: number;
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
  expiringDocuments: number;
}
/**
 * Batch media operation result
 */
export interface BatchMediaResult {
  successful: string[];
  failed: {
    id: string;
    error: string;
  }[];
}
/**
 * Supported file extensions by type
 */
export declare const SUPPORTED_MEDIA_EXTENSIONS: Record<MediaType, string[]>;
/**
 * Maximum file sizes by type (in bytes)
 */
export declare const MAX_FILE_SIZES: Record<MediaType, number>;
/**
 * Helper function to get media type from file extension
 */
export declare function getMediaTypeFromExtension(
  fileName: string,
): MediaType | null;
/**
 * Helper function to format file size for display
 */
export declare function formatFileSize(bytes: number): string;
//# sourceMappingURL=media.d.ts.map
