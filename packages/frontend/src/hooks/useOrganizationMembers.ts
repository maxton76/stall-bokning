import { useMemo } from "react";
import { useApiQuery } from "@/hooks/useApiQuery";
import {
  getOrganizationMembers,
  getActiveOrganizationMembers,
} from "@/services/organizationMemberService";
import type { OrganizationMember } from "@equiduty/shared";
import {
  getDuplicateNames,
  formatMemberDisplayName,
} from "@/utils/memberDisplayName";

/**
 * Helper function to check if a member has access to a specific stable
 * StableAccessLevel is "all" or "specific"
 */
function hasStableAccess(
  member: OrganizationMember,
  stableId: string,
): boolean {
  if (member.stableAccess === "all") return true;
  // stableAccess === "specific" - check assigned stables
  return member.assignedStableIds?.includes(stableId) ?? false;
}

/**
 * Hook to fetch all members of an organization
 * Includes automatic fallback to ensure owner is always present
 * @param organizationId - Organization ID
 * @returns Query result with organization members
 */
export function useOrganizationMembers(organizationId: string | null) {
  const query = useApiQuery<OrganizationMember[]>(
    ["organizationMembers", organizationId],
    () => getOrganizationMembers(organizationId!),
    { enabled: !!organizationId },
  );

  // Note: The backend should already include the owner in the members list.
  // If debugging shows the owner is missing, check the organizationMembers
  // collection in Firestore to ensure the owner's member record exists.
  // Expected member record pattern: {userId}_{organizationId}

  return query;
}

/**
 * Hook to fetch only active members of an organization
 * @param organizationId - Organization ID
 * @returns Query result with active organization members
 */
export function useActiveOrganizationMembers(organizationId: string | null) {
  return useApiQuery<OrganizationMember[]>(
    ["organizationMembers", organizationId, "active"],
    () => getActiveOrganizationMembers(organizationId!),
    { enabled: !!organizationId },
  );
}

/**
 * Hook to fetch members that should appear in planning/scheduling views
 * Filters to active members with showInPlanning=true
 * @param organizationId - Organization ID
 * @returns Query result with planning-visible members
 */
export function usePlanningMembers(organizationId: string | null) {
  const { data: members, ...rest } =
    useActiveOrganizationMembers(organizationId);

  const planningMembers = useMemo(
    () => members?.filter((member) => member.showInPlanning !== false) ?? [],
    [members],
  );

  return {
    ...rest,
    data: planningMembers,
  };
}

/**
 * Hook to fetch members that have access to a specific stable and appear in planning
 * Combines stable access filtering with planning visibility
 * @param organizationId - Organization ID
 * @param stableId - Stable ID to filter by (or "all" to skip stable filtering)
 * @returns Query result with filtered members
 */
export function useStablePlanningMembers(
  organizationId: string | null,
  stableId: string | null,
) {
  const { data: members, ...rest } =
    useActiveOrganizationMembers(organizationId);

  const stableMembers = useMemo(() => {
    if (!members) return [];

    return members.filter((member) => {
      // Must be visible in planning
      if (member.showInPlanning === false) return false;

      // If "all" stables selected or no stableId, include all planning-visible members
      if (!stableId || stableId === "all") return true;

      // Check stable access
      return hasStableAccess(member, stableId);
    });
  }, [members, stableId]);

  return {
    ...rest,
    data: stableMembers,
  };
}

/**
 * Transform organization members to the format expected by ActivityFormDialog
 * Maps to { id, name, roles } structure
 */
export function formatMembersForSelection(
  members: OrganizationMember[],
): Array<{ id: string; name: string; email: string; roles: string[] }> {
  const dupes = getDuplicateNames(members);
  return members
    .map((member) => ({
      id: member.userId,
      name: formatMemberDisplayName(member, dupes),
      email: member.userEmail,
      roles: member.roles || [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "sv"));
}
