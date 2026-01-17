import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { serializeTimestamps } from "../utils/serialization.js";

/**
 * Check if user has organization membership with stable access
 */
async function hasOrgStableAccess(
  stableId: string,
  userId: string,
): Promise<boolean> {
  const stableDoc = await db.collection("stables").doc(stableId).get();
  if (!stableDoc.exists) return false;

  const stable = stableDoc.data()!;
  const organizationId = stable.organizationId;

  if (!organizationId) return false;

  // Check organizationMembers collection
  const memberId = `${userId}_${organizationId}`;
  const memberDoc = await db
    .collection("organizationMembers")
    .doc(memberId)
    .get();

  if (!memberDoc.exists) return false;

  const member = memberDoc.data()!;
  if (member.status !== "active") return false;

  // Check stable access permissions
  if (member.stableAccess === "all") return true;
  if (member.stableAccess === "specific") {
    const assignedStables = member.assignedStableIds || [];
    if (assignedStables.includes(stableId)) return true;
  }

  return false;
}

/**
 * Get all stable IDs user has access to via organization ownership or memberships
 */
async function getUserOrgStableIds(userId: string): Promise<string[]> {
  const stableIds: string[] = [];

  // 1. Get stables from organizations user owns
  const ownedOrgs = await db
    .collection("organizations")
    .where("ownerId", "==", userId)
    .get();

  for (const orgDoc of ownedOrgs.docs) {
    const stablesSnapshot = await db
      .collection("stables")
      .where("organizationId", "==", orgDoc.id)
      .get();
    stableIds.push(...stablesSnapshot.docs.map((doc) => doc.id));
  }

  // 2. Get stables from organization memberships
  const orgMemberships = await db
    .collection("organizationMembers")
    .where("userId", "==", userId)
    .where("status", "==", "active")
    .get();

  for (const memberDoc of orgMemberships.docs) {
    const member = memberDoc.data();
    const organizationId = member.organizationId;

    if (member.stableAccess === "all") {
      // Get all stables in this organization
      const stablesSnapshot = await db
        .collection("stables")
        .where("organizationId", "==", organizationId)
        .get();
      stableIds.push(...stablesSnapshot.docs.map((doc) => doc.id));
    } else if (member.stableAccess === "specific") {
      // Add specific assigned stables
      const assignedStables = member.assignedStableIds || [];
      stableIds.push(...assignedStables);
    }
  }

  return [...new Set(stableIds)]; // Remove duplicates
}

export async function horsesRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v1/horses
   * Create a new horse
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

        if (!data.name) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Missing required field: name",
          });
        }

        const horseData = {
          ...data,
          ownerId: user.uid,
          isExternal: data.isExternal ?? false,
          status: data.status || "active",
          hasSpecialInstructions: !!(
            (data.specialInstructions &&
              data.specialInstructions.trim().length > 0) ||
            (data.equipment && data.equipment.length > 0)
          ),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: user.uid,
          lastModifiedBy: user.uid,
        };

        // For external horses, don't set stable-related fields
        if (data.isExternal) {
          delete horseData.currentStableId;
          delete horseData.currentStableName;
          delete horseData.assignedAt;
          delete horseData.usage;
        }

        const docRef = await db.collection("horses").add(horseData);
        const horseId = docRef.id;

        // Create initial location history entry if horse is assigned to a stable
        if (
          data.currentStableId &&
          data.currentStableName &&
          !data.isExternal
        ) {
          await db
            .collection("horses")
            .doc(horseId)
            .collection("locationHistory")
            .add({
              horseName: data.name,
              locationType: "stable",
              stableId: data.currentStableId,
              stableName: data.currentStableName,
              arrivalDate: data.assignedAt || Timestamp.now(),
              departureDate: null,
              createdAt: Timestamp.now(),
              createdBy: user.uid,
              lastModifiedBy: user.uid,
            });
        }

        return reply.status(201).send(
          serializeTimestamps({
            id: horseId,
            ...horseData,
          }),
        );
      } catch (error) {
        request.log.error({ error }, "Failed to create horse");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create horse",
        });
      }
    },
  );

  /**
   * PATCH /api/v1/horses/:id
   * Update a horse
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
        const updates = request.body as any;

        const horseDoc = await db.collection("horses").doc(id).get();

        if (!horseDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Horse not found",
          });
        }

        const horse = horseDoc.data()!;

        // Check if user owns the horse or is system_admin
        if (horse.ownerId !== user.uid && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to update this horse",
          });
        }

        // Compute hasSpecialInstructions if relevant fields are updated
        const mergedData = { ...horse, ...updates };
        const updateData = {
          ...updates,
          hasSpecialInstructions: !!(
            (mergedData.specialInstructions &&
              mergedData.specialInstructions.trim().length > 0) ||
            (mergedData.equipment && mergedData.equipment.length > 0)
          ),
          updatedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        };

        // Don't allow changing ownerId
        delete updateData.ownerId;
        delete updateData.createdAt;
        delete updateData.createdBy;

        await db.collection("horses").doc(id).update(updateData);

        const updatedDoc = await db.collection("horses").doc(id).get();
        return serializeTimestamps({
          id: updatedDoc.id,
          ...updatedDoc.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to update horse");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update horse",
        });
      }
    },
  );

  /**
   * DELETE /api/v1/horses/:id
   * Delete a horse
   */
  fastify.delete(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        const horseDoc = await db.collection("horses").doc(id).get();

        if (!horseDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Horse not found",
          });
        }

        const horse = horseDoc.data()!;

        // Check if user owns the horse or is system_admin
        if (horse.ownerId !== user.uid && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to delete this horse",
          });
        }

        await db.collection("horses").doc(id).delete();

        return reply.status(204).send();
      } catch (error) {
        request.log.error({ error }, "Failed to delete horse");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete horse",
        });
      }
    },
  );

  /**
   * GET /api/v1/horses
   * Returns horses owned by user OR in user's stables
   * Query params:
   *   - stableId (optional): Filter horses by stable
   *   - ownerId (optional): Filter horses by owner (must match authenticated user unless system_admin)
   *   - status (optional): Filter horses by status (e.g., 'active')
   */
  fastify.get(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { stableId, ownerId, status } = request.query as {
          stableId?: string;
          ownerId?: string;
          status?: string;
        };

        // Security: Only allow querying own horses unless system_admin
        if (ownerId && ownerId !== user.uid && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You can only query your own horses",
          });
        }

        // System admins can see all horses
        if (user.role === "system_admin") {
          let query = db.collection("horses");

          if (stableId) {
            query = query.where("currentStableId", "==", stableId) as any;
          }
          if (ownerId) {
            query = query.where("ownerId", "==", ownerId) as any;
          }
          if (status) {
            query = query.where("status", "==", status) as any;
          }

          const snapshot = await query.get();
          const horses = snapshot.docs.map((doc) =>
            serializeTimestamps({
              id: doc.id,
              ...doc.data(),
            }),
          );

          return { horses };
        }

        // Regular users: get horses they own OR horses in their stables
        // If ownerId is specified, only get owned horses (not stable horses)
        const getOwnedHorses = !ownerId || ownerId === user.uid;

        let ownedHorses: FirebaseFirestore.QuerySnapshot | null = null;
        if (getOwnedHorses) {
          let ownedQuery = db
            .collection("horses")
            .where("ownerId", "==", user.uid);

          if (stableId) {
            ownedQuery = ownedQuery.where(
              "currentStableId",
              "==",
              stableId,
            ) as any;
          }
          if (status) {
            ownedQuery = ownedQuery.where("status", "==", status) as any;
          }

          ownedHorses = await ownedQuery.get();

          // If ownerId filter is specified, only return owned horses
          if (ownerId === user.uid) {
            return {
              horses: ownedHorses.docs.map((doc) =>
                serializeTimestamps({ id: doc.id, ...doc.data() }),
              ),
            };
          }
        }

        // Get stables where user is owner or has org membership access
        const [ownedStables, orgStableIds] = await Promise.all([
          db.collection("stables").where("ownerId", "==", user.uid).get(),
          getUserOrgStableIds(user.uid),
        ]);

        const userStableIds = [
          ...ownedStables.docs.map((doc) => doc.id),
          ...orgStableIds,
        ];

        // Get horses in user's stables
        const stableHorses: any[] = [];

        if (userStableIds.length > 0) {
          // Firestore IN query limitation: max 10 items
          // If more than 10 stables, batch the queries
          const batchSize = 10;
          for (let i = 0; i < userStableIds.length; i += batchSize) {
            const batchIds = userStableIds.slice(i, i + batchSize);
            const snapshot = await db
              .collection("horses")
              .where("currentStableId", "in", batchIds)
              .get();

            stableHorses.push(
              ...snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              })),
            );
          }
        }

        // Combine owned horses and stable horses
        const allHorses = [
          ...(ownedHorses
            ? ownedHorses.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
            : []),
          ...stableHorses,
        ];

        // Remove duplicates
        const uniqueHorses = Array.from(
          new Map(allHorses.map((horse) => [horse.id, horse])).values(),
        );

        // Filter by stableId if provided (already filtered in queries above, but keep for safety)
        let filteredHorses = stableId
          ? uniqueHorses.filter((horse) => horse.currentStableId === stableId)
          : uniqueHorses;

        // Filter by status if provided
        if (status) {
          filteredHorses = filteredHorses.filter(
            (horse) => horse.status === status,
          );
        }

        // Serialize timestamps before returning
        return {
          horses: filteredHorses.map((horse) => serializeTimestamps(horse)),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch horses");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch horses",
        });
      }
    },
  );

  /**
   * GET /api/v1/horses/:id
   * Returns single horse if user has access (owns horse OR is member of horse's stable)
   */
  fastify.get(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        const doc = await db.collection("horses").doc(id).get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Horse not found",
          });
        }

        const horse = doc.data()!;

        // System admins can access any horse
        if (user.role === "system_admin") {
          return serializeTimestamps({ id: doc.id, ...horse });
        }

        // Check if user owns the horse
        if (horse.ownerId === user.uid) {
          return serializeTimestamps({ id: doc.id, ...horse });
        }

        // Check if horse is in a stable where user is owner or member
        if (horse.currentStableId) {
          const stableDoc = await db
            .collection("stables")
            .doc(horse.currentStableId)
            .get();

          if (stableDoc.exists) {
            const stable = stableDoc.data()!;

            // Check if user is stable owner
            if (stable.ownerId === user.uid) {
              return serializeTimestamps({ id: doc.id, ...horse });
            }

            // Check organization membership with stable access
            if (await hasOrgStableAccess(horse.currentStableId, user.uid)) {
              return serializeTimestamps({ id: doc.id, ...horse });
            }
          }
        }

        // User has no access to this horse
        return reply.status(403).send({
          error: "Forbidden",
          message: "You do not have permission to access this horse",
        });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch horse");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch horse",
        });
      }
    },
  );

  /**
   * GET /api/v1/horses/:id/special-instructions
   * Returns only the special instructions for a horse (lightweight endpoint for popover)
   */
  fastify.get(
    "/:id/special-instructions",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        const doc = await db.collection("horses").doc(id).get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Horse not found",
          });
        }

        const horse = doc.data()!;

        // Check access (same logic as GET /:id)
        let hasAccess = false;

        if (user.role === "system_admin") {
          hasAccess = true;
        } else if (horse.ownerId === user.uid) {
          hasAccess = true;
        } else if (horse.currentStableId) {
          const stableDoc = await db
            .collection("stables")
            .doc(horse.currentStableId)
            .get();

          if (stableDoc.exists) {
            const stable = stableDoc.data()!;
            if (stable.ownerId === user.uid) {
              hasAccess = true;
            } else if (
              await hasOrgStableAccess(horse.currentStableId, user.uid)
            ) {
              // Check organization membership with stable access
              hasAccess = true;
            }
          }
        }

        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this horse",
          });
        }

        // Return only special instructions data
        return {
          specialInstructions: horse.specialInstructions || "",
          equipment: horse.equipment || [],
        };
      } catch (error) {
        request.log.error(
          { error },
          "Failed to fetch horse special instructions",
        );
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch horse special instructions",
        });
      }
    },
  );

  /**
   * GET /api/v1/horses/expiring-vaccinations
   * Returns horses with vaccinations expiring soon that user has access to
   * Query params:
   *   - days (optional): Number of days to look ahead (default: 30)
   */
  fastify.get(
    "/expiring-vaccinations",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { days = "30" } = request.query as { days?: string };

        const daysAhead = parseInt(days, 10);
        if (isNaN(daysAhead) || daysAhead <= 0) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid days parameter",
          });
        }

        // Calculate cutoff date
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

        // Get all horses user has access to (reuse logic from GET /)
        let allUserHorses: any[] = [];

        if (user.role === "system_admin") {
          const snapshot = await db.collection("horses").get();
          allUserHorses = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
        } else {
          // Get owned horses
          const ownedHorses = await db
            .collection("horses")
            .where("ownerId", "==", user.uid)
            .get();

          // Get user's stables (owned + org membership access)
          const [ownedStables, orgStableIds] = await Promise.all([
            db.collection("stables").where("ownerId", "==", user.uid).get(),
            getUserOrgStableIds(user.uid),
          ]);

          const userStableIds = [
            ...ownedStables.docs.map((doc) => doc.id),
            ...orgStableIds,
          ];

          // Get horses in user's stables
          const stableHorses: any[] = [];

          if (userStableIds.length > 0) {
            const batchSize = 10;
            for (let i = 0; i < userStableIds.length; i += batchSize) {
              const batchIds = userStableIds.slice(i, i + batchSize);
              const snapshot = await db
                .collection("horses")
                .where("currentStableId", "in", batchIds)
                .get();

              stableHorses.push(
                ...snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                })),
              );
            }
          }

          // Combine and deduplicate
          allUserHorses = [
            ...ownedHorses.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
            ...stableHorses,
          ];

          const uniqueMap = new Map(
            allUserHorses.map((horse) => [horse.id, horse]),
          );
          allUserHorses = Array.from(uniqueMap.values());
        }

        // Filter horses with vaccinations expiring within the timeframe
        const expiringHorses = allUserHorses.filter((horse) => {
          if (!horse.nextVaccinationDue) return false;

          const dueDate = horse.nextVaccinationDue.toDate();
          const now = new Date();

          // Include horses with vaccinations due in the past or within the next N days
          return dueDate <= cutoffDate && dueDate >= now;
        });

        // Sort by due date (earliest first)
        expiringHorses.sort((a, b) => {
          const dateA = a.nextVaccinationDue?.toDate().getTime() || 0;
          const dateB = b.nextVaccinationDue?.toDate().getTime() || 0;
          return dateA - dateB;
        });

        // Serialize timestamps before returning
        return {
          horses: expiringHorses.map((horse) => serializeTimestamps(horse)),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch expiring vaccinations");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch expiring vaccinations",
        });
      }
    },
  );

  /**
   * POST /api/v1/horses/:id/assign-to-stable
   * Assign a horse to a stable
   */
  fastify.post(
    "/:id/assign-to-stable",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        if (!data.stableId || !data.stableName) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Missing required fields: stableId, stableName",
          });
        }

        const horseDoc = await db.collection("horses").doc(id).get();

        if (!horseDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Horse not found",
          });
        }

        const horse = horseDoc.data()!;

        // Check if user owns the horse
        if (horse.ownerId !== user.uid && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to assign this horse",
          });
        }

        // Batch write for horse update and location history
        const batch = db.batch();

        // Update horse
        batch.update(db.collection("horses").doc(id), {
          currentStableId: data.stableId,
          currentStableName: data.stableName,
          assignedAt: Timestamp.now(),
          lastModifiedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        });

        // Create location history entry
        const locationHistoryRef = db
          .collection("horses")
          .doc(id)
          .collection("locationHistory")
          .doc();

        batch.set(locationHistoryRef, {
          horseName: horse.name,
          locationType: "stable",
          stableId: data.stableId,
          stableName: data.stableName,
          arrivalDate: Timestamp.now(),
          departureDate: null,
          createdAt: Timestamp.now(),
          createdBy: user.uid,
          lastModifiedBy: user.uid,
        });

        await batch.commit();

        return { success: true, horseId: id, stableId: data.stableId };
      } catch (error) {
        request.log.error({ error }, "Failed to assign horse to stable");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to assign horse to stable",
        });
      }
    },
  );

  /**
   * POST /api/v1/horses/:id/unassign-from-stable
   * Unassign a horse from its current stable
   */
  fastify.post(
    "/:id/unassign-from-stable",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        const horseDoc = await db.collection("horses").doc(id).get();

        if (!horseDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Horse not found",
          });
        }

        const horse = horseDoc.data()!;

        // Check if user owns the horse
        if (horse.ownerId !== user.uid && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to unassign this horse",
          });
        }

        if (!horse.currentStableId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Horse is not currently assigned to a stable",
          });
        }

        // Batch write for horse update and location history
        const batch = db.batch();

        // Update horse
        batch.update(db.collection("horses").doc(id), {
          currentStableId: null,
          currentStableName: null,
          assignedAt: null,
          lastModifiedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        });

        // Close location history entry
        const openEntriesSnapshot = await db
          .collection("horses")
          .doc(id)
          .collection("locationHistory")
          .where("departureDate", "==", null)
          .get();

        for (const doc of openEntriesSnapshot.docs) {
          batch.update(doc.ref, {
            departureDate: Timestamp.now(),
            lastModifiedBy: user.uid,
          });
        }

        await batch.commit();

        return { success: true, horseId: id };
      } catch (error) {
        request.log.error({ error }, "Failed to unassign horse from stable");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to unassign horse from stable",
        });
      }
    },
  );

  /**
   * POST /api/v1/horses/:id/transfer
   * Transfer a horse from one stable to another
   */
  fastify.post(
    "/:id/transfer",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        if (!data.toStableId || !data.toStableName) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Missing required fields: toStableId, toStableName",
          });
        }

        const horseDoc = await db.collection("horses").doc(id).get();

        if (!horseDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Horse not found",
          });
        }

        const horse = horseDoc.data()!;

        // Check if user owns the horse
        if (horse.ownerId !== user.uid && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to transfer this horse",
          });
        }

        // Batch write
        const batch = db.batch();

        // Close current location history
        if (horse.currentStableId) {
          const openEntriesSnapshot = await db
            .collection("horses")
            .doc(id)
            .collection("locationHistory")
            .where("departureDate", "==", null)
            .get();

          for (const doc of openEntriesSnapshot.docs) {
            batch.update(doc.ref, {
              departureDate: Timestamp.now(),
              lastModifiedBy: user.uid,
            });
          }
        }

        // Update horse
        batch.update(db.collection("horses").doc(id), {
          currentStableId: data.toStableId,
          currentStableName: data.toStableName,
          assignedAt: Timestamp.now(),
          lastModifiedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        });

        // Create new location history entry
        const newLocationRef = db
          .collection("horses")
          .doc(id)
          .collection("locationHistory")
          .doc();

        batch.set(newLocationRef, {
          horseName: horse.name,
          locationType: "stable",
          stableId: data.toStableId,
          stableName: data.toStableName,
          arrivalDate: Timestamp.now(),
          departureDate: null,
          createdAt: Timestamp.now(),
          createdBy: user.uid,
          lastModifiedBy: user.uid,
        });

        await batch.commit();

        return { success: true, horseId: id, toStableId: data.toStableId };
      } catch (error) {
        request.log.error({ error }, "Failed to transfer horse");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to transfer horse",
        });
      }
    },
  );

  /**
   * POST /api/v1/horses/:id/move-external
   * Move a horse to an external location
   */
  fastify.post(
    "/:id/move-external",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        if (!data.externalLocation) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Missing required field: externalLocation",
          });
        }

        const horseDoc = await db.collection("horses").doc(id).get();

        if (!horseDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Horse not found",
          });
        }

        const horse = horseDoc.data()!;

        // Check if user owns the horse
        if (horse.ownerId !== user.uid && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to move this horse",
          });
        }

        // Batch write
        const batch = db.batch();

        // Close current location history
        if (horse.currentStableId) {
          const openEntriesSnapshot = await db
            .collection("horses")
            .doc(id)
            .collection("locationHistory")
            .where("departureDate", "==", null)
            .get();

          for (const doc of openEntriesSnapshot.docs) {
            batch.update(doc.ref, {
              departureDate: Timestamp.now(),
              lastModifiedBy: user.uid,
            });
          }
        }

        // Update horse - clear stable assignment
        batch.update(db.collection("horses").doc(id), {
          currentStableId: null,
          currentStableName: null,
          assignedAt: null,
          lastModifiedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        });

        // Create external location history entry
        const newLocationRef = db
          .collection("horses")
          .doc(id)
          .collection("locationHistory")
          .doc();

        batch.set(newLocationRef, {
          horseName: horse.name,
          locationType: "external",
          externalLocation: data.externalLocation,
          externalContactId: data.externalContactId || null,
          externalMoveType: data.externalMoveType || null,
          externalMoveReason: data.externalMoveReason || null,
          arrivalDate: Timestamp.now(),
          departureDate: null,
          createdAt: Timestamp.now(),
          createdBy: user.uid,
          lastModifiedBy: user.uid,
        });

        await batch.commit();

        return {
          success: true,
          horseId: id,
          externalLocation: data.externalLocation,
        };
      } catch (error) {
        request.log.error(
          { error },
          "Failed to move horse to external location",
        );
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to move horse to external location",
        });
      }
    },
  );

  /**
   * POST /api/v1/horses/:id/assign-to-group
   * Assign a horse to a group
   */
  fastify.post(
    "/:id/assign-to-group",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        if (!data.groupId || !data.groupName) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Missing required fields: groupId, groupName",
          });
        }

        const horseDoc = await db.collection("horses").doc(id).get();

        if (!horseDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Horse not found",
          });
        }

        const horse = horseDoc.data()!;

        // Check if user owns the horse
        if (horse.ownerId !== user.uid && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to assign this horse",
          });
        }

        await db.collection("horses").doc(id).update({
          horseGroupId: data.groupId,
          horseGroupName: data.groupName,
          updatedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        });

        return { success: true, horseId: id, groupId: data.groupId };
      } catch (error) {
        request.log.error({ error }, "Failed to assign horse to group");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to assign horse to group",
        });
      }
    },
  );

  /**
   * POST /api/v1/horses/:id/unassign-from-group
   * Unassign a horse from its current group
   */
  fastify.post(
    "/:id/unassign-from-group",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        const horseDoc = await db.collection("horses").doc(id).get();

        if (!horseDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Horse not found",
          });
        }

        const horse = horseDoc.data()!;

        // Check if user owns the horse
        if (horse.ownerId !== user.uid && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to unassign this horse",
          });
        }

        await db.collection("horses").doc(id).update({
          horseGroupId: null,
          horseGroupName: null,
          updatedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        });

        return { success: true, horseId: id };
      } catch (error) {
        request.log.error({ error }, "Failed to unassign horse from group");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to unassign horse from group",
        });
      }
    },
  );

  /**
   * POST /api/v1/horses/batch/unassign-from-group
   * Unassign all horses from a specific group
   * Body: { groupId: string }
   */
  fastify.post(
    "/batch/unassign-from-group",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        if (!data.groupId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Missing required field: groupId",
          });
        }

        // Get all horses in the group
        const horsesSnapshot = await db
          .collection("horses")
          .where("horseGroupId", "==", data.groupId)
          .where("status", "==", "active")
          .get();

        if (horsesSnapshot.empty) {
          return { success: true, unassignedCount: 0 };
        }

        // Verify user owns all horses or is system_admin
        const unauthorizedHorses = horsesSnapshot.docs.filter(
          (doc) =>
            doc.data().ownerId !== user.uid && user.role !== "system_admin",
        );

        if (unauthorizedHorses.length > 0) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You do not have permission to unassign some of these horses",
          });
        }

        // Batch update all horses
        const batch = db.batch();
        horsesSnapshot.docs.forEach((horseDoc) => {
          batch.update(horseDoc.ref, {
            horseGroupId: null,
            horseGroupName: null,
            updatedAt: Timestamp.now(),
            lastModifiedBy: user.uid,
          });
        });

        await batch.commit();

        return { success: true, unassignedCount: horsesSnapshot.size };
      } catch (error) {
        request.log.error(
          { error },
          "Failed to batch unassign horses from group",
        );
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to batch unassign horses from group",
        });
      }
    },
  );

  /**
   * POST /api/v1/horses/batch/unassign-from-vaccination-rule
   * Unassign all horses from a specific vaccination rule
   * Body: { ruleId: string }
   */
  fastify.post(
    "/batch/unassign-from-vaccination-rule",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        if (!data.ruleId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Missing required field: ruleId",
          });
        }

        // Get all horses with the vaccination rule
        const horsesSnapshot = await db
          .collection("horses")
          .where("vaccinationRuleId", "==", data.ruleId)
          .where("status", "==", "active")
          .get();

        if (horsesSnapshot.empty) {
          return { success: true, unassignedCount: 0 };
        }

        // Verify user owns all horses or is system_admin
        const unauthorizedHorses = horsesSnapshot.docs.filter(
          (doc) =>
            doc.data().ownerId !== user.uid && user.role !== "system_admin",
        );

        if (unauthorizedHorses.length > 0) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You do not have permission to unassign some of these horses",
          });
        }

        // Batch update all horses
        const batch = db.batch();
        horsesSnapshot.docs.forEach((horseDoc) => {
          batch.update(horseDoc.ref, {
            vaccinationRuleId: null,
            vaccinationRuleName: null,
            updatedAt: Timestamp.now(),
            lastModifiedBy: user.uid,
          });
        });

        await batch.commit();

        return { success: true, unassignedCount: horsesSnapshot.size };
      } catch (error) {
        request.log.error(
          { error },
          "Failed to batch unassign horses from vaccination rule",
        );
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to batch unassign horses from vaccination rule",
        });
      }
    },
  );

  /**
   * POST /api/v1/horses/:id/assign-vaccination-rule
   * Assign a vaccination rule to a horse
   */
  fastify.post(
    "/:id/assign-vaccination-rule",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        if (!data.ruleId || !data.ruleName) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Missing required fields: ruleId, ruleName",
          });
        }

        const horseDoc = await db.collection("horses").doc(id).get();

        if (!horseDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Horse not found",
          });
        }

        const horse = horseDoc.data()!;

        // Check if user owns the horse
        if (horse.ownerId !== user.uid && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to update this horse",
          });
        }

        await db.collection("horses").doc(id).update({
          vaccinationRuleId: data.ruleId,
          vaccinationRuleName: data.ruleName,
          updatedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        });

        return { success: true, horseId: id, ruleId: data.ruleId };
      } catch (error) {
        request.log.error(
          { error },
          "Failed to assign vaccination rule to horse",
        );
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to assign vaccination rule to horse",
        });
      }
    },
  );

  /**
   * POST /api/v1/horses/:id/unassign-vaccination-rule
   * Unassign vaccination rule from a horse
   */
  fastify.post(
    "/:id/unassign-vaccination-rule",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        const horseDoc = await db.collection("horses").doc(id).get();

        if (!horseDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Horse not found",
          });
        }

        const horse = horseDoc.data()!;

        // Check if user owns the horse
        if (horse.ownerId !== user.uid && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to update this horse",
          });
        }

        await db.collection("horses").doc(id).update({
          vaccinationRuleId: null,
          vaccinationRuleName: null,
          updatedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        });

        return { success: true, horseId: id };
      } catch (error) {
        request.log.error(
          { error },
          "Failed to unassign vaccination rule from horse",
        );
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to unassign vaccination rule from horse",
        });
      }
    },
  );

  /**
   * POST /api/v1/horses/batch/unassign-member-horses
   * Unassign all horses owned by a user from a specific stable
   * Body: { userId: string, stableId: string }
   */
  fastify.post(
    "/batch/unassign-member-horses",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        if (!data.userId || !data.stableId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Missing required fields: userId, stableId",
          });
        }

        // Verify user has permission (must be stable owner/admin or the horse owner)
        if (data.userId !== user.uid && user.role !== "system_admin") {
          // Check if user is stable owner
          const stableDoc = await db
            .collection("stables")
            .doc(data.stableId)
            .get();
          if (!stableDoc.exists || stableDoc.data()?.ownerId !== user.uid) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to unassign these horses",
            });
          }
        }

        // Get all horses owned by the user at the stable
        const horsesSnapshot = await db
          .collection("horses")
          .where("ownerId", "==", data.userId)
          .where("currentStableId", "==", data.stableId)
          .get();

        if (horsesSnapshot.empty) {
          return { success: true, unassignedCount: 0 };
        }

        // Batch update all horses
        const batch = db.batch();
        horsesSnapshot.docs.forEach((horseDoc) => {
          batch.update(horseDoc.ref, {
            currentStableId: null,
            currentStableName: null,
            assignedAt: null,
            updatedAt: Timestamp.now(),
            lastModifiedBy: user.uid,
          });
        });

        await batch.commit();

        return { success: true, unassignedCount: horsesSnapshot.size };
      } catch (error) {
        request.log.error({ error }, "Failed to batch unassign member horses");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to batch unassign member horses",
        });
      }
    },
  );
}
