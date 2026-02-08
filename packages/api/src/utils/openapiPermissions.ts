/**
 * OpenAPI Permission Metadata Helpers
 *
 * Standardizes permission documentation across all API endpoints.
 * Provides reusable permission patterns for consistent OpenAPI annotations.
 */

import type { PermissionAction } from "@equiduty/shared";

/**
 * Permission metadata structure for OpenAPI x-permissions extension
 */
export interface PermissionMetadata {
  /** Whether JWT authentication is required */
  authenticated: boolean;
  /** Required system-level roles (system_admin, stable_owner, stable_user) */
  systemRole?: string[] | null;
  /** Required organization-level permission action */
  organizationPermission?: PermissionAction | null;
  /** Required stable-level permission action */
  stablePermission?: PermissionAction | null;
  /** Additional authorization context or special cases */
  notes?: string;
}

/**
 * Creates OpenAPI x-permissions extension object
 */
export function createPermissionMetadata(metadata: PermissionMetadata): {
  "x-permissions": PermissionMetadata;
} {
  return {
    "x-permissions": {
      authenticated: metadata.authenticated,
      systemRole: metadata.systemRole ?? null,
      organizationPermission: metadata.organizationPermission ?? null,
      stablePermission: metadata.stablePermission ?? null,
      notes: metadata.notes,
    },
  };
}

/**
 * Predefined common permission patterns
 */
export const PERMISSIONS = {
  /**
   * Public endpoint - no authentication required
   */
  PUBLIC: createPermissionMetadata({ authenticated: false }),

  /**
   * Authenticated users only - no specific role/permission required
   */
  AUTHENTICATED: createPermissionMetadata({ authenticated: true }),

  /**
   * System administrators only
   */
  SYSTEM_ADMIN: createPermissionMetadata({
    authenticated: true,
    systemRole: ["system_admin"],
  }),

  /**
   * Organization member (any role)
   * @param notes Optional additional context
   */
  ORG_MEMBER: (notes?: string) =>
    createPermissionMetadata({
      authenticated: true,
      notes: notes ?? "Requires active organization membership",
    }),

  /**
   * Requires specific organization permission
   * @param action Permission action required
   * @param notes Optional additional context
   */
  ORG_PERMISSION: (action: PermissionAction, notes?: string) =>
    createPermissionMetadata({
      authenticated: true,
      organizationPermission: action,
      notes,
    }),

  /**
   * Requires specific stable permission
   * @param action Permission action required
   * @param notes Optional additional context
   */
  STABLE_PERMISSION: (action: PermissionAction, notes?: string) =>
    createPermissionMetadata({
      authenticated: true,
      stablePermission: action,
      notes,
    }),

  /**
   * Requires EITHER organization OR stable permission
   * @param orgAction Organization permission action
   * @param stableAction Stable permission action
   * @param notes Optional additional context
   */
  ORG_OR_STABLE_PERMISSION: (
    orgAction: PermissionAction,
    stableAction: PermissionAction,
    notes?: string,
  ) =>
    createPermissionMetadata({
      authenticated: true,
      organizationPermission: orgAction,
      stablePermission: stableAction,
      notes:
        notes ??
        `Requires either organization permission '${orgAction}' OR stable permission '${stableAction}'`,
    }),

  /**
   * Resource owner only (e.g., horse owner, schedule creator)
   * @param resourceType Type of resource
   * @param notes Optional additional context
   */
  RESOURCE_OWNER: (resourceType: string, notes?: string) =>
    createPermissionMetadata({
      authenticated: true,
      notes: notes ?? `Only the ${resourceType} owner can perform this action`,
    }),
};

/**
 * Usage Examples:
 *
 * Simple authenticated endpoint:
 * schema: {
 *   ...PERMISSIONS.AUTHENTICATED,
 *   description: 'Get user profile',
 * }
 *
 * Organization permission:
 * schema: {
 *   ...PERMISSIONS.ORG_PERMISSION('manage_horses', 'Horse owners get full access'),
 *   description: 'Update horse details',
 * }
 *
 * Stable permission:
 * schema: {
 *   ...PERMISSIONS.STABLE_PERMISSION('manage_schedules'),
 *   description: 'Create new shift',
 * }
 *
 * Resource owner:
 * schema: {
 *   ...PERMISSIONS.RESOURCE_OWNER('horse', 'Or organization admin with manage_horses permission'),
 *   description: 'Delete horse',
 * }
 */
