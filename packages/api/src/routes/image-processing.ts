/**
 * Image Processing Admin Routes
 *
 * Endpoints for reprocessing horse images into optimized variants.
 * Requires system_admin role.
 */

import type { FastifyInstance } from "fastify";
import { db, storage } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import { requireSystemAdmin } from "../middleware/requireSystemAdmin.js";
import sharp from "sharp";
import { encode } from "blurhash";
import { IMAGE_SIZE_VARIANTS, VALID_ENTITY_ID } from "@equiduty/shared";

const adminPreHandler = [authenticate, requireSystemAdmin];

/**
 * Process a single image: generate variants + blurhash
 */
async function processImage(
  sourceBucket: ReturnType<typeof storage.bucket>,
  targetBucket: ReturnType<typeof storage.bucket>,
  storagePath: string,
  horseId: string,
  photoType: "avatar" | "cover",
): Promise<{
  variantPaths: Record<string, string>;
  blurhash: string;
}> {
  const file = sourceBucket.file(storagePath);
  const [buffer] = await file.download();

  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("Could not read image dimensions");
  }

  const isAvatar = photoType === "avatar";

  // Generate blurhash
  const blurhashSize = 32;
  const blurhashBuffer = await sharp(buffer)
    .resize(blurhashSize, blurhashSize, { fit: "cover" })
    .ensureAlpha()
    .raw()
    .toBuffer();

  const blurhashStr = encode(
    new Uint8ClampedArray(blurhashBuffer),
    blurhashSize,
    blurhashSize,
    4,
    3,
  );

  // Generate variants → write to target (derived) bucket
  const variantPaths: Record<string, string> = {};
  const ext = storagePath.split(".").pop() || "jpg";
  const baseName = storagePath.split("/").pop()!.replace(`.${ext}`, "");
  const resizedDir = `horses/${horseId}/profile/resized`;

  await Promise.all(
    IMAGE_SIZE_VARIANTS.map(async (variant) => {
      const resizeOptions: sharp.ResizeOptions = isAvatar
        ? {
            width: variant.maxDimension,
            height: variant.maxDimension,
            fit: "cover",
          }
        : {
            width: variant.maxDimension,
            height: variant.maxDimension,
            fit: "inside",
            withoutEnlargement: true,
          };

      const resizedBuffer = await sharp(buffer)
        .resize(resizeOptions)
        .webp({ quality: variant.quality })
        .toBuffer();

      const variantPath = `${resizedDir}/${variant.name}_${baseName}.webp`;
      const variantFile = targetBucket.file(variantPath);

      await variantFile.save(resizedBuffer, {
        metadata: {
          contentType: "image/webp",
          cacheControl: "public, max-age=31536000, immutable",
          metadata: {
            sourceFile: storagePath,
            variant: variant.name,
            horseId,
            photoType,
          },
        },
      });

      variantPaths[variant.name] = variantPath;
    }),
  );

  return { variantPaths, blurhash: blurhashStr };
}

export async function imageProcessingRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v1/admin/reprocess-images/:horseId
   * Reprocess a specific horse's profile photos
   */
  fastify.post(
    "/:horseId",
    { preHandler: adminPreHandler },
    async (request, reply) => {
      try {
        const { horseId } = request.params as { horseId: string };

        if (!VALID_ENTITY_ID.test(horseId)) {
          return reply
            .status(400)
            .send({ error: "Bad Request", message: "Invalid horseId" });
        }

        const horseDoc = await db.collection("horses").doc(horseId).get();

        if (!horseDoc.exists) {
          return reply
            .status(404)
            .send({ error: "Not Found", message: "Horse not found" });
        }

        const horse = horseDoc.data()!;
        const sourceBucket = storage.bucket();
        const derivedBucketName = process.env.DERIVED_IMAGES_BUCKET;
        const targetBucket = derivedBucketName
          ? storage.bucket(derivedBucketName)
          : sourceBucket;
        const updateData: Record<string, any> = {};
        const results: Record<string, any> = {};

        // Process cover photo
        if (horse.coverPhotoPath) {
          try {
            const { variantPaths, blurhash } = await processImage(
              sourceBucket,
              targetBucket,
              horse.coverPhotoPath,
              horseId,
              "cover",
            );
            updateData.coverPhotoVariants = variantPaths;
            updateData.coverPhotoBlurhash = blurhash;
            results.cover = {
              success: true,
              variants: Object.keys(variantPaths),
            };
          } catch (err) {
            results.cover = {
              success: false,
              error: err instanceof Error ? err.message : String(err),
            };
          }
        }

        // Process avatar photo
        if (horse.avatarPhotoPath) {
          try {
            const { variantPaths, blurhash } = await processImage(
              sourceBucket,
              targetBucket,
              horse.avatarPhotoPath,
              horseId,
              "avatar",
            );
            updateData.avatarPhotoVariants = variantPaths;
            updateData.avatarPhotoBlurhash = blurhash;
            results.avatar = {
              success: true,
              variants: Object.keys(variantPaths),
            };
          } catch (err) {
            results.avatar = {
              success: false,
              error: err instanceof Error ? err.message : String(err),
            };
          }
        }

        if (Object.keys(updateData).length > 0) {
          await db.collection("horses").doc(horseId).update(updateData);
        }

        return { horseId, results };
      } catch (error) {
        request.log.error({ error }, "Failed to reprocess images");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to reprocess images",
        });
      }
    },
  );

  /**
   * POST /api/v1/admin/reprocess-images
   * Batch reprocess all horses missing image variants
   */
  fastify.post("/", { preHandler: adminPreHandler }, async (request, reply) => {
    try {
      const { limit = "50" } = request.query as { limit?: string };
      const maxLimit = Math.min(parseInt(limit, 10) || 50, 200);

      // Find horses with photos but without variants
      const snapshot = await db.collection("horses").get();
      const sourceBucket = storage.bucket();
      const derivedBucketName = process.env.DERIVED_IMAGES_BUCKET;
      const targetBucket = derivedBucketName
        ? storage.bucket(derivedBucketName)
        : sourceBucket;

      const results: Array<{ horseId: string; status: string; details?: any }> =
        [];
      let processed = 0;

      for (const doc of snapshot.docs) {
        if (processed >= maxLimit) break;

        const horse = doc.data();
        const needsCover = horse.coverPhotoPath && !horse.coverPhotoVariants;
        const needsAvatar = horse.avatarPhotoPath && !horse.avatarPhotoVariants;

        if (!needsCover && !needsAvatar) continue;

        processed++;
        const horseResult: any = { horseId: doc.id, status: "processed" };
        const updateData: Record<string, any> = {};

        if (needsCover) {
          try {
            const { variantPaths, blurhash } = await processImage(
              sourceBucket,
              targetBucket,
              horse.coverPhotoPath,
              doc.id,
              "cover",
            );
            updateData.coverPhotoVariants = variantPaths;
            updateData.coverPhotoBlurhash = blurhash;
          } catch (err) {
            horseResult.coverError =
              err instanceof Error ? err.message : String(err);
          }
        }

        if (needsAvatar) {
          try {
            const { variantPaths, blurhash } = await processImage(
              sourceBucket,
              targetBucket,
              horse.avatarPhotoPath,
              doc.id,
              "avatar",
            );
            updateData.avatarPhotoVariants = variantPaths;
            updateData.avatarPhotoBlurhash = blurhash;
          } catch (err) {
            horseResult.avatarError =
              err instanceof Error ? err.message : String(err);
          }
        }

        if (Object.keys(updateData).length > 0) {
          await db.collection("horses").doc(doc.id).update(updateData);
        }

        results.push(horseResult);
      }

      return {
        processed: results.length,
        total: snapshot.size,
        results,
      };
    } catch (error) {
      request.log.error({ error }, "Failed to batch reprocess images");
      return reply.status(500).send({
        error: "Internal Server Error",
        message: "Failed to batch reprocess images",
      });
    }
  });
}
