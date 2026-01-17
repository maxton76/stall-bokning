import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { serializeTimestamps } from "../utils/serialization.js";

/**
 * Check if user can manage horse ownership (owner or admin)
 */
async function canManageOwnership(
  horseId: string,
  userId: string,
  userRole: string,
): Promise<boolean> {
  if (userRole === "system_admin") return true;

  const horseDoc = await db.collection("horses").doc(horseId).get();
  if (!horseDoc.exists) return false;

  const horse = horseDoc.data()!;

  // Only horse owner can manage ownership
  if (horse.ownerId === userId) return true;

  // Check if user is stable owner/admin
  if (horse.currentStableId) {
    const stableDoc = await db
      .collection("stables")
      .doc(horse.currentStableId)
      .get();

    if (stableDoc.exists) {
      const stable = stableDoc.data()!;
      if (stable.ownerId === userId) return true;
    }
  }

  return false;
}

/**
 * Check if user has read access to horse
 */
async function hasHorseReadAccess(
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

export async function horseOwnershipRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/horse-ownership/horse/:horseId
   * Get all ownership records for a horse
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
        const { includeInactive = "false" } = request.query as {
          includeInactive?: string;
        };

        // Check read access
        if (!(await hasHorseReadAccess(horseId, user.uid, user.role || ""))) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this horse",
          });
        }

        let query = db
          .collection("horses")
          .doc(horseId)
          .collection("ownership")
          .orderBy("percentage", "desc");

        const snapshot = await query.get();

        let ownerships = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Filter out inactive ownerships unless requested
        if (includeInactive !== "true") {
          ownerships = ownerships.filter((o: any) => !o.endDate);
        }

        return {
          ownerships: ownerships.map((o) => serializeTimestamps(o)),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch ownerships");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch ownerships",
        });
      }
    },
  );

  /**
   * GET /api/v1/horse-ownership/:id
   * Get a single ownership record
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

        if (!(await hasHorseReadAccess(horseId, user.uid, user.role || ""))) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this horse",
          });
        }

        const doc = await db
          .collection("horses")
          .doc(horseId)
          .collection("ownership")
          .doc(id)
          .get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Ownership record not found",
          });
        }

        return serializeTimestamps({
          id: doc.id,
          ...doc.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch ownership");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch ownership",
        });
      }
    },
  );

  /**
   * POST /api/v1/horse-ownership
   * Create a new ownership record
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
          !data.ownerName ||
          data.percentage === undefined ||
          !data.role ||
          !data.startDate
        ) {
          return reply.status(400).send({
            error: "Bad Request",
            message:
              "Missing required fields: horseId, ownerName, percentage, role, startDate",
          });
        }

        if (
          !(await canManageOwnership(data.horseId, user.uid, user.role || ""))
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to manage ownership",
          });
        }

        // Validate percentage
        if (data.percentage <= 0 || data.percentage > 100) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Percentage must be between 0 and 100",
          });
        }

        // Check total percentage doesn't exceed 100%
        const existingSnapshot = await db
          .collection("horses")
          .doc(data.horseId)
          .collection("ownership")
          .where("endDate", "==", null)
          .get();

        const currentTotal = existingSnapshot.docs.reduce(
          (sum, doc) => sum + (doc.data().percentage || 0),
          0,
        );

        if (currentTotal + data.percentage > 100) {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Total ownership cannot exceed 100%. Current: ${currentTotal}%, Adding: ${data.percentage}%`,
          });
        }

        // Get horse name for caching
        const horseDoc = await db.collection("horses").doc(data.horseId).get();
        const horseName = horseDoc.data()?.name || "";

        const ownershipData = {
          ...data,
          horseName,
          startDate:
            data.startDate instanceof Date
              ? Timestamp.fromDate(data.startDate)
              : typeof data.startDate === "string"
                ? Timestamp.fromDate(new Date(data.startDate))
                : data.startDate,
          endDate: data.endDate
            ? data.endDate instanceof Date
              ? Timestamp.fromDate(data.endDate)
              : typeof data.endDate === "string"
                ? Timestamp.fromDate(new Date(data.endDate))
                : data.endDate
            : null,
          createdAt: Timestamp.now(),
          createdBy: user.uid,
          updatedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        };

        const docRef = await db
          .collection("horses")
          .doc(data.horseId)
          .collection("ownership")
          .add(ownershipData);

        return reply.status(201).send(
          serializeTimestamps({
            id: docRef.id,
            ...ownershipData,
          }),
        );
      } catch (error) {
        request.log.error({ error }, "Failed to create ownership");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create ownership",
        });
      }
    },
  );

  /**
   * PATCH /api/v1/horse-ownership/:id
   * Update an ownership record
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

        if (
          !(await canManageOwnership(data.horseId, user.uid, user.role || ""))
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to manage ownership",
          });
        }

        const ownershipRef = db
          .collection("horses")
          .doc(data.horseId)
          .collection("ownership")
          .doc(id);

        const ownershipDoc = await ownershipRef.get();

        if (!ownershipDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Ownership record not found",
          });
        }

        // Validate percentage if being updated
        if (data.percentage !== undefined) {
          if (data.percentage <= 0 || data.percentage > 100) {
            return reply.status(400).send({
              error: "Bad Request",
              message: "Percentage must be between 0 and 100",
            });
          }

          // Check total percentage
          const existingSnapshot = await db
            .collection("horses")
            .doc(data.horseId)
            .collection("ownership")
            .where("endDate", "==", null)
            .get();

          const currentTotal = existingSnapshot.docs.reduce((sum, doc) => {
            // Exclude current record from total
            if (doc.id === id) return sum;
            return sum + (doc.data().percentage || 0);
          }, 0);

          if (currentTotal + data.percentage > 100) {
            return reply.status(400).send({
              error: "Bad Request",
              message: `Total ownership cannot exceed 100%. Current (excluding this): ${currentTotal}%, New: ${data.percentage}%`,
            });
          }
        }

        const updateData = {
          ...data,
          startDate: data.startDate
            ? data.startDate instanceof Date
              ? Timestamp.fromDate(data.startDate)
              : typeof data.startDate === "string"
                ? Timestamp.fromDate(new Date(data.startDate))
                : data.startDate
            : undefined,
          endDate:
            data.endDate === null
              ? null
              : data.endDate
                ? data.endDate instanceof Date
                  ? Timestamp.fromDate(data.endDate)
                  : typeof data.endDate === "string"
                    ? Timestamp.fromDate(new Date(data.endDate))
                    : data.endDate
                : undefined,
          updatedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        };

        // Remove undefined values and protected fields
        delete updateData.horseId;
        delete updateData.createdAt;
        delete updateData.createdBy;
        Object.keys(updateData).forEach((key) => {
          if (updateData[key] === undefined) {
            delete updateData[key];
          }
        });

        await ownershipRef.update(updateData);

        const updatedDoc = await ownershipRef.get();
        return serializeTimestamps({
          id: updatedDoc.id,
          ...updatedDoc.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to update ownership");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update ownership",
        });
      }
    },
  );

  /**
   * DELETE /api/v1/horse-ownership/:id
   * Delete an ownership record
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

        if (!(await canManageOwnership(horseId, user.uid, user.role || ""))) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to manage ownership",
          });
        }

        const ownershipRef = db
          .collection("horses")
          .doc(horseId)
          .collection("ownership")
          .doc(id);

        const ownershipDoc = await ownershipRef.get();

        if (!ownershipDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Ownership record not found",
          });
        }

        await ownershipRef.delete();

        return reply.status(204).send();
      } catch (error) {
        request.log.error({ error }, "Failed to delete ownership");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete ownership",
        });
      }
    },
  );

  /**
   * POST /api/v1/horse-ownership/:id/end
   * End an ownership (set end date)
   */
  fastify.post(
    "/:id/end",
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

        if (
          !(await canManageOwnership(data.horseId, user.uid, user.role || ""))
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to manage ownership",
          });
        }

        const ownershipRef = db
          .collection("horses")
          .doc(data.horseId)
          .collection("ownership")
          .doc(id);

        const ownershipDoc = await ownershipRef.get();

        if (!ownershipDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Ownership record not found",
          });
        }

        const endDate = data.endDate
          ? data.endDate instanceof Date
            ? Timestamp.fromDate(data.endDate)
            : typeof data.endDate === "string"
              ? Timestamp.fromDate(new Date(data.endDate))
              : data.endDate
          : Timestamp.now();

        await ownershipRef.update({
          endDate,
          updatedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        });

        const updatedDoc = await ownershipRef.get();
        return serializeTimestamps({
          id: updatedDoc.id,
          ...updatedDoc.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to end ownership");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to end ownership",
        });
      }
    },
  );

  /**
   * GET /api/v1/horse-ownership/horse/:horseId/validate
   * Validate ownership percentages for a horse
   */
  fastify.get(
    "/horse/:horseId/validate",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { horseId } = request.params as { horseId: string };
        const user = (request as AuthenticatedRequest).user!;

        if (!(await hasHorseReadAccess(horseId, user.uid, user.role || ""))) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this horse",
          });
        }

        const snapshot = await db
          .collection("horses")
          .doc(horseId)
          .collection("ownership")
          .where("endDate", "==", null)
          .get();

        const ownerships = snapshot.docs.map((doc) => ({
          id: doc.id,
          percentage: doc.data().percentage || 0,
          ownerName: doc.data().ownerName,
        }));

        const totalPercentage = ownerships.reduce(
          (sum, o) => sum + o.percentage,
          0,
        );

        const errors: string[] = [];
        const warnings: string[] = [];

        if (totalPercentage > 100) {
          errors.push(
            `Total ownership percentage (${totalPercentage}%) exceeds 100%`,
          );
        }

        if (totalPercentage < 100 && totalPercentage > 0) {
          warnings.push(
            `Total ownership percentage (${totalPercentage}%) is less than 100%`,
          );
        }

        ownerships.forEach((o) => {
          if (o.percentage <= 0) {
            errors.push(`${o.ownerName}: Percentage must be greater than 0`);
          }
        });

        return {
          isValid: errors.length === 0,
          totalPercentage,
          ownerCount: ownerships.length,
          ownerships,
          errors,
          warnings,
        };
      } catch (error) {
        request.log.error({ error }, "Failed to validate ownership");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to validate ownership",
        });
      }
    },
  );
}
