/**
 * Supported file extensions by type
 */
export const SUPPORTED_MEDIA_EXTENSIONS = {
  photo: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"],
  video: [".mp4", ".mov", ".avi", ".webm", ".m4v"],
  document: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt"],
};
/**
 * Maximum file sizes by type (in bytes)
 */
export const MAX_FILE_SIZES = {
  photo: 10 * 1024 * 1024, // 10 MB
  video: 100 * 1024 * 1024, // 100 MB
  document: 25 * 1024 * 1024, // 25 MB
};
/**
 * Helper function to get media type from file extension
 */
export function getMediaTypeFromExtension(fileName) {
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf("."));
  for (const [type, extensions] of Object.entries(SUPPORTED_MEDIA_EXTENSIONS)) {
    if (extensions.includes(ext)) {
      return type;
    }
  }
  return null;
}
/**
 * Helper function to format file size for display
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
