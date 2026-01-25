import type {
  Organization,
  CreateOrganizationData,
} from "../../../shared/src/types/organization";
import { removeUndefined } from "@/utils/firestoreHelpers";
import { apiClient } from "@/lib/apiClient";

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new organization
 * Now uses backend API instead of direct Firestore operations
 * @param userId - ID of the user creating the organization (kept for compatibility, not used)
 * @param organizationData - Organization data
 * @returns Promise with the created organization ID
 */
export async function createOrganization(
  userId: string,
  organizationData: CreateOrganizationData,
): Promise<string> {
  const response = await apiClient.post<{ id: string }>(
    "/organizations",
    organizationData,
  );

  return response.id;
}

/**
 * Get a single organization by ID
 * Now uses backend API instead of direct Firestore operations
 * @param organizationId - Organization ID
 * @returns Promise with organization data or null if not found
 */
export async function getOrganization(
  organizationId: string,
): Promise<Organization | null> {
  try {
    return await apiClient.get<Organization>(
      `/organizations/${organizationId}`,
    );
  } catch (error: any) {
    // Return null if organization not found or access denied
    if (error.status === 404 || error.status === 403) {
      return null;
    }
    throw error;
  }
}

/**
 * Get all organizations for a specific user (owner or member)
 * Uses backend API endpoint for proper authorization
 * @param userId - User ID (currently unused, auth handled by backend)
 * @returns Promise with array of organizations
 */
export async function getUserOrganizations(
  userId: string,
): Promise<Organization[]> {
  const response = await apiClient.get<{ organizations: Organization[] }>(
    "/organizations",
  );
  return response.organizations;
}

/**
 * Update an existing organization
 * Now uses backend API instead of direct Firestore operations
 * @param organizationId - Organization ID
 * @param userId - ID of user making the update (kept for compatibility, not used)
 * @param updates - Partial organization data to update
 * @returns Promise that resolves when update is complete
 */
export async function updateOrganization(
  organizationId: string,
  userId: string,
  updates: Partial<
    Omit<Organization, "id" | "ownerId" | "createdAt" | "stats">
  >,
): Promise<void> {
  await apiClient.patch(
    `/organizations/${organizationId}`,
    removeUndefined(updates),
  );
}

/**
 * Delete an organization
 * Now uses backend API instead of direct Firestore operations
 * @param organizationId - Organization ID
 * @returns Promise that resolves when delete is complete
 */
export async function deleteOrganization(
  organizationId: string,
): Promise<void> {
  await apiClient.delete(`/organizations/${organizationId}`);
}

/**
 * Update organization stats (stableCount, totalMemberCount)
 * Now uses backend API instead of direct Firestore operations
 * @param organizationId - Organization ID
 * @param stats - Stats to update
 * @returns Promise that resolves when update is complete
 */
export async function updateOrganizationStats(
  organizationId: string,
  stats: { stableCount?: number; totalMemberCount?: number },
): Promise<void> {
  await apiClient.patch(`/organizations/${organizationId}/stats`, stats);
}

/**
 * Upgrade an organization from personal to business
 * @param organizationId - Organization ID
 * @returns Promise with the upgraded organization data
 */
export async function upgradeOrganization(
  organizationId: string,
): Promise<Organization> {
  return await apiClient.post<Organization>(
    `/organizations/${organizationId}/upgrade`,
    {},
  );
}
