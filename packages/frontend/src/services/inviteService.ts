import { Timestamp } from "firebase/firestore";
import { apiClient, publicApiClient } from "@/lib/apiClient";

// ============================================================================
// Types (consolidated from invitationService.ts)
// ============================================================================

export interface Invitation {
  id: string;
  stableId: string;
  stableName: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: "manager" | "member";
  status: "pending" | "accepted" | "declined";
  createdAt: Timestamp;
  expiresAt: Timestamp;
  invitedBy: string;
  invitedByName?: string;
}

export interface CreateInviteData {
  stableId: string;
  stableName: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: "manager" | "member";
  invitedBy: string;
  invitedByName?: string;
}

// ============================================================================
// Public Invite Endpoints (no auth required)
// ============================================================================

/**
 * Get invite details by token (public endpoint - no auth required)
 */
interface InviteDetails {
  organizationName: string;
  inviterName: string;
  roles: string[];
  email: string;
  firstName?: string;
  lastName?: string;
}

export async function getInviteDetails(token: string): Promise<InviteDetails> {
  return await publicApiClient.get<InviteDetails>(`/invites/${token}`);
}

/**
 * Accept organization invite (requires authentication)
 */
export async function acceptOrganizationInvite(token: string) {
  return await apiClient.post(`/invites/${token}/accept`);
}

/**
 * Decline organization invite (public endpoint - no auth required)
 */
export async function declineOrganizationInvite(token: string) {
  return await publicApiClient.post(`/invites/${token}/decline`);
}

/**
 * Accept membership invite for existing user (requires authentication)
 */
export async function acceptMembershipInvite(memberId: string) {
  return await apiClient.post(`/organization-members/${memberId}/accept`);
}

/**
 * Decline membership invite for existing user (requires authentication)
 */
export async function declineMembershipInvite(memberId: string) {
  return await apiClient.post(`/organization-members/${memberId}/decline`);
}

/**
 * Get pending invites for current user (requires authentication)
 */
export async function getPendingInvites() {
  return await apiClient.get("/invites/pending");
}

// ============================================================================
// Organization Invite Management (Admin Operations)
// ============================================================================

/**
 * Get all pending invites for an organization
 * @param organizationId - Organization ID
 * @returns Promise with array of pending invites
 */
export async function getOrganizationInvites(organizationId: string) {
  return await apiClient.get<{ invites: any[] }>(
    `/organizations/${organizationId}/invites`,
  );
}

/**
 * Resend an organization invite email
 * @param organizationId - Organization ID
 * @param inviteId - Invite ID
 * @returns Promise with the updated invite details
 */
export async function resendOrganizationInvite(
  organizationId: string,
  inviteId: string,
) {
  return await apiClient.post(
    `/organizations/${organizationId}/invites/${inviteId}/resend`,
  );
}

/**
 * Cancel an organization invite
 * @param organizationId - Organization ID
 * @param inviteId - Invite ID
 * @returns Promise that resolves when invite is cancelled
 */
export async function cancelOrganizationInvite(
  organizationId: string,
  inviteId: string,
) {
  return await apiClient.delete(
    `/organizations/${organizationId}/invites/${inviteId}`,
  );
}

// ============================================================================
// Stable Invite Operations (consolidated from invitationService.ts)
// ============================================================================

/**
 * Get all pending invitations for a user by email
 * Filters out expired invitations on the backend
 */
export async function getPendingInvitations(
  userEmail: string,
): Promise<Invitation[]> {
  const response = await apiClient.get<{
    invites: Invitation[];
    pendingMemberships: unknown[];
  }>("/invites/pending", { email: userEmail });

  return response.invites;
}

/**
 * Accept an invitation - creates stable member and updates invite atomically
 * Backend uses Firestore batch write to ensure transaction integrity
 * Validates invitation status before accepting
 */
export async function acceptInvitation(
  inviteId: string,
  _userId: string,
  _userEmail: string,
  firstName: string,
  lastName: string,
  stableId: string,
  stableName: string,
  role: "manager" | "member",
): Promise<void> {
  await apiClient.post(`/invites/${inviteId}/accept`, {
    firstName,
    lastName,
    stableId,
    stableName,
    role,
  });
}

/**
 * Decline an invitation - updates invite status only
 * Includes audit trail with userId for tracking who declined
 */
export async function declineInvitation(
  inviteId: string,
  _userId: string,
): Promise<void> {
  await apiClient.post(`/invites/${inviteId}/decline`, {});
}

/**
 * Get all invites for a stable
 * Used by StableInvitePage to display all invitations
 *
 * @param stableId - Stable ID
 * @returns Promise with array of invitations
 */
export async function getInvitesByStable(
  stableId: string,
): Promise<Invitation[]> {
  const response = await apiClient.get<{ invites: Invitation[] }>(
    `/stables/${stableId}/invites`,
  );

  return response.invites;
}

/**
 * Create a new invite
 * Used by StableInvitePage to invite new members
 *
 * @param inviteData - Invitation data
 * @returns Promise with created invite ID
 */
export async function createInvite(
  inviteData: CreateInviteData,
): Promise<string> {
  const response = await apiClient.post<{ id: string }>("/invites", inviteData);

  return response.id;
}
