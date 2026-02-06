/**
 * Organization-level permission hook (V2 permission system).
 *
 * Fetches the current user's resolved permissions from the backend
 * and provides a simple `hasPermission(action)` check.
 */

import { useMemo } from "react";
import { useApiQuery } from "./useApiQuery";
import { apiClient } from "@/lib/apiClient";
import type { PermissionAction } from "@equiduty/shared";
import type { OrganizationRole } from "@equiduty/shared";

interface OrgPermissionsResponse {
  permissions: Record<PermissionAction, boolean>;
  roles: OrganizationRole[];
  isOrgOwner: boolean;
  isSystemAdmin: boolean;
}

interface UseOrgPermissionsReturn {
  /** Check if the current user has a specific permission */
  hasPermission: (action: PermissionAction) => boolean;
  /** All resolved permissions for the current user */
  permissions: Record<string, boolean>;
  /** The user's organization roles */
  roles: OrganizationRole[];
  /** Whether the user is the organization owner */
  isOrgOwner: boolean;
  /** Whether the user is a system admin */
  isSystemAdmin: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
}

/**
 * Hook to check organization-level permissions for the current user.
 *
 * Uses the `GET /permissions/my` endpoint which resolves the user's
 * permissions based on their roles and the organization's permission matrix.
 *
 * @example
 * ```tsx
 * const { hasPermission, isLoading } = useOrgPermissions(orgId);
 *
 * if (isLoading) return <Spinner />;
 *
 * if (hasPermission('manage_schedules')) {
 *   // Show schedule management UI
 * }
 * ```
 */
export function useOrgPermissions(
  organizationId: string | null | undefined,
): UseOrgPermissionsReturn {
  const { data, isLoading, error } = useApiQuery<OrgPermissionsResponse>(
    ["org-permissions", organizationId],
    () =>
      apiClient.get<OrgPermissionsResponse>(
        `/organizations/${organizationId}/permissions/my`,
      ),
    {
      enabled: !!organizationId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  );

  const hasPermission = useMemo(() => {
    if (!data) return (_action: PermissionAction) => false;
    return (action: PermissionAction) => data.permissions[action] === true;
  }, [data]);

  return {
    hasPermission,
    permissions: data?.permissions ?? {},
    roles: data?.roles ?? [],
    isOrgOwner: data?.isOrgOwner ?? false,
    isSystemAdmin: data?.isSystemAdmin ?? false,
    isLoading,
    error: error ?? null,
  };
}
