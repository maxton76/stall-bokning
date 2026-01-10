import { useMemo } from "react";
import type {
  StableAction,
  HorseAction,
  StableMemberRole,
} from "../types/roles";
import { STABLE_PERMISSIONS, HORSE_PERMISSIONS } from "../types/roles";

interface UsePermissionsOptions {
  role?: StableMemberRole | null;
  isOwner?: boolean;
}

/**
 * Hook to check permissions for stable and horse operations
 * Returns functions to check if a user has permission for specific actions
 */
export function usePermissions({ role, isOwner }: UsePermissionsOptions) {
  const effectiveRole = useMemo<"owner" | "manager" | "member" | null>(() => {
    if (isOwner) return "owner";
    if (role === "manager") return "manager";
    if (role === "member") return "member";
    return null;
  }, [role, isOwner]);

  const hasStablePermission = useMemo(
    () =>
      (action: StableAction): boolean => {
        if (!effectiveRole) return false;
        return STABLE_PERMISSIONS[action]?.[effectiveRole] ?? false;
      },
    [effectiveRole],
  );

  const hasHorsePermission = useMemo(
    () =>
      (action: HorseAction): boolean => {
        if (!effectiveRole) return false;
        return HORSE_PERMISSIONS[action]?.[effectiveRole] ?? false;
      },
    [effectiveRole],
  );

  return {
    hasStablePermission,
    hasHorsePermission,
    role: effectiveRole,
  };
}
