import type { FastifyRequest, FastifyReply } from "fastify";
import { auth } from "../utils/firebase.js";
import type {
  AuthenticatedRequest,
  StableContextRequest,
  OrganizationContextRequest,
} from "../types/index.js";

// Re-export types for use in routes
export type {
  AuthenticatedRequest,
  StableContextRequest,
  OrganizationContextRequest,
};
import type { PermissionAction } from "@equiduty/shared";
import {
  getStableMemberRole,
  hasOrganizationAccess,
  isOrganizationAdmin,
} from "../utils/authorization.js";
import {
  hasPermission as engineHasPermission,
  hasStablePermission as engineHasStablePermission,
  getUserOrgRoles,
} from "../utils/permissionEngine.js";

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
    if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
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
      displayName:
        decodedToken.name ||
        decodedToken.display_name ||
        decodedToken.email ||
        "Unknown user",
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
 * Middleware: Require organization membership (any role)
 * Alias for requireOrganizationAccess for naming consistency
 */
export const requireOrganizationMember = requireOrganizationAccess;

// ============================================
// PERMISSION SYSTEM MIDDLEWARE
// ============================================

/**
 * Middleware: Require an organization-level permission.
 *
 * Extracts organizationId from the specified source and checks
 * against the permission engine.
 *
 * @param action - The PermissionAction to require
 * @param idSource - Where to extract organizationId from (default: "params")
 */
export function requirePermission(
  action: PermissionAction,
  idSource: "query" | "params" | "body" = "params",
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
      const params = request.params as any;
      organizationId = params?.organizationId || params?.orgId;
    } else if (idSource === "body") {
      organizationId = (request.body as any)?.organizationId;
    }

    if (!organizationId) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "Organization ID required",
      });
    }

    const allowed = await engineHasPermission(
      user.uid,
      organizationId,
      action,
      { systemRole: user.role },
    );

    if (!allowed) {
      return reply.status(403).send({
        error: "Forbidden",
        message: `Missing permission: ${action}`,
      });
    }

    // Attach organization context (reuse cached data from engineHasPermission call above)
    (request as OrganizationContextRequest).organizationId = organizationId;
    const userInfo = await getUserOrgRoles(user.uid, organizationId);
    (request as OrganizationContextRequest).isOrganizationAdmin =
      user.role === "system_admin" || (userInfo?.isOrgOwner ?? false);
  };
}

/**
 * Middleware: Require a permission with stable context.
 *
 * Resolves stableId from params, finds the parent organizationId,
 * checks the permission, and also verifies stable-level access.
 *
 * @param action - The PermissionAction to require
 */
export function requireStablePermission(action: PermissionAction) {
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

    const params = request.params as any;
    const stableId = params?.stableId || params?.id;

    if (!stableId) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "Stable ID required",
      });
    }

    const allowed = await engineHasStablePermission(
      user.uid,
      stableId,
      action,
      { systemRole: user.role },
    );

    if (!allowed) {
      return reply.status(403).send({
        error: "Forbidden",
        message: `Missing permission: ${action}`,
      });
    }

    // Attach stable context
    (request as StableContextRequest).stableId = stableId;
    // For backward compatibility, derive a legacy role
    if (user.role === "system_admin") {
      (request as StableContextRequest).stableRole = "owner";
    } else {
      const role = await getStableMemberRole(user.uid, stableId);
      (request as StableContextRequest).stableRole = role;
    }
  };
}
