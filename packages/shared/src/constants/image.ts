// Image processing constants shared between Cloud Functions trigger and API admin reprocess

export const IMAGE_SIZE_VARIANTS = [
  { name: "thumb", maxDimension: 110, quality: 75 },
  { name: "small", maxDimension: 200, quality: 80 },
  { name: "medium", maxDimension: 400, quality: 82 },
  { name: "large", maxDimension: 1080, quality: 85 },
] as const;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const VALID_ENTITY_ID = /^[a-zA-Z0-9_-]{1,128}$/;

export const VALID_PHOTO_PURPOSES = ["cover", "avatar", "general"] as const;

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const MAX_IMAGE_DIMENSION = 10000;

export const MAX_IMAGE_PIXELS = 50_000_000; // 50 megapixels
