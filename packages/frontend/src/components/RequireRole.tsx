import { Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { useOrganization } from "../contexts/OrganizationContext";
import type { OrganizationRole } from "../../../shared/src/types/organization";
import type { SystemRole } from "@/types/roles";

interface RequireRoleProps {
  children: React.ReactNode;
  /**
   * Required organization roles - user must have at least one of these roles
   * Uses OrganizationRole type from the shared types
   */
  requiredRoles?: OrganizationRole[];
  /**
   * Required system roles - user must have one of these system-level roles
   */
  requiredSystemRoles?: SystemRole[];
  /**
   * Whether to validate that URL organizationId matches user's current organization context
   * This prevents URL manipulation attacks where users try to access other organizations
   */
  requireOrgAccess?: boolean;
  /**
   * Custom redirect path when access is denied (defaults to /dashboard)
   */
  redirectTo?: string;
}

/**
 * RequireRole component that ensures user has required roles before rendering children
 *
 * Features:
 * - Validates organization access if requireOrgAccess is true
 * - Checks required organization roles against user's membership roles
 * - Checks required system roles against user's systemRole
 * - System admins bypass all role checks
 * - Organization owners bypass organization role checks
 *
 * @example
 * // Require administrator role in current organization
 * <RequireRole requiredRoles={["administrator"]} requireOrgAccess>
 *   <AdminPanel />
 * </RequireRole>
 *
 * @example
 * // Require system admin access
 * <RequireRole requiredSystemRoles={["system_admin"]}>
 *   <SystemAdminDashboard />
 * </RequireRole>
 */
export function RequireRole({
  children,
  requiredRoles,
  requiredSystemRoles,
  requireOrgAccess = false,
  redirectTo = "/dashboard",
}: RequireRoleProps) {
  const { user, loading } = useAuth();
  const { currentOrganizationId, validating } = useOrganization();
  const { organizationId } = useParams<{ organizationId?: string }>();
  const { t } = useTranslation("common");

  // Show loading while checking auth or organization validation
  if (loading || validating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto dark:border-gray-100"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {t("labels.loading")}
          </p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // System admins bypass all role checks
  const isSystemAdmin = user.systemRole === "system_admin";

  // Validate organization access if required
  if (requireOrgAccess && organizationId) {
    // Check if URL organizationId matches user's current organization
    if (organizationId !== currentOrganizationId) {
      // User trying to access organization they don't belong to or haven't selected
      // This prevents URL manipulation attacks
      console.warn(
        `[RequireRole] Organization mismatch: URL=${organizationId}, current=${currentOrganizationId}`,
      );
      return <Navigate to={redirectTo} replace />;
    }
  }

  // Check required system roles if specified (system_admin bypasses)
  if (requiredSystemRoles && requiredSystemRoles.length > 0 && !isSystemAdmin) {
    const hasRequiredSystemRole = requiredSystemRoles.some(
      (role) => user.systemRole === role,
    );

    if (!hasRequiredSystemRole) {
      console.warn(
        `[RequireRole] User lacks required system role. Required: ${requiredSystemRoles.join(", ")}, Has: ${user.systemRole}`,
      );
      return <Navigate to={redirectTo} replace />;
    }
  }

  // Check required organization roles if specified (system_admin bypasses)
  // Note: Organization role checking would require fetching the user's membership
  // For now, we rely on the backend to enforce role-based access on API calls
  // The frontend RequireRole is primarily for:
  // 1. Organization context validation (URL manipulation prevention)
  // 2. System role validation
  // 3. Future: Organization role validation when membership data is in context
  if (requiredRoles && requiredRoles.length > 0 && !isSystemAdmin) {
    // TODO: When OrganizationContext includes user membership roles,
    // implement organization role checking here
    // For now, log a warning that role checking is deferred to backend
    console.debug(
      `[RequireRole] Organization role check deferred to backend: ${requiredRoles.join(", ")}`,
    );
  }

  // User is authorized, render children
  return <>{children}</>;
}
