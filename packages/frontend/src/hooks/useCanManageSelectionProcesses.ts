import { useAuth } from "@/contexts/AuthContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { getOrganizationMember } from "@/services/organizationMemberService";

/**
 * Check if current user can manage selection processes for a stable
 *
 * Permission requirements:
 * - Stable owner (ownerId matches user)
 * - Organization administrator role
 * - Organization schedule_planner role (with access to specific stable)
 *
 * @param stableOwnerId - The ownerId of the stable
 * @param organizationId - The organization ID
 * @returns Object with canManage boolean and isLoading state
 */
export function useCanManageSelectionProcesses(
  stableOwnerId: string | undefined,
  organizationId: string | undefined,
): { canManage: boolean; isLoading: boolean } {
  const { user } = useAuth();

  // Check if user is stable owner (synchronous check)
  const isOwner = !!user?.uid && user.uid === stableOwnerId;

  // Fetch organization membership to check roles
  // Skip API call if user is already the owner
  const { data: orgMember, isLoading } = useApiQuery(
    ["canManageSelectionProcesses", user?.uid, organizationId],
    async () => {
      if (!user?.uid || !organizationId) return null;
      return getOrganizationMember(user.uid, organizationId);
    },
    { enabled: !!user?.uid && !!organizationId && !isOwner },
  );

  // Determine if user can manage
  // - Owner always can
  // - Administrator can
  // - schedule_planner can (stable access already enforced by backend)
  const canManage =
    isOwner ||
    orgMember?.roles?.includes("administrator") ||
    orgMember?.roles?.includes("schedule_planner") ||
    false;

  return {
    canManage,
    isLoading: !isOwner && isLoading, // Skip loading if already owner
  };
}
