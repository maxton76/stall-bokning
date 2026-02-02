import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import { isModuleEnabled } from "../middleware/checkModuleAccess.js";
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
    if (stableDoc.exists && stableDoc.data()?.ownerId === userId) return true;

    // Check organization membership with stable access
    if (await hasOrgStableAccess(horse.currentStableId, userId)) return true;
  }

  return false;
}

/**
 * Resolve organization from horse → stable → org chain and check module access.
 * Returns { allowed: true } if the module is enabled or no org gate applies.
 */
async function checkLocationHistoryModule(
  horseId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const horseDoc = await db.collection("horses").doc(horseId).get();
  if (!horseDoc.exists) return { allowed: false, reason: "Horse not found" };

  const horse = horseDoc.data()!;
  const stableId = horse.currentStableId;
  if (!stableId) return { allowed: true }; // No stable = no org gate

  const stableDoc = await db.collection("stables").doc(stableId).get();
  if (!stableDoc.exists) return { allowed: true };

  const organizationId = stableDoc.data()?.organizationId;
  if (!organizationId) return { allowed: true }; // No org = no gate

  const enabled = await isModuleEnabled(organizationId, "locationHistory");
  if (!enabled) {
    return {
      allowed: false,
      reason:
        'The "locationHistory" feature is not included in your subscription. Please upgrade to access this feature.',
    };
  }

  return { allowed: true };
}

export async function locationHistoryRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/location-history/horse/:horseId
   * Get location history for a horse
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

        // Check module access via horse → stable → org
        const moduleCheck = await checkLocationHistoryModule(horseId);
        if (!moduleCheck.allowed) {
          return reply.status(403).send({
            error: "Module not available",
            message: moduleCheck.reason,
          });
        }

        // Check access
        const hasAccess = await hasHorseAccess(horseId, user.uid, user.role);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this horse",
          });
        }

        // Get location history
        const snapshot = await db
          .collection("horses")
          .doc(horseId)
          .collection("locationHistory")
          .orderBy("arrivalDate", "desc")
          .get();

        const history = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            horseId,
            ...doc.data(),
          }),
        );

        return { history };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch location history");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch location history",
        });
      }
    },
  );

  /**
   * GET /api/v1/location-history/user/:userId
   * Get location history for all user's horses
   */
  fastify.get(
    "/user/:userId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { userId } = request.params as { userId: string };
        const user = (request as AuthenticatedRequest).user!;

        // Users can only access their own data unless system admin
        if (user.uid !== userId && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this data",
          });
        }

        // Get user's horses
        const horsesSnapshot = await db
          .collection("horses")
          .where("ownerId", "==", userId)
          .get();

        // Check module access using the first horse's org
        if (!horsesSnapshot.empty) {
          const moduleCheck = await checkLocationHistoryModule(
            horsesSnapshot.docs[0].id,
          );
          if (!moduleCheck.allowed) {
            return reply.status(403).send({
              error: "Module not available",
              message: moduleCheck.reason,
            });
          }
        }

        const allHistory: any[] = [];

        // Get location history for each horse
        for (const horseDoc of horsesSnapshot.docs) {
          const historySnapshot = await db
            .collection("horses")
            .doc(horseDoc.id)
            .collection("locationHistory")
            .orderBy("arrivalDate", "desc")
            .get();

          const horseHistory = historySnapshot.docs.map((doc) => ({
            id: doc.id,
            horseId: horseDoc.id,
            horseName: horseDoc.data().name,
            ...doc.data(),
          }));

          allHistory.push(...horseHistory);
        }

        // Sort by arrival date descending
        allHistory.sort((a, b) => {
          const dateA = a.arrivalDate?.toDate?.().getTime() || 0;
          const dateB = b.arrivalDate?.toDate?.().getTime() || 0;
          return dateB - dateA;
        });

        return {
          history: allHistory.map((entry) => serializeTimestamps(entry)),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch user location history");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch location history",
        });
      }
    },
  );

  /**
   * POST /api/v1/location-history/horse/:horseId
   * Create a location history entry
   */
  fastify.post(
    "/horse/:horseId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { horseId } = request.params as { horseId: string };
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        // Check module access via horse → stable → org
        const moduleCheck = await checkLocationHistoryModule(horseId);
        if (!moduleCheck.allowed) {
          return reply.status(403).send({
            error: "Module not available",
            message: moduleCheck.reason,
          });
        }

        // Check access
        const hasAccess = await hasHorseAccess(horseId, user.uid, user.role);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to update this horse",
          });
        }

        // Validate required fields
        if (!data.locationType || !data.arrivalDate) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Missing required fields: locationType, arrivalDate",
          });
        }

        // Get horse data
        const horseDoc = await db.collection("horses").doc(horseId).get();
        if (!horseDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Horse not found",
          });
        }

        const horse = horseDoc.data()!;

        // Create entry data
        const entryData: any = {
          horseName: horse.name,
          locationType: data.locationType,
          arrivalDate: Timestamp.fromDate(new Date(data.arrivalDate)),
          departureDate: data.departureDate
            ? Timestamp.fromDate(new Date(data.departureDate))
            : null,
          createdAt: Timestamp.now(),
          createdBy: user.uid,
          lastModifiedBy: user.uid,
        };

        // Add location-specific fields
        if (data.locationType === "stable") {
          entryData.stableId = data.stableId;
          entryData.stableName = data.stableName;
        } else if (data.locationType === "external") {
          entryData.externalContactId = data.externalContactId || null;
          entryData.externalLocation = data.externalLocation || null;
          entryData.externalMoveType = data.externalMoveType || null;
          entryData.externalMoveReason = data.externalMoveReason || null;
        }

        // Close any open location history entries
        const openEntriesSnapshot = await db
          .collection("horses")
          .doc(horseId)
          .collection("locationHistory")
          .where("departureDate", "==", null)
          .get();

        const batch = db.batch();

        for (const doc of openEntriesSnapshot.docs) {
          batch.update(doc.ref, {
            departureDate: entryData.arrivalDate,
            lastModifiedBy: user.uid,
          });
        }

        // Add new entry
        const newEntryRef = db
          .collection("horses")
          .doc(horseId)
          .collection("locationHistory")
          .doc();

        batch.set(newEntryRef, entryData);

        await batch.commit();

        return {
          id: newEntryRef.id,
          horseId,
          ...serializeTimestamps(entryData),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to create location history entry");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create location history entry",
        });
      }
    },
  );

  /**
   * PUT /api/v1/location-history/:horseId/:entryId/close
   * Close a location history entry
   */
  fastify.put(
    "/:horseId/:entryId/close",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { horseId, entryId } = request.params as {
          horseId: string;
          entryId: string;
        };
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        // Check module access via horse → stable → org
        const moduleCheck = await checkLocationHistoryModule(horseId);
        if (!moduleCheck.allowed) {
          return reply.status(403).send({
            error: "Module not available",
            message: moduleCheck.reason,
          });
        }

        // Check access
        const hasAccess = await hasHorseAccess(horseId, user.uid, user.role);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to update this horse",
          });
        }

        const docRef = db
          .collection("horses")
          .doc(horseId)
          .collection("locationHistory")
          .doc(entryId);

        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Location history entry not found",
          });
        }

        // Update with departure date
        const updates = {
          departureDate: data.departureDate
            ? Timestamp.fromDate(new Date(data.departureDate))
            : Timestamp.now(),
          lastModifiedBy: user.uid,
        };

        await docRef.update(updates);

        return {
          id: entryId,
          horseId,
          ...serializeTimestamps({ ...doc.data(), ...updates }),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to close location history entry");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to close location history entry",
        });
      }
    },
  );

  /**
   * GET /api/v1/location-history/horse/:horseId/current
   * Get current location for a horse
   */
  fastify.get(
    "/horse/:horseId/current",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { horseId } = request.params as { horseId: string };
        const user = (request as AuthenticatedRequest).user!;

        // Check module access via horse → stable → org
        const moduleCheck = await checkLocationHistoryModule(horseId);
        if (!moduleCheck.allowed) {
          return reply.status(403).send({
            error: "Module not available",
            message: moduleCheck.reason,
          });
        }

        // Check access
        const hasAccess = await hasHorseAccess(horseId, user.uid, user.role);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this horse",
          });
        }

        // Get current location (no departure date)
        const snapshot = await db
          .collection("horses")
          .doc(horseId)
          .collection("locationHistory")
          .where("departureDate", "==", null)
          .limit(1)
          .get();

        if (snapshot.empty) {
          return { currentLocation: null };
        }

        const doc = snapshot.docs[0];
        return {
          currentLocation: serializeTimestamps({
            id: doc.id,
            horseId,
            ...doc.data(),
          }),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch current location");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch current location",
        });
      }
    },
  );
}
