import { db } from "../utils/firebase.js";
import type {
  OrganizationMember,
  OrganizationRole,
  MembershipStatus,
} from "@stall-bokning/shared/types/organization";

/**
 * Member Repository
 *
 * Centralized data access layer for organizationMembers collection.
 * Eliminates 8+ duplicate member access patterns and 4+ role check patterns.
 *
 * Pattern consolidation:
 * - Pattern 1: Member access verification (8+ duplicates) → getMemberById, getActiveMember, isActiveMember
 * - Pattern 2: Role-based permission checks (4+ duplicates) → hasRole, hasAnyRole, isAdministrator
 */

/**
 * Get member by composite key or memberId string
 * @param userIdOrMemberId - User ID or full memberId (userId_organizationId)
 * @param organizationId - Organization ID (optional if memberId provided)
 * @returns Member document or null if not found
 */
export async function getMemberById(
  userIdOrMemberId: string,
  organizationId?: string,
): Promise<OrganizationMember | null> {
  const memberId = organizationId
    ? `${userIdOrMemberId}_${organizationId}`
    : userIdOrMemberId;

  const memberDoc = await db
    .collection("organizationMembers")
    .doc(memberId)
    .get();

  if (!memberDoc.exists) {
    return null;
  }

  return {
    id: memberDoc.id,
    ...memberDoc.data(),
  } as OrganizationMember;
}

/**
 * Get active member (status === 'active')
 * Eliminates Pattern 1: Manual member lookup + status check (8+ duplicates)
 *
 * @param userId - User ID (optional if using email)
 * @param organizationId - Organization ID
 * @param email - Email address (optional, alternative to userId)
 * @returns Active member document or null if not found or inactive
 */
export async function getActiveMember(
  userId: string | null,
  organizationId: string,
  email?: string,
): Promise<OrganizationMember | null> {
  let member: OrganizationMember | null = null;

  if (userId) {
    member = await getMemberById(userId, organizationId);
  } else if (email) {
    // Find by email
    const snapshot = await db
      .collection("organizationMembers")
      .where("organizationId", "==", organizationId)
      .where("userEmail", "==", email.toLowerCase())
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (!snapshot.empty) {
      member = {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data(),
      } as OrganizationMember;
    }
  }

  if (!member || member.status !== "active") {
    return null;
  }

  return member;
}

/**
 * Check if user is an active member of organization
 * Eliminates Pattern 1: memberDoc.exists && memberDoc.data()?.status === 'active' (8+ duplicates)
 *
 * @param userId - User ID
 * @param organizationId - Organization ID
 * @returns true if user is an active member
 */
export async function isActiveMember(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const member = await getActiveMember(userId, organizationId);
  return member !== null;
}

/**
 * Check if member has a specific role
 * Eliminates Pattern 2: memberData?.roles?.includes(role) (part of 4+ duplicates)
 *
 * @param userId - User ID
 * @param organizationId - Organization ID
 * @param role - Role to check
 * @returns true if member has the role and is active
 */
export async function hasRole(
  userId: string,
  organizationId: string,
  role: OrganizationRole,
): Promise<boolean> {
  const member = await getActiveMember(userId, organizationId);

  if (!member) {
    return false;
  }

  return member.roles.includes(role);
}

/**
 * Check if member has any of the specified roles
 *
 * @param userId - User ID
 * @param organizationId - Organization ID
 * @param roles - Array of roles to check
 * @returns true if member has at least one of the roles and is active
 */
export async function hasAnyRole(
  userId: string,
  organizationId: string,
  roles: OrganizationRole[],
): Promise<boolean> {
  const member = await getActiveMember(userId, organizationId);

  if (!member) {
    return false;
  }

  return member.roles.some((role) => roles.includes(role));
}

/**
 * Check if member is an administrator
 * Eliminates Pattern 2: memberData?.status === 'active' && memberData?.roles?.includes('administrator') (4+ duplicates)
 *
 * @param userId - User ID
 * @param organizationId - Organization ID
 * @returns true if member is an active administrator
 */
export async function isAdministrator(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  return hasRole(userId, organizationId, "administrator");
}

/**
 * Get all members for an organization
 *
 * @param organizationId - Organization ID
 * @param status - Optional status filter
 * @returns Array of organization members
 */
export async function findByOrganization(
  organizationId: string,
  status?: MembershipStatus,
): Promise<OrganizationMember[]> {
  let query = db
    .collection("organizationMembers")
    .where("organizationId", "==", organizationId);

  if (status) {
    query = query.where("status", "==", status) as any;
  }

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as OrganizationMember[];
}

/**
 * Get all organizations for a user
 *
 * @param userId - User ID
 * @param status - Optional status filter
 * @returns Array of organization members
 */
export async function findByUser(
  userId: string,
  status?: MembershipStatus,
): Promise<OrganizationMember[]> {
  let query = db
    .collection("organizationMembers")
    .where("userId", "==", userId);

  if (status) {
    query = query.where("status", "==", status) as any;
  }

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as OrganizationMember[];
}

/**
 * Create a new organization member
 *
 * @param data - Organization member data
 * @returns Created member document
 */
export async function create(
  data: Omit<OrganizationMember, "id">,
): Promise<OrganizationMember> {
  const memberId = `${data.userId}_${data.organizationId}`;

  await db.collection("organizationMembers").doc(memberId).set(data);

  return {
    id: memberId,
    ...data,
  };
}

/**
 * Update member status
 *
 * @param memberId - Member ID (format: userId_organizationId)
 * @param status - New status
 */
export async function updateStatus(
  memberId: string,
  status: MembershipStatus,
): Promise<void> {
  await db
    .collection("organizationMembers")
    .doc(memberId)
    .update({
      status,
      ...(status === "active" ? { inviteAcceptedAt: new Date() } : {}),
    });
}

/**
 * Update member roles and related settings
 *
 * @param memberId - Member ID (format: userId_organizationId)
 * @param updates - Object with roles, primaryRole, showInPlanning, stableAccess, assignedStableIds
 */
export async function updateRoles(
  memberId: string,
  updates: {
    roles: OrganizationRole[];
    primaryRole: OrganizationRole;
    showInPlanning?: boolean;
    stableAccess?: "all" | "specific";
    assignedStableIds?: string[];
  },
): Promise<void> {
  const updateData: any = {
    roles: updates.roles,
    primaryRole: updates.primaryRole,
  };

  if (updates.showInPlanning !== undefined) {
    updateData.showInPlanning = updates.showInPlanning;
  }

  if (updates.stableAccess !== undefined) {
    updateData.stableAccess = updates.stableAccess;
  }

  if (updates.assignedStableIds !== undefined) {
    updateData.assignedStableIds = updates.assignedStableIds;
  }

  await db.collection("organizationMembers").doc(memberId).update(updateData);
}

/**
 * Delete an organization member
 *
 * @param memberId - Member ID (format: userId_organizationId)
 */
export async function deleteMember(memberId: string): Promise<void> {
  await db.collection("organizationMembers").doc(memberId).delete();
}

/**
 * Count active members in an organization
 * Used for updating organization stats
 * Eliminates Pattern 4: Manual count query (2+ duplicates)
 *
 * @param organizationId - Organization ID
 * @returns Count of active members
 */
export async function countActiveMembers(
  organizationId: string,
): Promise<number> {
  const snapshot = await db
    .collection("organizationMembers")
    .where("organizationId", "==", organizationId)
    .where("status", "==", "active")
    .get();

  return snapshot.size;
}
