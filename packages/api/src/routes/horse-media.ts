import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { db, storage } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { serializeTimestamps } from "../utils/serialization.js";
import { sanitizeFileName } from "../utils/sanitization.js";
import {
  VALID_ENTITY_ID,
  ALLOWED_IMAGE_TYPES,
  VALID_PHOTO_PURPOSES,
} from "@equiduty/shared";

/**
 * Check if user has access to a horse
 */
async function hasHorseAccess(
  horseId: string,
  userId: string,
  userRole: string,
): Promise<boolean> {
  if (userRole === "system_admin") return true;

  const horseDoc = await db.collection("horses").doc(horseId).get();
  if (!horseDoc.exists) return false;

  const horse = horseDoc.data()!;

  if (horse.ownerId === userId) return true;

  if (horse.currentStableId) {
    const stableDoc = await db
      .collection("stables")
      .doc(horse.currentStableId)
      .get();

    if (stableDoc.exists) {
      const stable = stableDoc.data()!;
      if (stable.ownerId === userId) return true;

      if (stable.organizationId) {
        const memberId = `${userId}_${stable.organizationId}`;
        const memberDoc = await db
          .collection("organizationMembers")
          .doc(memberId)
          .get();

        if (memberDoc.exists) {
          const member = memberDoc.data()!;
          if (
            member.status === "active" &&
            (member.stableAccess === "all" ||
              (member.stableAccess === "specific" &&
                member.assignedStableIds?.includes(horse.currentStableId)))
          ) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

export async function horseMediaRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/horse-media/horse/:horseId
   * Get all media for a horse
   */
  fastify.get(
    "/horse/:horseId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { horseId } = request.params as { horseId: string };
        const user = (request as AuthenticatedRequest).user!;
        const {
          type,
          category,
          isFavorite,
          limit = "50",
          offset = "0",
        } = request.query as {
          type?: string;
          category?: string;
          isFavorite?: string;
          limit?: string;
          offset?: string;
        };

        if (!(await hasHorseAccess(horseId, user.uid, user.role || ""))) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this horse",
          });
        }

        let query = db
          .collection("horses")
          .doc(horseId)
          .collection("media")
          .orderBy("uploadedAt", "desc");

        if (type) {
          query = query.where("type", "==", type) as any;
        }
        if (category) {
          query = query.where("category", "==", category) as any;
        }
        if (isFavorite === "true") {
          query = query.where("isFavorite", "==", true) as any;
        }

        const snapshot = await query
          .limit(parseInt(limit, 10))
          .offset(parseInt(offset, 10))
          .get();

        const media = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { media };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch media");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch media",
        });
      }
    },
  );

  /**
   * GET /api/v1/horse-media/:id
   * Get a single media item
   */
  fastify.get(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { horseId } = request.query as { horseId: string };
        const user = (request as AuthenticatedRequest).user!;

        if (!horseId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "horseId query parameter is required",
          });
        }

        if (!(await hasHorseAccess(horseId, user.uid, user.role || ""))) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this horse",
          });
        }

        const doc = await db
          .collection("horses")
          .doc(horseId)
          .collection("media")
          .doc(id)
          .get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Media not found",
          });
        }

        return serializeTimestamps({
          id: doc.id,
          ...doc.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch media");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch media",
        });
      }
    },
  );

  /**
   * POST /api/v1/horse-media/upload-url
   * Generate a signed upload URL for Firebase Storage
   */
  fastify.post(
    "/upload-url",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        if (!data.horseId || !data.fileName || !data.mimeType || !data.type) {
          return reply.status(400).send({
            error: "Bad Request",
            message:
              "Missing required fields: horseId, fileName, mimeType, type",
          });
        }

        // Validate horseId format
        if (!VALID_ENTITY_ID.test(data.horseId)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid horseId format",
          });
        }

        // Validate MIME type for image uploads
        if (
          data.type === "photo" &&
          !ALLOWED_IMAGE_TYPES.includes(data.mimeType)
        ) {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Unsupported image type: ${data.mimeType}. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
          });
        }

        // Validate purpose if provided
        const purpose = data.purpose as string | undefined;
        if (
          purpose &&
          !VALID_PHOTO_PURPOSES.includes(
            purpose as (typeof VALID_PHOTO_PURPOSES)[number],
          )
        ) {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Invalid purpose: ${purpose}. Allowed: ${VALID_PHOTO_PURPOSES.join(", ")}`,
          });
        }

        if (!(await hasHorseAccess(data.horseId, user.uid, user.role || ""))) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this horse",
          });
        }

        // Sanitize filename: strip path separators, normalize unicode, limit length
        const timestamp = Date.now();
        const safeFileName = sanitizeFileName(data.fileName);
        const subFolder =
          purpose === "cover" || purpose === "avatar" ? "profile" : "media";
        // 'cover' | 'avatar' | 'general' — validated above
        const storagePath = `horses/${data.horseId}/${subFolder}/${timestamp}_${safeFileName}`;

        // Generate signed URL for upload
        const bucket = storage.bucket();
        const file = bucket.file(storagePath);

        const [uploadUrl] = await file.getSignedUrl({
          version: "v4",
          action: "write",
          expires: Date.now() + 15 * 60 * 1000, // 15 minutes
          contentType: data.mimeType,
        });

        // Generate a read URL (valid for 7 days)
        const [readUrl] = await file.getSignedUrl({
          version: "v4",
          action: "read",
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        return {
          uploadUrl,
          readUrl,
          storagePath,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to generate upload URL");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to generate upload URL",
        });
      }
    },
  );

  /**
   * POST /api/v1/horse-media
   * Create a media record (after successful upload)
   */
  fastify.post(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        if (
          !data.horseId ||
          !data.type ||
          !data.category ||
          !data.title ||
          !data.fileUrl ||
          !data.storagePath ||
          !data.fileName ||
          data.fileSize === undefined ||
          data.fileSize === null ||
          !data.mimeType
        ) {
          return reply.status(400).send({
            error: "Bad Request",
            message:
              "Missing required fields: horseId, type, category, title, fileUrl, storagePath, fileName, fileSize, mimeType",
          });
        }

        if (!(await hasHorseAccess(data.horseId, user.uid, user.role || ""))) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this horse",
          });
        }

        // Get horse name and user name for caching
        const [horseDoc, userDoc] = await Promise.all([
          db.collection("horses").doc(data.horseId).get(),
          db.collection("users").doc(user.uid).get(),
        ]);

        const horseName = horseDoc.data()?.name || "";
        const uploaderName = userDoc.exists
          ? `${userDoc.data()?.firstName || ""} ${userDoc.data()?.lastName || ""}`.trim()
          : "";

        // Use allowlist approach - only accept known, expected fields
        const mediaData = {
          horseId: data.horseId,
          type: data.type,
          category: data.category,
          title: data.title,
          fileUrl: data.fileUrl,
          storagePath: data.storagePath,
          fileName: data.fileName,
          fileSize: data.fileSize,
          mimeType: data.mimeType,
          description: data.description || "",
          tags: data.tags || [],
          purpose: data.purpose || null,
          horseName,
          uploadedBy: user.uid,
          uploadedByName: uploaderName,
          uploadedAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
          isFavorite: false, // Always default to false on creation
          isPublic: false, // Always default to false on creation
          expiryDate: data.expiryDate
            ? data.expiryDate instanceof Date
              ? Timestamp.fromDate(data.expiryDate)
              : typeof data.expiryDate === "string"
                ? Timestamp.fromDate(new Date(data.expiryDate))
                : data.expiryDate
            : null,
        };

        const docRef = await db
          .collection("horses")
          .doc(data.horseId)
          .collection("media")
          .add(mediaData);

        return reply.status(201).send(
          serializeTimestamps({
            id: docRef.id,
            ...mediaData,
          }),
        );
      } catch (error) {
        request.log.error({ error }, "Failed to create media record");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create media record",
        });
      }
    },
  );

  /**
   * PATCH /api/v1/horse-media/:id
   * Update media metadata
   */
  fastify.patch(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        if (!data.horseId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "horseId is required",
          });
        }

        if (!(await hasHorseAccess(data.horseId, user.uid, user.role || ""))) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this horse",
          });
        }

        const mediaRef = db
          .collection("horses")
          .doc(data.horseId)
          .collection("media")
          .doc(id);

        const mediaDoc = await mediaRef.get();

        if (!mediaDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Media not found",
          });
        }

        // Use allowlist approach - only accept fields that should be user-modifiable
        const updateData: any = {
          updatedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        };

        // Only allow updating specific fields
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined)
          updateData.description = data.description;
        if (data.category !== undefined) updateData.category = data.category;
        if (data.tags !== undefined) updateData.tags = data.tags;
        if (data.isFavorite !== undefined)
          updateData.isFavorite = data.isFavorite;

        // Handle expiryDate with proper null handling
        if (data.expiryDate !== undefined) {
          updateData.expiryDate =
            data.expiryDate === null
              ? null
              : data.expiryDate instanceof Date
                ? Timestamp.fromDate(data.expiryDate)
                : typeof data.expiryDate === "string"
                  ? Timestamp.fromDate(new Date(data.expiryDate))
                  : data.expiryDate;
        }

        await mediaRef.update(updateData);

        const updatedDoc = await mediaRef.get();
        return serializeTimestamps({
          id: updatedDoc.id,
          ...updatedDoc.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to update media");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update media",
        });
      }
    },
  );

  /**
   * DELETE /api/v1/horse-media/:id
   * Delete a media item (including from Storage)
   */
  fastify.delete(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { horseId } = request.query as { horseId: string };
        const user = (request as AuthenticatedRequest).user!;

        if (!horseId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "horseId query parameter is required",
          });
        }

        if (!(await hasHorseAccess(horseId, user.uid, user.role || ""))) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this horse",
          });
        }

        const mediaRef = db
          .collection("horses")
          .doc(horseId)
          .collection("media")
          .doc(id);

        const mediaDoc = await mediaRef.get();

        if (!mediaDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Media not found",
          });
        }

        const mediaData = mediaDoc.data()!;

        // Delete from Firebase Storage
        if (mediaData.storagePath) {
          try {
            const bucket = storage.bucket();
            await bucket.file(mediaData.storagePath).delete();
          } catch (storageError) {
            request.log.warn(
              { storageError, storagePath: mediaData.storagePath },
              "Failed to delete file from storage",
            );
          }
        }

        // Delete Firestore record
        await mediaRef.delete();

        return reply.status(204).send();
      } catch (error) {
        request.log.error({ error }, "Failed to delete media");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete media",
        });
      }
    },
  );

  /**
   * POST /api/v1/horse-media/:id/favorite
   * Toggle favorite status
   */
  fastify.post(
    "/:id/favorite",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        if (!data.horseId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "horseId is required",
          });
        }

        if (!(await hasHorseAccess(data.horseId, user.uid, user.role || ""))) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this horse",
          });
        }

        const mediaRef = db
          .collection("horses")
          .doc(data.horseId)
          .collection("media")
          .doc(id);

        const mediaDoc = await mediaRef.get();

        if (!mediaDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Media not found",
          });
        }

        const currentFavorite = mediaDoc.data()?.isFavorite || false;

        await mediaRef.update({
          isFavorite: !currentFavorite,
          updatedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        });

        return {
          id,
          isFavorite: !currentFavorite,
        };
      } catch (error) {
        request.log.error({ error }, "Failed to toggle favorite");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to toggle favorite",
        });
      }
    },
  );

  /**
   * GET /api/v1/horse-media/horse/:horseId/stats
   * Get media statistics for a horse
   */
  fastify.get(
    "/horse/:horseId/stats",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { horseId } = request.params as { horseId: string };
        const user = (request as AuthenticatedRequest).user!;

        if (!(await hasHorseAccess(horseId, user.uid, user.role || ""))) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this horse",
          });
        }

        const snapshot = await db
          .collection("horses")
          .doc(horseId)
          .collection("media")
          .get();

        const stats = {
          totalFiles: 0,
          totalPhotos: 0,
          totalVideos: 0,
          totalDocuments: 0,
          totalSizeBytes: 0,
          expiringDocuments: 0,
        };

        const now = new Date();
        const thirtyDaysFromNow = new Date(
          now.getTime() + 30 * 24 * 60 * 60 * 1000,
        );

        for (const doc of snapshot.docs) {
          const data = doc.data();
          stats.totalFiles++;
          stats.totalSizeBytes += data.fileSize || 0;

          switch (data.type) {
            case "photo":
              stats.totalPhotos++;
              break;
            case "video":
              stats.totalVideos++;
              break;
            case "document":
              stats.totalDocuments++;
              if (data.expiryDate) {
                const expiryDate = data.expiryDate.toDate?.();
                if (expiryDate && expiryDate <= thirtyDaysFromNow) {
                  stats.expiringDocuments++;
                }
              }
              break;
          }
        }

        return stats;
      } catch (error) {
        request.log.error({ error }, "Failed to fetch media stats");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch media stats",
        });
      }
    },
  );

  /**
   * GET /api/v1/horse-media/horse/:horseId/expiring
   * Get documents expiring soon
   */
  fastify.get(
    "/horse/:horseId/expiring",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { horseId } = request.params as { horseId: string };
        const user = (request as AuthenticatedRequest).user!;
        const { days = "30" } = request.query as { days?: string };

        if (!(await hasHorseAccess(horseId, user.uid, user.role || ""))) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this horse",
          });
        }

        const now = Timestamp.now();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() + parseInt(days, 10));

        const snapshot = await db
          .collection("horses")
          .doc(horseId)
          .collection("media")
          .where("type", "==", "document")
          .where("expiryDate", ">=", now)
          .where("expiryDate", "<=", Timestamp.fromDate(cutoffDate))
          .orderBy("expiryDate", "asc")
          .get();

        const media = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { media };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch expiring documents");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch expiring documents",
        });
      }
    },
  );
}
