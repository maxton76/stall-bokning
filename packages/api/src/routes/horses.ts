import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { serializeTimestamps } from "../utils/serialization.js";
import {
  getHorseAccessContext,
  canAccessStable,
  hasStableAccess,
} from "../utils/authorization.js";
import { projectHorseFields } from "../utils/horseProjection.js";
import {
  recalculateHorseVaccinationStatus,
  calculateAssignmentStatus,
} from "../utils/vaccinationStatusCalculator.js";
import type { Horse, HorseVaccinationAssignment } from "@stall-bokning/shared";

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

/**
 * Get owned horses with full access (Level 5: owner)
 */
async function getOwnedHorses(
  userId: string,
  stableId?: string,
  status?: string,
): Promise<any[]> {
  let query = db.collection("horses").where("ownerId", "==", userId);

  if (stableId) {
    query = query.where("currentStableId", "==", stableId) as any;
  }
  if (status) {
    query = query.where("status", "==", status) as any;
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    _accessLevel: "owner",
    _isOwner: true,
  }));
}

/**
 * Get horses in a specific stable with role-based projection
 */
async function getStableHorsesWithProjection(
  userId: string,
  systemRole: string,
  stableId: string,
  status?: string,
): Promise<any[]> {
  // Get horses in stable
  let query = db.collection("horses").where("currentStableId", "==", stableId);
  if (status) {
    query = query.where("status", "==", status) as any;
  }

  const snapshot = await query.get();
  const horses = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  // Apply projection based on user's role for each horse
  const projected = await Promise.all(
    horses.map(async (horse: any) => {
      // Skip horses user owns (they get full access via getOwnedHorses)
      if (horse.ownerId === userId) {
        return null;
      }

      const context = await getHorseAccessContext(horse.id, userId, systemRole);
      if (!context) {
        return null; // Should not happen if stable access was verified
      }

      const projectedHorse = projectHorseFields(
        horse as Horse,
        context.accessLevel,
        context,
      );

      return serializeTimestamps(projectedHorse);
    }),
  );

  return projected.filter((h) => h !== null) as any[];
}

/**
 * Get all horses accessible to user across all their stables with projection
 */
async function getAllAccessibleHorses(
  userId: string,
  systemRole: string,
  status?: string,
): Promise<any[]> {
  // Get owned horses (full access)
  const ownedHorses = await getOwnedHorses(userId, undefined, status);

  // Get user's accessible stables
  const [ownedStables, orgStableIds] = await Promise.all([
    db.collection("stables").where("ownerId", "==", userId).get(),
    getUserOrgStableIds(userId),
  ]);

  const userStableIds = [
    ...ownedStables.docs.map((doc) => doc.id),
    ...orgStableIds,
  ];

  // Get horses in accessible stables (with projection)
  const stableHorses: any[] = [];

  if (userStableIds.length > 0) {
    // Firestore IN query limitation: max 10 items
    const batchSize = 10;
    for (let i = 0; i < userStableIds.length; i += batchSize) {
      const batchIds = userStableIds.slice(i, i + batchSize);

      let query = db
        .collection("horses")
        .where("currentStableId", "in", batchIds);

      if (status) {
        query = query.where("status", "==", status) as any;
      }

      const snapshot = await query.get();
      const horses = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Apply projection for each horse
      for (const horse of horses) {
        // Skip owned horses (already included above)
        if ((horse as any).ownerId === userId) {
          continue;
        }

        const context = await getHorseAccessContext(
          horse.id,
          userId,
          systemRole,
        );
        if (context) {
          const projectedHorse = projectHorseFields(
            horse as Horse,
            context.accessLevel,
            context,
          );
          stableHorses.push(serializeTimestamps(projectedHorse));
        }
      }
    }
  }

  // Combine and deduplicate
  return [...ownedHorses, ...stableHorses];
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

        // Find owner's personal organization to set ownerOrganizationId
        let ownerOrganizationId: string | undefined;
        try {
          // First, try to find a personal organization
          const personalOrgsSnapshot = await db
            .collection("organizations")
            .where("ownerId", "==", user.uid)
            .where("organizationType", "==", "personal")
            .limit(1)
            .get();

          if (!personalOrgsSnapshot.empty) {
            ownerOrganizationId = personalOrgsSnapshot.docs[0].id;
          } else {
            // Fall back to any organization owned by the user
            const anyOrgSnapshot = await db
              .collection("organizations")
              .where("ownerId", "==", user.uid)
              .limit(1)
              .get();

            if (!anyOrgSnapshot.empty) {
              ownerOrganizationId = anyOrgSnapshot.docs[0].id;
            }
          }
        } catch (orgError) {
          request.log.warn(
            { error: orgError },
            "Failed to find owner organization for horse",
          );
        }

        const horseData: Record<string, unknown> = {
          ...data,
          ownerId: user.uid,
          ownerOrganizationId: ownerOrganizationId || null,
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
          delete horseData.placementOrganizationId;
          delete horseData.placementStableId;
          delete horseData.placementDate;
        }

        // Handle placement if horse is being assigned to a stable owned by different org
        if (data.currentStableId && !data.isExternal && ownerOrganizationId) {
          try {
            const stableDoc = await db
              .collection("stables")
              .doc(data.currentStableId)
              .get();

            if (stableDoc.exists) {
              const stableOrgId = stableDoc.data()?.organizationId;
              // If stable belongs to a different organization, set placement fields
              if (stableOrgId && stableOrgId !== ownerOrganizationId) {
                horseData.placementOrganizationId = stableOrgId;
                horseData.placementStableId = data.currentStableId;
                horseData.placementDate = Timestamp.now();
              }
            }
          } catch (stableError) {
            request.log.warn(
              { error: stableError },
              "Failed to determine placement organization for horse",
            );
          }
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
   * Returns horses based on scope with field-level RBAC
   * Query params:
   *   - scope (optional): 'my' (owned), 'stable' (specific stable), 'all' (all accessible) - default: 'my'
   *   - stableId (optional): Filter horses by stable (required if scope='stable')
   *   - status (optional): Filter horses by status (e.g., 'active')
   *   - ownerId (optional, DEPRECATED): Filter horses by owner (for backward compatibility)
   */
  fastify.get(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const {
          scope = "my",
          stableId,
          status,
          ownerId,
        } = request.query as {
          scope?: "my" | "stable" | "all";
          stableId?: string;
          status?: string;
          ownerId?: string;
        };

        // Security: Only allow querying own horses unless system_admin
        if (ownerId && ownerId !== user.uid && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You can only query your own horses",
          });
        }

        // System admins can see all horses without projection
        if (user.role === "system_admin" && scope === "all") {
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
              _accessLevel: "owner",
              _isOwner: false,
            }),
          );

          return {
            horses,
            meta: {
              scope,
              count: horses.length,
            },
          };
        }

        let horses: any[] = [];

        if (scope === "my" || ownerId === user.uid) {
          // Only owned horses (Level 5 - full data)
          horses = await getOwnedHorses(user.uid, stableId, status);
        } else if (scope === "stable") {
          // Horses in specific stable (role-filtered)
          if (!stableId) {
            return reply.status(400).send({
              error: "Bad Request",
              message: "stableId required for scope=stable",
            });
          }

          // Verify stable access
          const hasAccess = await canAccessStable(user.uid, stableId);
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have access to this stable",
            });
          }

          // Get owned horses in this stable (full access)
          const ownedInStable = await getOwnedHorses(
            user.uid,
            stableId,
            status,
          );

          // Get other horses in stable with projection
          const stableHorsesProjected = await getStableHorsesWithProjection(
            user.uid,
            user.role,
            stableId,
            status,
          );

          horses = [...ownedInStable, ...stableHorsesProjected];
        } else if (scope === "all") {
          // All accessible horses (owned + stable horses, role-filtered)
          horses = await getAllAccessibleHorses(user.uid, user.role, status);
        }

        return {
          horses: horses.map((h) => serializeTimestamps(h)),
          meta: {
            scope,
            count: horses.length,
          },
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
   * Returns single horse with field-level RBAC based on user's role
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

        const horse = doc.data()! as Horse;

        // Get access context for this horse
        const context = await getHorseAccessContext(id, user.uid, user.role);

        if (!context) {
          // User has no access to this horse
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this horse",
          });
        }

        // Apply field projection based on access level
        const projectedHorse = projectHorseFields(
          { ...horse, id: doc.id } as Horse,
          context.accessLevel,
          context,
        );

        return serializeTimestamps(projectedHorse);
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

        // Determine if this is a placement change (new stable belongs to different org)
        let placementUpdate: Record<string, unknown> = {};
        const toStableDoc = await db
          .collection("stables")
          .doc(data.toStableId)
          .get();

        if (toStableDoc.exists) {
          const toStableOrgId = toStableDoc.data()?.organizationId;
          const ownerOrgId = horse.ownerOrganizationId;

          if (toStableOrgId && ownerOrgId && toStableOrgId !== ownerOrgId) {
            // Horse is being placed at a different organization's stable
            placementUpdate = {
              placementOrganizationId: toStableOrgId,
              placementStableId: data.toStableId,
              placementDate: Timestamp.now(), // New placement date for history visibility cutoff
            };
          } else if (toStableOrgId === ownerOrgId) {
            // Horse is returning to owner's organization - clear placement
            placementUpdate = {
              placementOrganizationId: null,
              placementStableId: null,
              placementDate: null,
            };
          }
        }

        // Update horse
        batch.update(db.collection("horses").doc(id), {
          currentStableId: data.toStableId,
          currentStableName: data.toStableName,
          assignedAt: Timestamp.now(),
          lastModifiedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
          ...placementUpdate,
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

        // Verify user has access to the stable where the group belongs
        const group = await db
          .collection("horseGroups")
          .doc(data.groupId)
          .get();
        if (!group.exists) {
          return reply.status(404).send({ error: "Group not found" });
        }

        const groupStableId = group.data()?.stableId;
        if (groupStableId) {
          const hasAccess = await hasStableAccess(
            groupStableId,
            user.uid,
            user.role || "",
          );
          if (!hasAccess) {
            return reply.status(404).send({ error: "Resource not found" });
          }
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

        // Verify user owns all horses, has stable access, or is system_admin
        const unauthorizedHorses = horsesSnapshot.docs.filter(
          (doc) =>
            doc.data().ownerId !== user.uid && user.role !== "system_admin",
        );

        if (unauthorizedHorses.length > 0 && !groupStableId) {
          return reply.status(404).send({ error: "Resource not found" });
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
   * GET /api/v1/horses/:id/organization
   * Get the organization ID for a horse's current stable
   * Returns null if horse is not assigned to a stable or stable has no organization
   * Falls back to owner's organization membership if horse is unassigned
   */
  fastify.get(
    "/:id/organization",
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

        // Check access: user must own the horse, have stable access, or be system_admin
        let hasAccess = false;

        if (user.role === "system_admin") {
          hasAccess = true;
        } else if (horse.ownerId === user.uid) {
          hasAccess = true;
        } else if (horse.currentStableId) {
          hasAccess = await canAccessStable(user.uid, horse.currentStableId);
        }

        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this horse",
          });
        }

        // If horse is assigned to a stable, get organization from stable
        if (horse.currentStableId) {
          const stableDoc = await db
            .collection("stables")
            .doc(horse.currentStableId)
            .get();

          if (stableDoc.exists) {
            const organizationId = stableDoc.data()?.organizationId || null;
            return { organizationId };
          }
        }

        // For unassigned horses, get organization from owner's membership
        if (horse.ownerId) {
          const membershipsSnapshot = await db
            .collection("organizationMembers")
            .where("userId", "==", horse.ownerId)
            .where("status", "==", "active")
            .limit(1)
            .get();

          if (!membershipsSnapshot.empty) {
            const organizationId =
              membershipsSnapshot.docs[0]!.data().organizationId;
            return { organizationId };
          }
        }

        return { organizationId: null };
      } catch (error) {
        request.log.error({ error }, "Failed to get horse organization");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to get horse organization",
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

        // Verify requesting user has access to the stable
        const hasAccess = await hasStableAccess(
          data.stableId,
          user.uid,
          user.role || "",
        );
        if (!hasAccess) {
          return reply.status(404).send({ error: "Resource not found" });
        }

        // Verify user has permission (must be stable owner/admin or the horse owner)
        if (data.userId !== user.uid && user.role !== "system_admin") {
          // Check if user is stable owner
          const stableDoc = await db
            .collection("stables")
            .doc(data.stableId)
            .get();
          if (!stableDoc.exists || stableDoc.data()?.ownerId !== user.uid) {
            return reply.status(404).send({ error: "Resource not found" });
          }
        }

        // Note: We don't require target user to be a stable member - they might just own horses there
        // The query below will verify they actually have horses at the stable

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

  // ============================================================
  // Multiple Vaccination Rule Assignment Endpoints (New System)
  // ============================================================

  /**
   * GET /api/v1/horses/:id/vaccination-rules
   * Get all vaccination rules assigned to a horse with their individual status
   */
  fastify.get(
    "/:id/vaccination-rules",
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

        // Check if user owns the horse or has stable access
        let hasAccess = false;
        if (user.role === "system_admin") {
          hasAccess = true;
        } else if (horse.ownerId === user.uid) {
          hasAccess = true;
        } else if (horse.currentStableId) {
          hasAccess = await canAccessStable(user.uid, horse.currentStableId);
        }

        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this horse",
          });
        }

        const assignments: HorseVaccinationAssignment[] =
          horse.assignedVaccinationRules || [];

        return {
          assignments: assignments.map((a) => serializeTimestamps(a)),
          count: assignments.length,
          aggregateStatus: horse.vaccinationStatus || "no_rule",
          nextVaccinationDue: horse.nextVaccinationDue
            ? serializeTimestamps({ date: horse.nextVaccinationDue }).date
            : null,
          lastVaccinationDate: horse.lastVaccinationDate
            ? serializeTimestamps({ date: horse.lastVaccinationDate }).date
            : null,
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch horse vaccination rules");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch horse vaccination rules",
        });
      }
    },
  );

  /**
   * POST /api/v1/horses/:id/vaccination-rules
   * Assign a vaccination rule to a horse (new multi-rule system)
   * Body: { ruleId: string }
   */
  fastify.post(
    "/:id/vaccination-rules",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as { ruleId: string };

        if (!data.ruleId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Missing required field: ruleId",
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

        // Get the vaccination rule details
        const ruleDoc = await db
          .collection("vaccinationRules")
          .doc(data.ruleId)
          .get();

        if (!ruleDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Vaccination rule not found",
          });
        }

        const rule = ruleDoc.data()!;

        // Check if rule is already assigned
        const existingAssignments: HorseVaccinationAssignment[] =
          horse.assignedVaccinationRules || [];
        const alreadyAssigned = existingAssignments.some(
          (a) => a.ruleId === data.ruleId,
        );

        if (alreadyAssigned) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "This vaccination rule is already assigned to the horse",
          });
        }

        // Get rule period from VaccinationRule fields
        const periodMonths = rule.periodMonths || 0;
        const periodDays = rule.periodDays || 0;

        // Calculate initial status based on existing vaccination records for this rule
        const statusResult = await calculateAssignmentStatus(
          id,
          data.ruleId,
          periodMonths,
          periodDays,
        );

        // Create the new assignment
        // Use 'any' for Timestamp fields to avoid admin SDK vs client SDK type mismatch
        const newAssignment = {
          ruleId: data.ruleId,
          ruleName: rule.name,
          rulePeriodMonths: periodMonths,
          rulePeriodDays: periodDays,
          assignedAt: Timestamp.now(),
          assignedBy: user.uid,
          status: statusResult.status,
          lastVaccinationDate: statusResult.lastVaccinationDate ?? undefined,
          nextDueDate: statusResult.nextDueDate ?? undefined,
          latestRecordId: statusResult.latestRecordId ?? undefined,
        } as HorseVaccinationAssignment;

        // Add to assignments array
        const updatedAssignments = [...existingAssignments, newAssignment];

        // Update horse document with new assignment BEFORE recalculation
        await db.collection("horses").doc(id).update({
          assignedVaccinationRules: updatedAssignments,
          vaccinationRuleCount: updatedAssignments.length,
          updatedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        });

        // Recalculate aggregate status and update horse
        const { aggregateStatus, nearestDueDate } =
          await recalculateHorseVaccinationStatus(id, user.uid);

        return {
          success: true,
          assignment: serializeTimestamps(newAssignment),
          totalAssignments: updatedAssignments.length,
          aggregateStatus,
          nextVaccinationDue: nearestDueDate?.toISOString() || null,
        };
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
   * DELETE /api/v1/horses/:horseId/vaccination-rules/:ruleId
   * Remove a vaccination rule assignment from a horse
   */
  fastify.delete(
    "/:horseId/vaccination-rules/:ruleId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { horseId, ruleId } = request.params as {
          horseId: string;
          ruleId: string;
        };
        const user = (request as AuthenticatedRequest).user!;

        const horseDoc = await db.collection("horses").doc(horseId).get();

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

        // Get current assignments
        const existingAssignments: HorseVaccinationAssignment[] =
          horse.assignedVaccinationRules || [];

        // Find and remove the assignment
        const assignmentIndex = existingAssignments.findIndex(
          (a) => a.ruleId === ruleId,
        );

        if (assignmentIndex === -1) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Vaccination rule assignment not found",
          });
        }

        // Remove the assignment
        existingAssignments.splice(assignmentIndex, 1);

        // Update horse document
        await db.collection("horses").doc(horseId).update({
          assignedVaccinationRules: existingAssignments,
          vaccinationRuleCount: existingAssignments.length,
          updatedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        });

        // Recalculate aggregate status
        const { aggregateStatus, nearestDueDate } =
          await recalculateHorseVaccinationStatus(horseId, user.uid);

        return {
          success: true,
          remainingAssignments: existingAssignments.length,
          aggregateStatus,
          nextVaccinationDue: nearestDueDate?.toISOString() || null,
        };
      } catch (error) {
        request.log.error(
          { error },
          "Failed to remove vaccination rule from horse",
        );
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to remove vaccination rule from horse",
        });
      }
    },
  );

  /**
   * POST /api/v1/horses/:id/vaccination-rules/recalculate
   * Force recalculation of all vaccination rule statuses for a horse
   */
  fastify.post(
    "/:id/vaccination-rules/recalculate",
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

        // Check if user owns the horse or has stable access
        let hasAccess = false;
        if (user.role === "system_admin") {
          hasAccess = true;
        } else if (horse.ownerId === user.uid) {
          hasAccess = true;
        } else if (horse.currentStableId) {
          hasAccess = await canAccessStable(user.uid, horse.currentStableId);
        }

        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to update this horse",
          });
        }

        // Recalculate all assignment statuses
        const result = await recalculateHorseVaccinationStatus(id, user.uid);

        return {
          success: true,
          assignments: result.assignments.map((a) => serializeTimestamps(a)),
          aggregateStatus: result.aggregateStatus,
          nextVaccinationDue: result.nearestDueDate?.toISOString() || null,
          lastVaccinationDate:
            result.mostRecentVaccinationDate?.toISOString() || null,
        };
      } catch (error) {
        request.log.error(
          { error },
          "Failed to recalculate vaccination status",
        );
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to recalculate vaccination status",
        });
      }
    },
  );
}
