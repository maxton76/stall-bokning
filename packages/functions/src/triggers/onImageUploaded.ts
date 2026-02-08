/**
 * Image Upload Trigger
 *
 * Fires on Storage object finalize in horses/{horseId}/profile/{filename} paths.
 * Generates 4 WebP size variants (thumb, small, medium, large) + blurhash.
 * Writes variants to a derived images bucket to avoid re-triggering.
 * Updates the horse Firestore document with variant paths and blurhash string.
 */

import { onObjectFinalized } from "firebase-functions/v2/storage";
import { logger } from "firebase-functions";
import * as path from "path";

import { db } from "../lib/firebase.js";
import { getStorage } from "firebase-admin/storage";
import { encode } from "blurhash";
import {
  IMAGE_SIZE_VARIANTS,
  ALLOWED_IMAGE_TYPES,
  VALID_ENTITY_ID,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGE_DIMENSION,
  MAX_IMAGE_PIXELS,
} from "@equiduty/shared";

// Lazy-load sharp to avoid cold start overhead when not needed
let sharp: typeof import("sharp") | null = null;
async function getSharp() {
  if (!sharp) {
    sharp = (await import("sharp")).default as any;
  }
  return sharp!;
}

// Get derived bucket name (validated at runtime, not module load)
function getDerivedBucketName(): string {
  const bucketName = process.env.DERIVED_IMAGES_BUCKET;
  if (!bucketName) {
    throw new Error("DERIVED_IMAGES_BUCKET env var is required");
  }
  return bucketName;
}

// ============================================================================
// MAIN TRIGGER
// ============================================================================

export const onImageUploaded = onObjectFinalized(
  {
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 120,
    cpu: 1,
    bucket: `${process.env.GCLOUD_PROJECT || "equiduty-dev"}.firebasestorage.app`,
  },
  async (event) => {
    const filePath = event.data.name;
    const contentType = event.data.contentType;

    if (!filePath || !contentType) {
      logger.info("Missing file path or content type, skipping");
      return;
    }

    // MIME type whitelist
    if (
      !ALLOWED_IMAGE_TYPES.includes(
        contentType as (typeof ALLOWED_IMAGE_TYPES)[number],
      )
    ) {
      logger.info(
        { filePath, contentType, reason: "mime_not_allowed" },
        "Not an allowed image type, skipping",
      );
      return;
    }

    // File size guard
    if (event.data.size && event.data.size > MAX_IMAGE_SIZE_BYTES) {
      logger.warn(
        { filePath, size: event.data.size, reason: "too_large" },
        "Image too large, skipping",
      );
      return;
    }

    // Only process files in horses/*/profile/* (not resized subfolder)
    const pathParts = filePath.split("/");
    // Expected: horses/{horseId}/profile/{filename}
    if (
      pathParts.length < 4 ||
      pathParts[0] !== "horses" ||
      pathParts[2] !== "profile"
    ) {
      logger.info({ filePath }, "Not a horse profile photo path, skipping");
      return;
    }

    // Skip if already in resized subfolder (defense-in-depth)
    if (pathParts.includes("resized")) {
      logger.info({ filePath }, "Already a resized image, skipping");
      return;
    }

    const horseId = pathParts[1];
    const fileName = pathParts[pathParts.length - 1];

    // Validate horseId
    if (!VALID_ENTITY_ID.test(horseId)) {
      logger.warn(
        { horseId, reason: "invalid_id" },
        "Invalid horseId, skipping",
      );
      return;
    }

    // Determine if this is an avatar (square crop) or cover/general (preserve aspect ratio)
    const isAvatar = fileName.toLowerCase().includes("avatar");
    const photoType = isAvatar ? "avatar" : "cover";

    logger.info(
      { filePath, horseId, photoType, contentType },
      "Processing image upload",
    );

    try {
      const sharpLib = await getSharp();
      const sourceBucket = getStorage().bucket(event.data.bucket);
      const derivedBucket = getStorage().bucket(getDerivedBucketName());
      const file = sourceBucket.file(filePath);

      // Download original image
      const [buffer] = await file.download();

      // Get image metadata for dimension validation and blurhash generation
      const metadata = await sharpLib(buffer).metadata();
      if (!metadata.width || !metadata.height) {
        logger.warn({ filePath }, "Could not read image dimensions, skipping");
        return;
      }

      // Decompression bomb guard
      if (
        metadata.width > MAX_IMAGE_DIMENSION ||
        metadata.height > MAX_IMAGE_DIMENSION
      ) {
        logger.warn(
          {
            filePath,
            width: metadata.width,
            height: metadata.height,
            reason: "dimensions_too_large",
          },
          "Image dimensions too large, skipping",
        );
        return;
      }
      if (metadata.width * metadata.height > MAX_IMAGE_PIXELS) {
        logger.warn(
          {
            filePath,
            pixels: metadata.width * metadata.height,
            reason: "decompression_bomb",
          },
          "Decompression bomb detected, skipping",
        );
        return;
      }

      // Delete old variants from derived bucket before generating new ones
      const horseDoc = await db.collection("horses").doc(horseId).get();
      const existingData = horseDoc.data();
      const oldVariants = existingData?.[`${photoType}PhotoVariants`] as
        | Record<string, string>
        | undefined;
      if (oldVariants) {
        const validPrefix = `horses/${horseId}/`;
        await Promise.allSettled(
          Object.values(oldVariants)
            .filter((p) => typeof p === "string" && p.startsWith(validPrefix))
            .map((p) =>
              derivedBucket
                .file(p)
                .delete()
                .catch(() => {}),
            ),
        );
      }

      // Generate blurhash from a small version of the image
      const blurhashSize = 32;
      const blurhashBuffer = await sharpLib(buffer)
        .resize(blurhashSize, blurhashSize, { fit: "cover" })
        .ensureAlpha()
        .raw()
        .toBuffer();

      const blurhash = encode(
        new Uint8ClampedArray(blurhashBuffer),
        blurhashSize,
        blurhashSize,
        4,
        3,
      );

      // Generate size variants → write to derived bucket
      const variantPaths: Record<string, string> = {};
      const baseName = path.basename(fileName, path.extname(fileName));
      const resizedDir = `horses/${horseId}/profile/resized`;

      const uploadPromises = IMAGE_SIZE_VARIANTS.map(async (variant) => {
        const resizeOptions: import("sharp").ResizeOptions = isAvatar
          ? {
              width: variant.maxDimension,
              height: variant.maxDimension,
              fit: "cover" as const,
            }
          : {
              width: variant.maxDimension,
              height: variant.maxDimension,
              fit: "inside" as const,
              withoutEnlargement: true,
            };

        const resizedBuffer = await sharpLib(buffer)
          .resize(resizeOptions)
          .webp({ quality: variant.quality })
          .toBuffer();

        const variantPath = `${resizedDir}/${variant.name}_${baseName}.webp`;
        const variantFile = derivedBucket.file(variantPath);

        await variantFile.save(resizedBuffer, {
          metadata: {
            contentType: "image/webp",
            cacheControl: "public, max-age=31536000, immutable",
            metadata: {
              sourceFile: filePath,
              variant: variant.name,
              horseId,
              photoType,
            },
          },
        });

        variantPaths[variant.name] = variantPath;

        logger.info(
          {
            variant: variant.name,
            variantPath,
            sizeBytes: resizedBuffer.length,
          },
          "Generated variant",
        );
      });

      await Promise.all(uploadPromises);

      // Update Firestore horse document with variant paths + blurhash
      const horseRef = db.collection("horses").doc(horseId);

      if (!horseDoc.exists) {
        logger.warn(
          { horseId },
          "Horse document not found, skipping Firestore update",
        );
        return;
      }

      const updateData: Record<string, string | Record<string, string>> = {};

      if (photoType === "avatar") {
        updateData.avatarPhotoVariants = variantPaths;
        updateData.avatarPhotoBlurhash = blurhash;
      } else {
        updateData.coverPhotoVariants = variantPaths;
        updateData.coverPhotoBlurhash = blurhash;
      }

      await horseRef.update(updateData);

      logger.info(
        {
          horseId,
          photoType,
          variantCount: Object.keys(variantPaths).length,
          blurhashLength: blurhash.length,
          derivedBucket: getDerivedBucketName(),
        },
        "Image processing complete",
      );
    } catch (error) {
      logger.error(
        {
          horseId,
          filePath,
          error: error instanceof Error ? error.message : String(error),
        },
        "Failed to process image",
      );
      throw error; // Trigger retry
    }
  },
);
