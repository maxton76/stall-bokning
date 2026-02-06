/**
 * Permission Matrix API Routes
 *
 * CRUD endpoints for managing organization-level permission matrices.
 *
 * GET  /api/v1/organizations/:organizationId/permissions     → effective matrix
 * PUT  /api/v1/organizations/:organizationId/permissions     → update matrix (requires advancedPermissions module)
 * POST /api/v1/organizations/:organizationId/permissions/reset → reset to defaults
 * GET  /api/v1/organizations/:organizationId/permissions/my   → current user's resolved permissions
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db } from "../utils/firebase.js";
import {
  authenticate,
  requirePermission,
  requireOrganizationAccess,
} from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { isModuleEnabled } from "../middleware/checkModuleAccess.js";
import {
  getEffectiveMatrix,
  checkPermissions,
  getUserOrgRoles,
  invalidatePermissionCache,
} from "../utils/permissionEngine.js";
import {
  PERMISSION_ACTIONS,
  PROTECTED_PERMISSIONS,
  DEFAULT_PERMISSION_MATRIX,
  ALL_PERMISSION_ACTIONS,
  type PermissionMatrix,
  type OrganizationRole,
} from "@equiduty/shared";
import { FieldValue } from "firebase-admin/firestore";

export default async function permissionRoutes(fastify: FastifyInstance) {
  const prefix = "/api/v1/organizations/:organizationId/permissions";

  // ============================================
  // GET /permissions - Get effective matrix
  // ============================================
  fastify.get(
    prefix,
    {
      preHandler: [
        authenticate,
        requirePermission("manage_org_settings", "params"),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { organizationId } = request.params as { organizationId: string };

      try {
        const matrix = await getEffectiveMatrix(organizationId);
        const orgDoc = await db
          .collection("organizations")
          .doc(organizationId)
          .get();
        const hasCustomMatrix = !!orgDoc.data()?.permissionMatrix;

        return reply.send({
          matrix,
          isCustom: hasCustomMatrix,
          actions: PERMISSION_ACTIONS,
          protectedPermissions: PROTECTED_PERMISSIONS,
        });
      } catch (error) {
        request.log.error(
          { error, organizationId },
          "Failed to get permission matrix",
        );
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to retrieve permission matrix",
        });
      }
    },
  );

  // ============================================
  // PUT /permissions - Update matrix
  // ============================================
  fastify.put(
    prefix,
    {
      preHandler: [
        authenticate,
        requirePermission("manage_org_settings", "params"),
      ],
      schema: {
        body: {
          type: "object" as const,
          required: ["matrix"],
          properties: {
            matrix: { type: "object" as const },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { organizationId } = request.params as { organizationId: string };
      const { matrix } = request.body as { matrix: PermissionMatrix };

      try {
        // Check advancedPermissions module
        const hasModule = await isModuleEnabled(
          organizationId,
          "advancedPermissions",
        );
        if (!hasModule) {
          return reply.status(403).send({
            error: "Module not available",
            message:
              'The "advancedPermissions" feature is not included in your subscription. Please upgrade to customize permissions.',
            moduleKey: "advancedPermissions",
          });
        }

        // Validate and sanitize the matrix structure
        const result = validateAndSanitizeMatrix(matrix);
        if ("error" in result) {
          return reply.status(400).send({
            error: "Bad Request",
            message: result.error,
          });
        }

        const sanitizedMatrix = result.sanitized;

        // Save sanitized matrix to Firestore
        await db.collection("organizations").doc(organizationId).update({
          permissionMatrix: sanitizedMatrix,
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Invalidate cache
        invalidatePermissionCache(organizationId);

        return reply.send({
          success: true,
          matrix: sanitizedMatrix,
        });
      } catch (error) {
        request.log.error(
          { error, organizationId },
          "Failed to update permission matrix",
        );
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update permission matrix",
        });
      }
    },
  );

  // ============================================
  // POST /permissions/reset - Reset to defaults
  // ============================================
  fastify.post(
    `${prefix}/reset`,
    {
      preHandler: [
        authenticate,
        requirePermission("manage_org_settings", "params"),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { organizationId } = request.params as { organizationId: string };

      try {
        // Remove the stored matrix, reverting to defaults
        await db.collection("organizations").doc(organizationId).update({
          permissionMatrix: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Invalidate cache
        invalidatePermissionCache(organizationId);

        return reply.send({
          success: true,
          matrix: DEFAULT_PERMISSION_MATRIX,
        });
      } catch (error) {
        request.log.error(
          { error, organizationId },
          "Failed to reset permission matrix",
        );
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to reset permission matrix",
        });
      }
    },
  );

  // ============================================
  // GET /permissions/my - Current user's resolved permissions
  // ============================================
  fastify.get(
    `${prefix}/my`,
    {
      preHandler: [authenticate, requireOrganizationAccess("params")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as AuthenticatedRequest).user!;
      const { organizationId } = request.params as { organizationId: string };

      try {
        const allActions = PERMISSION_ACTIONS.map((a) => a.action);
        const permissions = await checkPermissions(
          user.uid,
          organizationId,
          allActions,
          { systemRole: user.role },
        );

        const userInfo = await getUserOrgRoles(user.uid, organizationId);

        return reply.send({
          permissions,
          roles: userInfo?.roles ?? [],
          isOrgOwner: userInfo?.isOrgOwner ?? false,
          isSystemAdmin: user.role === "system_admin",
        });
      } catch (error) {
        request.log.error(
          { error, organizationId },
          "Failed to get user permissions",
        );
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to retrieve user permissions",
        });
      }
    },
  );
}

// ============================================
// VALIDATION HELPERS
// ============================================

/** Valid organization roles for matrix sanitization. */
const VALID_ROLES: ReadonlySet<string> = new Set<OrganizationRole>([
  "administrator",
  "schedule_planner",
  "groom",
  "trainer",
  "training_admin",
  "horse_owner",
  "rider",
  "customer",
  "veterinarian",
  "farrier",
  "dentist",
  "saddle_maker",
  "inseminator",
  "support_contact",
]);

/**
 * Sanitize and validate a permission matrix before saving.
 * Strips unknown action keys and unknown role keys within each action.
 * Returns { error } if invalid, or { sanitized } with the cleaned matrix.
 */
function validateAndSanitizeMatrix(
  matrix: PermissionMatrix,
): { error: string } | { sanitized: PermissionMatrix } {
  if (!matrix || typeof matrix !== "object") {
    return { error: "Matrix must be an object" };
  }

  // Check all required actions are present
  for (const action of ALL_PERMISSION_ACTIONS) {
    if (!(action in matrix)) {
      return { error: `Missing permission action: ${action}` };
    }
    if (typeof matrix[action] !== "object" || matrix[action] === null) {
      return { error: `Invalid value for action: ${action}` };
    }
  }

  // Build sanitized matrix: only keep known actions with known role keys
  const sanitized = {} as PermissionMatrix;
  for (const action of ALL_PERMISSION_ACTIONS) {
    const rolePerms = matrix[action];
    const cleanEntry: Partial<Record<OrganizationRole, boolean>> = {};
    for (const [role, value] of Object.entries(rolePerms)) {
      if (VALID_ROLES.has(role) && value === true) {
        cleanEntry[role as OrganizationRole] = true;
      }
    }
    sanitized[action] = cleanEntry;
  }

  // Check protected permissions: administrator must keep these
  for (const protectedAction of PROTECTED_PERMISSIONS) {
    const actionPerms = sanitized[protectedAction];
    if (!actionPerms || actionPerms.administrator !== true) {
      return {
        error: `Cannot remove "${protectedAction}" from the administrator role (lockout prevention)`,
      };
    }
  }

  // Validate that at least one role has manage_org_settings
  const orgSettingsPerms = sanitized.manage_org_settings;
  const hasAnyOrgSettings = Object.values(orgSettingsPerms).some(
    (v) => v === true,
  );
  if (!hasAnyOrgSettings) {
    return {
      error: "At least one role must have manage_org_settings permission",
    };
  }

  return { sanitized };
}
