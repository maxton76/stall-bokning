import * as organizationRepository from "../repositories/organizationRepository.js";
import * as memberRepository from "../repositories/memberRepository.js";
import type { OrganizationRole } from "@stall-bokning/shared/types/organization";

/**
 * Organization Service
 *
 * Business logic layer for organization operations.
 * Eliminates Pattern 4: Stats update duplication (2+ occurrences)
 */

/**
 * Update organization statistics
 * Consolidates stats update logic from multiple locations
 *
 * @param organizationId - Organization ID
 */
export async function updateOrganizationStats(
  organizationId: string,
): Promise<void> {
  // Count active members
  const memberCount = await memberRepository.countActiveMembers(organizationId);

  // Update organization stats
  await organizationRepository.updateStats(organizationId, {
    totalMemberCount: memberCount,
  });
}

/**
 * Recalculate all organization statistics
 *
 * @param organizationId - Organization ID
 * @returns Updated statistics
 */
export async function recalculateAllStats(organizationId: string): Promise<{
  stableCount: number;
  totalMemberCount: number;
}> {
  const memberCount = await memberRepository.countActiveMembers(organizationId);

  // TODO: Add stable count when stable repository is created
  const stableCount = 0;

  await organizationRepository.updateStats(organizationId, {
    stableCount,
    totalMemberCount: memberCount,
  });

  return {
    stableCount,
    totalMemberCount: memberCount,
  };
}

/**
 * Check if user can access organization
 * User can access if they are:
 * - The owner
 * - An active member
 * - A system admin
 *
 * @param userId - User ID
 * @param organizationId - Organization ID
 * @param userRole - User's system role
 * @returns true if user can access
 */
export async function canUserAccess(
  userId: string,
  organizationId: string,
  userRole: string,
): Promise<boolean> {
  // System admins can access everything
  if (userRole === "system_admin") {
    return true;
  }

  // Check if user is owner
  const organization = await organizationRepository.findById(organizationId);
  if (organization?.ownerId === userId) {
    return true;
  }

  // Check if user is an active member
  return await memberRepository.isActiveMember(userId, organizationId);
}

/**
 * Check if user can manage organization
 * User can manage if they are:
 * - The owner
 * - An active administrator
 * - A system admin
 *
 * @param userId - User ID
 * @param organizationId - Organization ID
 * @param userRole - User's system role
 * @returns true if user can manage
 */
export async function canUserManage(
  userId: string,
  organizationId: string,
  userRole: string,
): Promise<boolean> {
  // System admins can manage everything
  if (userRole === "system_admin") {
    return true;
  }

  // Check if user is owner
  const organization = await organizationRepository.findById(organizationId);
  if (organization?.ownerId === userId) {
    return true;
  }

  // Check if user is an administrator
  return await memberRepository.isAdministrator(userId, organizationId);
}

/**
 * Get user's role in organization
 *
 * @param userId - User ID
 * @param organizationId - Organization ID
 * @returns Organization role or null if not a member
 */
export async function getUserRole(
  userId: string,
  organizationId: string,
): Promise<OrganizationRole | null> {
  const member = await memberRepository.getActiveMember(userId, organizationId);

  if (!member) {
    return null;
  }

  return member.primaryRole;
}

/**
 * Delete organization and all related data (cascade)
 * WARNING: This is a destructive operation
 *
 * @param organizationId - Organization ID
 */
export async function deleteOrganizationCascade(
  organizationId: string,
): Promise<void> {
  // Delete all members
  const members = await memberRepository.findByOrganization(organizationId);
  await Promise.all(
    members.map((member) => memberRepository.deleteMember(member.id)),
  );

  // Delete all invites (TODO: implement when inviteRepository is integrated)

  // Delete organization
  await organizationRepository.deleteOrganization(organizationId);
}
