import type { FastifyRequest, FastifyReply } from "fastify";
import { auth } from "../utils/firebase.js";
import type {
  AuthenticatedRequest,
  StableContextRequest,
  OrganizationContextRequest,
} from "../types/index.js";
import {
  canAccessStable,
  canManageStable,
  getStableMemberRole,
  hasOrganizationAccess,
  isOrganizationAdmin,
} from "../utils/authorization.js";

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Missing or invalid authorization header",
      });
    }

    const token = authHeader.substring(7);

    let decodedToken: any;

    // Debug logging
    request.log.debug(
      {
        hasEmulatorEnv: !!process.env.FIREBASE_AUTH_EMULATOR_HOST,
        hasFirestoreEmulator: !!process.env.FIRESTORE_EMULATOR_HOST,
        tokenPrefix: token.substring(0, 20),
      },
      "Auth debug",
    );

    // Firebase Emulator: Skip token verification (tokens don't have proper JWT structure)
    // Check for both auth emulator and firestore emulator (they run together)
    if (
      process.env.FIREBASE_AUTH_EMULATOR_HOST ||
      process.env.FIRESTORE_EMULATOR_HOST
    ) {
      // Parse emulator token (it's a base64-encoded JSON)
      try {
        const decoded = JSON.parse(
          Buffer.from(token, "base64").toString("utf8"),
        );
        decodedToken = decoded;
        request.log.debug(
          { uid: decoded.uid || decoded.user_id },
          "Emulator token parsed",
        );
      } catch (parseError) {
        // If parsing fails, try to verify as normal token (checkRevoked=false for emulator)
        try {
          decodedToken = await auth.verifyIdToken(token, false);
        } catch (verifyError) {
          request.log.error(
            { parseError, verifyError },
            "Both parse and verify failed",
          );
          throw verifyError;
        }
      }
    } else {
      // Production: Verify the Firebase ID token
      decodedToken = await auth.verifyIdToken(token);
    }

    // Attach user info to request
    (request as AuthenticatedRequest).user = {
      uid: decodedToken.uid || decodedToken.user_id,
      email: decodedToken.email || "",
      role:
        (decodedToken.role as "user" | "system_admin" | "stable_owner") ||
        "user",
    };
  } catch (error) {
    request.log.error({ error }, "Authentication failed");
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Invalid or expired token",
    });
  }
}

export function requireRole(allowedRoles: string[]) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = (request as AuthenticatedRequest).user;

    if (!user) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(user.role)) {
      return reply.status(403).send({
        error: "Forbidden",
        message: "Insufficient permissions",
      });
    }
  };
}

/**
 * Middleware: Require stable membership (any role)
 * Extracts stableId from params and verifies membership
 */
export function requireStableAccess() {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = (request as AuthenticatedRequest).user;

    if (!user) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    // Support both :id and :stableId param names
    const params = request.params as any;
    const stableId = params.stableId || params.id;

    if (!stableId) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "Stable ID required",
      });
    }

    // System admins bypass membership checks
    if (user.role === "system_admin") {
      (request as StableContextRequest).stableId = stableId;
      (request as StableContextRequest).stableRole = "owner"; // Admin has full access
      return;
    }

    // Check membership
    const hasAccess = await canAccessStable(user.uid, stableId);

    if (!hasAccess) {
      return reply.status(403).send({
        error: "Forbidden",
        message: "You are not a member of this stable",
      });
    }

    // Attach stable context to request
    const role = await getStableMemberRole(user.uid, stableId);

    (request as StableContextRequest).stableId = stableId;
    (request as StableContextRequest).stableRole = role;
  };
}

/**
 * Middleware: Require stable management permissions
 * Must be owner, manager, or system_admin
 */
export function requireStableManagement() {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = (request as AuthenticatedRequest).user;

    if (!user) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    // Extract stableId from params or body
    const { stableId } = request.params as { stableId?: string };
    const bodyStableId = (request.body as any)?.stableId;
    const targetStableId = stableId || bodyStableId;

    if (!targetStableId) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "Stable ID required",
      });
    }

    // System admins bypass checks
    if (user.role === "system_admin") {
      (request as StableContextRequest).stableId = targetStableId;
      (request as StableContextRequest).stableRole = "owner"; // Admin has full access
      return;
    }

    // Check management permission
    const canManage = await canManageStable(user.uid, targetStableId);

    if (!canManage) {
      return reply.status(403).send({
        error: "Forbidden",
        message: "Insufficient permissions to manage this stable",
      });
    }

    // Attach context
    const role = await getStableMemberRole(user.uid, targetStableId);

    (request as StableContextRequest).stableId = targetStableId;
    (request as StableContextRequest).stableRole = role;
  };
}

/**
 * Middleware: Require stable ownership
 * Must be stable owner or system_admin
 * Used for update/delete operations
 */
export function requireStableOwnership() {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = (request as AuthenticatedRequest).user;

    if (!user) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    // Extract stable ID from params (can be 'id' or 'stableId')
    const params = request.params as any;
    const stableId = params.id || params.stableId;

    if (!stableId) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "Stable ID required",
      });
    }

    // System admins bypass checks
    if (user.role === "system_admin") {
      return;
    }

    // Check ownership by fetching the stable document
    const { db } = await import("../utils/firebase.js");
    const stableDoc = await db.collection("stables").doc(stableId).get();

    if (!stableDoc.exists) {
      return reply.status(404).send({
        error: "Not Found",
        message: "Stable not found",
      });
    }

    const stable = stableDoc.data();

    if (stable?.ownerId !== user.uid) {
      return reply.status(403).send({
        error: "Forbidden",
        message: "You do not have permission to modify this stable",
      });
    }
  };
}

// ============================================
// ORGANIZATION ACCESS MIDDLEWARE
// ============================================

/**
 * Middleware: Require organization membership
 * Extracts organizationId from query, params, or body and verifies membership
 *
 * @param idSource - Where to extract the organizationId from: "query" | "params" | "body"
 */
export function requireOrganizationAccess(
  idSource: "query" | "params" | "body" = "query",
) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = (request as AuthenticatedRequest).user;

    if (!user) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    // Extract organizationId based on source
    let organizationId: string | undefined;
    if (idSource === "query") {
      organizationId = (request.query as any)?.organizationId;
    } else if (idSource === "params") {
      organizationId = (request.params as any)?.organizationId;
    } else if (idSource === "body") {
      organizationId = (request.body as any)?.organizationId;
    }

    if (!organizationId) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "Organization ID required",
      });
    }

    // System admins bypass membership checks
    if (user.role === "system_admin") {
      (request as OrganizationContextRequest).organizationId = organizationId;
      (request as OrganizationContextRequest).isOrganizationAdmin = true;
      return;
    }

    // Check organization membership
    const hasAccess = await hasOrganizationAccess(user.uid, organizationId);

    if (!hasAccess) {
      return reply.status(403).send({
        error: "Forbidden",
        message: "You do not have access to this organization",
      });
    }

    // Check if user is admin
    const isAdmin = await isOrganizationAdmin(user.uid, organizationId);

    // Attach organization context to request
    (request as OrganizationContextRequest).organizationId = organizationId;
    (request as OrganizationContextRequest).isOrganizationAdmin = isAdmin;
  };
}

/**
 * Middleware: Require organization admin permissions
 * Must be organization owner, admin role, or system_admin
 *
 * @param idSource - Where to extract the organizationId from: "query" | "params" | "body"
 */
export function requireOrganizationAdmin(
  idSource: "query" | "params" | "body" = "query",
) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = (request as AuthenticatedRequest).user;

    if (!user) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    // Extract organizationId based on source
    let organizationId: string | undefined;
    if (idSource === "query") {
      organizationId = (request.query as any)?.organizationId;
    } else if (idSource === "params") {
      organizationId = (request.params as any)?.organizationId;
    } else if (idSource === "body") {
      organizationId = (request.body as any)?.organizationId;
    }

    if (!organizationId) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "Organization ID required",
      });
    }

    // System admins bypass checks
    if (user.role === "system_admin") {
      (request as OrganizationContextRequest).organizationId = organizationId;
      (request as OrganizationContextRequest).isOrganizationAdmin = true;
      return;
    }

    // Check admin permission
    const isAdmin = await isOrganizationAdmin(user.uid, organizationId);

    if (!isAdmin) {
      return reply.status(403).send({
        error: "Forbidden",
        message: "Organization admin permissions required",
      });
    }

    // Attach organization context to request
    (request as OrganizationContextRequest).organizationId = organizationId;
    (request as OrganizationContextRequest).isOrganizationAdmin = true;
  };
}
