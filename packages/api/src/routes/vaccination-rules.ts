import type { FastifyInstance } from "fastify";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { Timestamp } from "firebase-admin/firestore";

/**
 * Convert Firestore Timestamps to ISO date strings for JSON serialization
 */
function serializeTimestamps(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Timestamp || (obj && typeof obj.toDate === "function")) {
    return obj.toDate().toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => serializeTimestamps(item));
  }

  if (typeof obj === "object" && obj.constructor === Object) {
    const serialized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        serialized[key] = serializeTimestamps(obj[key]);
      }
    }
    return serialized;
  }

  return obj;
}

/**
 * Check if user has access to an organization
 * Checks both direct organization membership and stable membership
 */
async function hasOrganizationAccess(
  organizationId: string,
  userId: string,
  userRole: string,
): Promise<boolean> {
  if (userRole === "system_admin") return true;

  // Check direct organization membership
  const orgMemberDoc = await db
    .collection("organizationMembers")
    .doc(`${userId}_${organizationId}`)
    .get();

  if (orgMemberDoc.exists) return true;

  // Check stable membership - user might have access through a stable in this organization
  const stablesSnapshot = await db
    .collection("stables")
    .where("organizationId", "==", organizationId)
    .get();

  for (const stableDoc of stablesSnapshot.docs) {
    const stableId = stableDoc.id;

    // Check if user is stable owner
    if (stableDoc.data().ownerId === userId) {
      return true;
    }

    // Check if user is stable member
    const memberDoc = await db
      .collection("stableMembers")
      .doc(`${userId}_${stableId}`)
      .get();

    if (memberDoc.exists && memberDoc.data()?.status === "active") {
      return true;
    }
  }

  return false;
}

export async function vaccinationRulesRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/vaccination-rules
   * Get vaccination rules (system, organization, or user-specific)
   * Query params:
   *   - scope: 'system' | 'organization' | 'user'
   *   - organizationId: required if scope is 'organization'
   */
  fastify.get(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { scope = "system", organizationId } = request.query as {
          scope?: "system" | "organization" | "user";
          organizationId?: string;
        };

        let query = db.collection("vaccinationRules");

        if (scope === "system") {
          query = query.where("scope", "==", "system") as any;
        } else if (scope === "organization") {
          if (!organizationId) {
            return reply.status(400).send({
              error: "Bad Request",
              message: "organizationId is required for organization scope",
            });
          }

          // Check organization access (including stable membership)
          const hasAccess = await hasOrganizationAccess(
            organizationId,
            user.uid,
            user.role,
          );

          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to access this organization",
            });
          }

          query = query
            .where("scope", "==", "organization")
            .where("organizationId", "==", organizationId) as any;
        } else if (scope === "user") {
          query = query
            .where("scope", "==", "user")
            .where("userId", "==", user.uid) as any;
        }

        const snapshot = await query.get();

        const rules = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { rules };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch vaccination rules");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch vaccination rules",
        });
      }
    },
  );

  /**
   * GET /api/v1/vaccination-rules/:id
   * Get a specific vaccination rule
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

        const doc = await db.collection("vaccinationRules").doc(id).get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Vaccination rule not found",
          });
        }

        const rule = doc.data()!;

        // Check access based on scope
        if (rule.scope === "system" && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access system rules",
          });
        }

        if (rule.scope === "organization") {
          const hasAccess = await hasOrganizationAccess(
            rule.organizationId,
            user.uid,
            user.role,
          );

          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to access this rule",
            });
          }
        }

        if (
          rule.scope === "user" &&
          rule.userId !== user.uid &&
          user.role !== "system_admin"
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this rule",
          });
        }

        return serializeTimestamps({ id: doc.id, ...rule });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch vaccination rule");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch vaccination rule",
        });
      }
    },
  );

  /**
   * POST /api/v1/vaccination-rules
   * Create a new vaccination rule
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

        // Validate required fields
        if (!data.vaccineName || !data.intervalMonths || !data.scope) {
          return reply.status(400).send({
            error: "Bad Request",
            message:
              "Missing required fields: vaccineName, intervalMonths, scope",
          });
        }

        // Authorization checks
        if (data.scope === "system" && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Only system admins can create system-level rules",
          });
        }

        if (data.scope === "organization") {
          if (!data.organizationId) {
            return reply.status(400).send({
              error: "Bad Request",
              message: "organizationId is required for organization scope",
            });
          }

          // Check if user has permission to create rules for this organization
          const hasAccess = await hasOrganizationAccess(
            data.organizationId,
            user.uid,
            user.role,
          );

          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to create rules for this organization",
            });
          }

          // Additional check: must be org admin for creation (not just member)
          const memberDoc = await db
            .collection("organizationMembers")
            .doc(`${user.uid}_${data.organizationId}`)
            .get();

          if (
            memberDoc.exists &&
            memberDoc.data()?.role !== "admin" &&
            user.role !== "system_admin"
          ) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "Only organization admins can create vaccination rules",
            });
          }
        }

        // Create rule data
        const ruleData: any = {
          vaccineName: data.vaccineName,
          intervalMonths: data.intervalMonths,
          scope: data.scope,
          alertDaysBefore: data.alertDaysBefore || 30,
          isActive: data.isActive !== undefined ? data.isActive : true,
          description: data.description || null,
          createdAt: Timestamp.now(),
          createdBy: user.uid,
          lastModifiedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        };

        if (data.scope === "organization") {
          ruleData.organizationId = data.organizationId;
        }

        if (data.scope === "user") {
          ruleData.userId = user.uid;
        }

        const docRef = await db.collection("vaccinationRules").add(ruleData);

        return { id: docRef.id, ...serializeTimestamps(ruleData) };
      } catch (error) {
        request.log.error({ error }, "Failed to create vaccination rule");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create vaccination rule",
        });
      }
    },
  );

  /**
   * PUT /api/v1/vaccination-rules/:id
   * Update a vaccination rule
   */
  fastify.put(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        // Get existing rule
        const docRef = db.collection("vaccinationRules").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Vaccination rule not found",
          });
        }

        const rule = doc.data()!;

        // Authorization checks
        if (rule.scope === "system" && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to update system rules",
          });
        }

        if (rule.scope === "organization") {
          const hasAccess = await hasOrganizationAccess(
            rule.organizationId,
            user.uid,
            user.role,
          );

          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to update this rule",
            });
          }

          // Additional check: must be org admin for updates (not just member)
          const memberDoc = await db
            .collection("organizationMembers")
            .doc(`${user.uid}_${rule.organizationId}`)
            .get();

          if (
            memberDoc.exists &&
            memberDoc.data()?.role !== "admin" &&
            user.role !== "system_admin"
          ) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "Only organization admins can update vaccination rules",
            });
          }
        }

        if (
          rule.scope === "user" &&
          rule.userId !== user.uid &&
          user.role !== "system_admin"
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to update this rule",
          });
        }

        // Update rule
        const updates: any = {
          lastModifiedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        };

        if (data.vaccineName) updates.vaccineName = data.vaccineName;
        if (data.intervalMonths) updates.intervalMonths = data.intervalMonths;
        if (data.alertDaysBefore !== undefined)
          updates.alertDaysBefore = data.alertDaysBefore;
        if (data.isActive !== undefined) updates.isActive = data.isActive;
        if (data.description !== undefined)
          updates.description = data.description;

        await docRef.update(updates);

        return { id, ...serializeTimestamps({ ...rule, ...updates }) };
      } catch (error) {
        request.log.error({ error }, "Failed to update vaccination rule");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update vaccination rule",
        });
      }
    },
  );

  /**
   * DELETE /api/v1/vaccination-rules/:id
   * Delete a vaccination rule
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

        // Get existing rule
        const docRef = db.collection("vaccinationRules").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Vaccination rule not found",
          });
        }

        const rule = doc.data()!;

        // Authorization checks
        if (rule.scope === "system" && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to delete system rules",
          });
        }

        if (rule.scope === "organization") {
          const hasAccess = await hasOrganizationAccess(
            rule.organizationId,
            user.uid,
            user.role,
          );

          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to delete this rule",
            });
          }

          // Additional check: must be org admin for deletion (not just member)
          const memberDoc = await db
            .collection("organizationMembers")
            .doc(`${user.uid}_${rule.organizationId}`)
            .get();

          if (
            memberDoc.exists &&
            memberDoc.data()?.role !== "admin" &&
            user.role !== "system_admin"
          ) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "Only organization admins can delete vaccination rules",
            });
          }
        }

        if (
          rule.scope === "user" &&
          rule.userId !== user.uid &&
          user.role !== "system_admin"
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to delete this rule",
          });
        }

        await docRef.delete();

        return { success: true, id };
      } catch (error) {
        request.log.error({ error }, "Failed to delete vaccination rule");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete vaccination rule",
        });
      }
    },
  );
}
