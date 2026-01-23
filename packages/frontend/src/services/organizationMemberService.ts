import { apiClient } from "@/lib/apiClient";
import type {
  OrganizationMember,
  InviteOrganizationMemberData,
  OrganizationRole,
} from "../../../shared/src/types/organization";
import { removeUndefined } from "@/utils/firestoreHelpers";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate member document ID from userId and organizationId
 * @param userId - User ID
 * @param organizationId - Organization ID
 * @returns Member document ID in format {userId}_{organizationId}
 */
function generateMemberId(userId: string, organizationId: string): string {
  return `${userId}_${organizationId}`;
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Invite a member to an organization
 * Calls backend API which handles both existing and non-existing users
 * @param organizationId - Organization ID
 * @param inviterId - ID of user sending the invite (not used, kept for compatibility)
 * @param memberData - Member invitation data
 * @returns Promise with the API response (type: 'existing_user' | 'new_user')
 */
export async function inviteOrganizationMember(
  organizationId: string,
  inviterId: string,
  memberData: InviteOrganizationMemberData,
): Promise<any> {
  return await apiClient.post(
    `/organizations/${organizationId}/members`,
    removeUndefined({
      email: memberData.email,
      firstName: memberData.firstName,
      lastName: memberData.lastName,
      phoneNumber: memberData.phoneNumber,
      // Contact type fields
      contactType: memberData.contactType || "Personal",
      businessName: memberData.businessName,
      address: memberData.address,
      // Role assignment
      roles: memberData.roles,
      primaryRole: memberData.primaryRole,
      showInPlanning: memberData.showInPlanning ?? true,
      stableAccess: memberData.stableAccess || "all",
      assignedStableIds: memberData.assignedStableIds || [],
    }),
  );
}

/**
 * Get a single organization member
 * @param userId - User ID
 * @param organizationId - Organization ID
 * @returns Promise with member data or null if not found
 */
export async function getOrganizationMember(
  userId: string,
  organizationId: string,
): Promise<OrganizationMember | null> {
  try {
    return await apiClient.get<OrganizationMember & { id: string }>(
      `/organizations/${organizationId}/members/${userId}`,
    );
  } catch (error) {
    return null;
  }
}

/**
 * Get all members of an organization
 * @param organizationId - Organization ID
 * @returns Promise with array of organization members
 */
export async function getOrganizationMembers(
  organizationId: string,
): Promise<OrganizationMember[]> {
  const response = await apiClient.get<{ members: OrganizationMember[] }>(
    `/organizations/${organizationId}/members`,
  );

  return response.members;
}

/**
 * Get all active members of an organization
 * Uses server-side filtering for better performance and security
 * @param organizationId - Organization ID
 * @returns Promise with array of active organization members
 */
export async function getActiveOrganizationMembers(
  organizationId: string,
): Promise<OrganizationMember[]> {
  const response = await apiClient.get<{ members: OrganizationMember[] }>(
    `/organizations/${organizationId}/members`,
    { status: "active" },
  );

  return response.members;
}

/**
 * Update organization member roles and settings
 * @param userId - User ID
 * @param organizationId - Organization ID
 * @param updates - Partial member data to update
 * @returns Promise that resolves when update is complete
 */
export async function updateOrganizationMember(
  userId: string,
  organizationId: string,
  updates: Partial<
    Omit<
      OrganizationMember,
      "id" | "userId" | "organizationId" | "joinedAt" | "invitedBy"
    >
  >,
): Promise<void> {
  await apiClient.patch(
    `/organizations/${organizationId}/members/${userId}`,
    removeUndefined(updates),
  );
}

/**
 * Update member roles
 * @param userId - User ID
 * @param organizationId - Organization ID
 * @param roles - Array of roles to assign
 * @param primaryRole - Primary role
 * @param currentUserId - User making the change (for audit logging)
 * @returns Promise that resolves when update is complete
 */
export async function updateMemberRoles(
  userId: string,
  organizationId: string,
  roles: OrganizationRole[],
  primaryRole: OrganizationRole,
  currentUserId?: string,
): Promise<void> {
  await apiClient.patch(`/organizations/${organizationId}/members/${userId}`, {
    roles,
    primaryRole,
  });

  // Note: Audit logging is handled by the backend
}

/**
 * Update member status (pending, active, inactive)
 * @param userId - User ID
 * @param organizationId - Organization ID
 * @param status - New status
 * @returns Promise that resolves when update is complete
 */
export async function updateMemberStatus(
  userId: string,
  organizationId: string,
  status: "active" | "inactive" | "pending",
): Promise<void> {
  await apiClient.patch(
    `/organizations/${organizationId}/members/${userId}/status`,
    { status },
  );
}

/**
 * Remove a member from an organization
 * @param userId - User ID
 * @param organizationId - Organization ID
 * @returns Promise that resolves when delete is complete
 */
export async function removeOrganizationMember(
  userId: string,
  organizationId: string,
): Promise<void> {
  await apiClient.delete(`/organizations/${organizationId}/members/${userId}`);
}

/**
 * Get all organizations where user is a member
 * @param userId - User ID
 * @returns Promise with array of organization IDs
 */
export async function getUserOrganizationIds(
  userId: string,
): Promise<string[]> {
  const response = await apiClient.get<{ organizationIds: string[] }>(
    `/organizations/users/${userId}/organizations`,
  );

  return response.organizationIds;
}
