/**
 * Image compression and crop utilities using Canvas API.
 * No external dependencies — pure browser Canvas.
 */

export interface CompressOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number; // 0–1
}

export const AVATAR_COMPRESS: CompressOptions = {
  maxWidth: 600,
  maxHeight: 600,
  quality: 0.75,
};

export const COVER_COMPRESS: CompressOptions = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.75,
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export function validateImageFile(file: File): string | null {
  if (
    !ALLOWED_TYPES.includes(file.type) &&
    !file.name.match(/\.(heic|heif)$/i)
  ) {
    return "invalidFileType";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "fileTooLarge";
  }
  return null;
}

/**
 * Load a File into an HTMLImageElement.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Compress an image file: resize to fit within maxWidth×maxHeight
 * and re-encode as JPEG at the given quality.
 */
export async function compressImage(
  file: File,
  options: CompressOptions = COVER_COMPRESS,
): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);

    let { width, height } = img;
    const ratio = Math.min(
      options.maxWidth / width,
      options.maxHeight / height,
      1, // never upscale
    );
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, width, height);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")),
        "image/jpeg",
        options.quality,
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Pixel crop area from react-easy-crop's onCropComplete callback.
 */
export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Crop an image to the given pixel area and resize to 600×600 JPEG.
 * Used for avatar circular crop — the round mask is CSS-only,
 * but the image is square-cropped to the selected area.
 */
export async function createCroppedImage(
  imageSrc: string,
  pixelCrop: PixelCrop,
): Promise<Blob> {
  const img = await loadImage(imageSrc);

  const canvas = document.createElement("canvas");
  const size = 600; // output dimension
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    img,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")),
      "image/jpeg",
      0.75,
    );
  });
}

/**
 * Read a File as a data URL string (for use in <img> or Cropper).
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
