import type { FastifyInstance } from "fastify";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { serializeTimestamps } from "../utils/serialization.js";

/**
 * Check if user has admin access to an organization
 */
async function hasOrganizationAdminAccess(
  organizationId: string,
  userId: string,
  userRole: string,
): Promise<boolean> {
  if (userRole === "system_admin") return true;

  // Check if user is organization owner
  const orgDoc = await db.collection("organizations").doc(organizationId).get();
  if (orgDoc.exists && orgDoc.data()?.ownerId === userId) {
    return true;
  }

  // Check if user is organization administrator
  const memberId = `${userId}_${organizationId}`;
  const memberDoc = await db
    .collection("organizationMembers")
    .doc(memberId)
    .get();
  if (memberDoc.exists) {
    const memberData = memberDoc.data();
    if (
      memberData?.status === "active" &&
      (memberData?.roles?.includes("administrator") ||
        memberData?.primaryRole === "administrator")
    ) {
      return true;
    }
  }

  return false;
}

export async function auditLogsRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v1/audit-logs
   * Create a new audit log entry
   * This endpoint is for internal API use - services should call this
   * to create audit entries instead of writing to Firestore directly
   */
  fastify.post(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as {
          action: string;
          resource: string;
          resourceId?: string;
          resourceName?: string;
          organizationId?: string;
          stableId?: string;
          details?: Record<string, unknown>;
          userEmail?: string;
          userName?: string;
        };

        if (!data.action || !data.resource) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "action and resource are required",
          });
        }

        // Generate unique log ID
        const logId = `${data.resource}_${data.action}_${Date.now()}`;

        const auditLogData = {
          logId,
          userId: user.uid,
          userEmail: data.userEmail || user.email,
          userName: data.userName,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId || null,
          resourceName: data.resourceName || null,
          organizationId: data.organizationId || null,
          stableId: data.stableId || null,
          details: data.details || null,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"] || null,
          timestamp: Timestamp.now(),
          createdAt: Timestamp.now(),
        };

        const docRef = await db.collection("auditLogs").add(auditLogData);

        return reply.status(201).send({
          id: docRef.id,
          logId,
          ...serializeTimestamps(auditLogData),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to create audit log");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create audit log",
        });
      }
    },
  );

  /**
   * GET /api/v1/audit-logs/organization/:organizationId
   * Get audit logs for an organization (admin only)
   */
  fastify.get(
    "/organization/:organizationId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId } = request.params as { organizationId: string };
        const {
          limit = "100",
          resource,
          action,
        } = request.query as {
          limit?: string;
          resource?: string;
          action?: string;
        };

        // Check organization admin access
        const hasAccess = await hasOrganizationAdminAccess(
          organizationId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You do not have permission to view audit logs for this organization",
          });
        }

        let query = db
          .collection("auditLogs")
          .where("organizationId", "==", organizationId);

        if (resource) {
          query = query.where("resource", "==", resource) as any;
        }
        if (action) {
          query = query.where("action", "==", action) as any;
        }

        query = query
          .orderBy("timestamp", "desc")
          .limit(parseInt(limit, 10)) as any;

        const snapshot = await query.get();

        const auditLogs = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { auditLogs };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch audit logs");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch audit logs",
        });
      }
    },
  );

  /**
   * GET /api/v1/audit-logs/resource/:resource/:resourceId
   * Get audit logs for a specific resource
   */
  fastify.get(
    "/resource/:resource/:resourceId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { resource, resourceId } = request.params as {
          resource: string;
          resourceId: string;
        };
        const { limit = "50" } = request.query as { limit?: string };

        // For resource-specific logs, we need to verify the user has access to the resource
        // This varies by resource type. For now, allow authenticated users to query.
        // In production, you should add resource-specific access checks.

        // System admins can access all
        if (user.role !== "system_admin") {
          // For security, only return logs that the user created or is associated with
          // This is a simplified check - in production, implement resource-specific access control
        }

        const snapshot = await db
          .collection("auditLogs")
          .where("resource", "==", resource)
          .where("resourceId", "==", resourceId)
          .orderBy("timestamp", "desc")
          .limit(parseInt(limit, 10))
          .get();

        const auditLogs = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { auditLogs };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch audit logs");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch audit logs",
        });
      }
    },
  );

  /**
   * GET /api/v1/audit-logs/user/:userId
   * Get audit logs for a specific user (admin or self only)
   */
  fastify.get(
    "/user/:userId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { userId } = request.params as { userId: string };
        const { limit = "50" } = request.query as { limit?: string };

        // Users can only view their own logs unless they're system admin
        if (user.role !== "system_admin" && user.uid !== userId) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You can only view your own audit logs",
          });
        }

        const snapshot = await db
          .collection("auditLogs")
          .where("userId", "==", userId)
          .orderBy("timestamp", "desc")
          .limit(parseInt(limit, 10))
          .get();

        const auditLogs = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { auditLogs };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch audit logs");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch audit logs",
        });
      }
    },
  );
}
