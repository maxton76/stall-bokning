import { authFetchJSON } from "@/utils/authFetch";

/**
 * Get invite details by token (public endpoint - no auth required)
 */
export async function getInviteDetails(token: string) {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/invites/${token}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Invite not found or expired");
  }

  return await response.json();
}

/**
 * Accept organization invite (requires authentication)
 */
export async function acceptOrganizationInvite(token: string) {
  return await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/invites/${token}/accept`,
    {
      method: "POST",
    },
  );
}

/**
 * Decline organization invite (public endpoint - no auth required)
 */
export async function declineOrganizationInvite(token: string) {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/invites/${token}/decline`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to decline invitation");
  }

  return await response.json();
}

/**
 * Accept membership invite for existing user (requires authentication)
 */
export async function acceptMembershipInvite(memberId: string) {
  return await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/organization-members/${memberId}/accept`,
    {
      method: "POST",
    },
  );
}

/**
 * Decline membership invite for existing user (requires authentication)
 */
export async function declineMembershipInvite(memberId: string) {
  return await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/organization-members/${memberId}/decline`,
    {
      method: "POST",
    },
  );
}

/**
 * Get pending invites for current user (requires authentication)
 */
export async function getPendingInvites() {
  return await authFetchJSON(`${import.meta.env.VITE_API_URL}/invites/pending`);
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
  return await authFetchJSON<{ invites: any[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/organizations/${organizationId}/invites`,
    { method: "GET" },
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
  return await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/organizations/${organizationId}/invites/${inviteId}/resend`,
    { method: "POST" },
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
  return await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/organizations/${organizationId}/invites/${inviteId}`,
    { method: "DELETE" },
  );
}
