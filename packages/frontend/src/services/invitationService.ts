import { Timestamp } from "firebase/firestore";
import { authFetchJSON } from "@/utils/authFetch";

export interface Invitation {
  id: string;
  stableId: string;
  stableName: string;
  email: string;
  firstName?: string; // For pre-populating invite
  lastName?: string; // For pre-populating invite
  role: "manager" | "member";
  status: "pending" | "accepted" | "declined";
  createdAt: Timestamp;
  expiresAt: Timestamp;
  invitedBy: string;
  invitedByName?: string;
}

/**
 * Data required to create a new invitation
 */
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

/**
 * Get all pending invitations for a user by email
 * Filters out expired invitations on the backend
 */
export async function getPendingInvitations(
  userEmail: string,
): Promise<Invitation[]> {
  const params = new URLSearchParams({ email: userEmail });

  const response = await authFetchJSON<{
    invites: Invitation[];
    pendingMemberships: any[];
  }>(
    `${import.meta.env.VITE_API_URL}/api/v1/invites/pending?${params.toString()}`,
    { method: "GET" },
  );

  return response.invites;
}

/**
 * Accept an invitation - creates stable member and updates invite atomically
 * Backend uses Firestore batch write to ensure transaction integrity
 * Validates invitation status before accepting
 */
export async function acceptInvitation(
  inviteId: string,
  userId: string,
  userEmail: string,
  firstName: string,
  lastName: string,
  stableId: string,
  stableName: string,
  role: "manager" | "member",
): Promise<void> {
  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/invites/${inviteId}/accept`,
    {
      method: "POST",
      body: JSON.stringify({
        firstName,
        lastName,
        stableId,
        stableName,
        role,
      }),
    },
  );
}

/**
 * Decline an invitation - updates invite status only
 * Includes audit trail with userId for tracking who declined
 */
export async function declineInvitation(
  inviteId: string,
  userId: string,
): Promise<void> {
  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/invites/${inviteId}/decline`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

/**
 * Get all invites for a stable
 * Used by StableInvitePage to display all invitations
 *
 * @param stableId - Stable ID
 * @returns Promise with array of invitations
 *
 * @example
 * ```typescript
 * const invites = await getInvitesByStable('stable123')
 * invites.forEach(invite => console.log(invite.email, invite.status))
 * ```
 */
export async function getInvitesByStable(
  stableId: string,
): Promise<Invitation[]> {
  const response = await authFetchJSON<{ invites: Invitation[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/stables/${stableId}/invites`,
    { method: "GET" },
  );

  return response.invites;
}

/**
 * Create a new invite
 * Used by StableInvitePage to invite new members
 *
 * @param inviteData - Invitation data
 * @returns Promise with created invite ID
 *
 * @example
 * ```typescript
 * const inviteId = await createInvite({
 *   stableId: 'stable123',
 *   stableName: 'My Stable',
 *   email: 'user@example.com',
 *   role: 'member',
 *   invitedBy: userId,
 *   invitedByName: 'John Doe'
 * })
 * ```
 */
export async function createInvite(
  inviteData: CreateInviteData,
): Promise<string> {
  const response = await authFetchJSON<{ id: string }>(
    `${import.meta.env.VITE_API_URL}/api/v1/invites`,
    {
      method: "POST",
      body: JSON.stringify(inviteData),
    },
  );

  return response.id;
}
