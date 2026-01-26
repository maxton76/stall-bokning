import type { Stable } from "@/types/roles";
import { apiClient } from "@/lib/apiClient";

// ============================================================================
// API-First Service - All writes go through the API
// ============================================================================

// ============================================================================
// Types
// ============================================================================

/**
 * Data required to create a new stable
 */
export interface CreateStableData {
  name: string;
  description?: string;
  address?: string;
  facilityNumber?: string; // Anläggningsnummer - Jordbruksverket registration
  ownerId: string;
  ownerEmail?: string;
  organizationId?: string; // Optional for standalone stables
}

/**
 * Data that can be updated on an existing stable
 */
export type UpdateStableData = Partial<
  Omit<Stable, "id" | "ownerId" | "createdAt">
>;

// ============================================================================
// CRUD Operations via API
// ============================================================================

/**
 * Create a new stable via API
 *
 * @param _userId - User ID creating the stable (passed to API via auth token)
 * @param data - Stable data
 * @returns Promise with created stable ID
 *
 * @example
 * ```typescript
 * // Create standalone stable
 * const stableId = await createStable(userId, {
 *   name: 'My Stable',
 *   description: 'A great place for horses',
 *   address: '123 Main St',
 *   ownerId: userId,
 *   ownerEmail: 'user@example.com'
 * })
 *
 * // Create stable within organization
 * const stableId = await createStable(userId, {
 *   name: 'Organization Stable',
 *   ownerId: userId,
 *   ownerEmail: 'user@example.com',
 *   organizationId: 'org123'
 * })
 * ```
 */
export async function createStable(
  _userId: string,
  data: CreateStableData,
): Promise<string> {
  const response = await apiClient.post<Stable & { id: string }>("/stables", {
    name: data.name,
    description: data.description,
    address: data.address,
    facilityNumber: data.facilityNumber,
    organizationId: data.organizationId,
    ownerEmail: data.ownerEmail,
  });

  return response.id;
}

/**
 * Get all stables accessible by the current user via API
 *
 * Returns stables that user either owns or has access to via organization membership.
 * Uses the API which properly handles authorization and organization membership filtering.
 *
 * @returns Promise with array of accessible stables
 *
 * @example
 * ```typescript
 * const stables = await getUserStables()
 * stables.forEach(stable => console.log(stable.name))
 * ```
 */
export async function getUserStables(): Promise<Stable[]> {
  const response = await apiClient.get<{ stables: Stable[] }>("/stables");
  return response.stables;
}

/**
 * Get a stable by ID via API
 *
 * @param stableId - Stable ID
 * @returns Promise with stable data or null if not found
 */
export async function getStable(stableId: string): Promise<Stable | null> {
  try {
    return await apiClient.get<Stable>(`/stables/${stableId}`);
  } catch (error) {
    // Return null if not found (404)
    if (error instanceof Error && error.message.includes("404")) {
      return null;
    }
    throw error;
  }
}

/**
 * Update a stable via API
 *
 * @param stableId - Stable ID
 * @param _userId - User ID performing the update (passed to API via auth token)
 * @param updates - Partial stable data to update
 * @returns Promise that resolves when update is complete
 */
export async function updateStable(
  stableId: string,
  _userId: string,
  updates: UpdateStableData,
): Promise<void> {
  await apiClient.patch(`/stables/${stableId}`, updates);
}

/**
 * Delete a stable via API
 *
 * @param stableId - Stable ID
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteStable(stableId: string): Promise<void> {
  await apiClient.delete(`/stables/${stableId}`);
}

// ============================================================================
// Organization-Specific Operations
// ============================================================================

/**
 * Link a stable to an organization via API
 *
 * Updates the stable's organizationId.
 * Idempotent - safe to call multiple times.
 *
 * @param stableId - Stable ID to link
 * @param organizationId - Organization ID to link to
 * @param _userId - User ID performing the operation (passed to API via auth token)
 * @returns Promise that resolves when linking is complete
 *
 * @example
 * ```typescript
 * await linkStableToOrganization('stable123', 'org456', userId)
 * ```
 */
export async function linkStableToOrganization(
  stableId: string,
  organizationId: string,
  _userId: string,
): Promise<void> {
  await apiClient.patch(`/stables/${stableId}`, { organizationId });
}

/**
 * Unlink a stable from its organization via API
 *
 * Removes the organizationId from the stable.
 *
 * @param stableId - Stable ID to unlink
 * @param _userId - User ID performing the operation (passed to API via auth token)
 * @returns Promise that resolves when unlinking is complete
 *
 * @example
 * ```typescript
 * await unlinkStableFromOrganization('stable123', userId)
 * ```
 */
export async function unlinkStableFromOrganization(
  stableId: string,
  _userId: string,
): Promise<void> {
  await apiClient.patch(`/stables/${stableId}`, { organizationId: null });
}

/**
 * Get the count of stables in an organization
 *
 * Queries Firestore to get accurate count of stables linked to an organization.
 * Used for maintaining organization stats.
 *
 * @param organizationId - Organization ID
 * @returns Promise with count of stables
 *
 * @example
 * ```typescript
 * const count = await getOrganizationStableCount('org123')
 * console.log(`Organization has ${count} stables`)
 * ```
 */
export async function getOrganizationStableCount(
  organizationId: string,
): Promise<number> {
  const stables = await getStablesByOrganization(organizationId);
  return stables.length;
}

/**
 * Get all stables for an organization via API
 *
 * @param organizationId - Organization ID
 * @returns Promise with array of stables
 *
 * @example
 * ```typescript
 * const stables = await getStablesByOrganization('org123')
 * stables.forEach(stable => console.log(stable.name))
 * ```
 */
export async function getStablesByOrganization(
  organizationId: string,
): Promise<Stable[]> {
  const response = await apiClient.get<{ stables: Stable[] }>(
    `/organizations/${organizationId}/stables`,
  );

  return response.stables;
}

/**
 * Get all stables owned by a user via API
 *
 * @param _userId - User ID (uses current authenticated user from token)
 * @returns Promise with array of stables owned by the current user
 *
 * @example
 * ```typescript
 * const stables = await getStablesByOwner(userId)
 * ```
 */
export async function getStablesByOwner(_userId: string): Promise<Stable[]> {
  const response = await apiClient.get<{ stables: Stable[] }>("/stables", {
    ownedOnly: true,
  });

  return response.stables;
}

// ============================================================================
// Member-Specific Operations
// ============================================================================

/**
 * Get active members for a stable with user details via API
 * Returns combined member + user data to avoid N+1 queries
 * Used by ScheduleEditorPage and StableDetailPage
 *
 * @param stableId - Stable ID
 * @returns Promise with array of members including user details
 *
 * @example
 * ```typescript
 * const members = await getActiveMembersWithUserDetails('stable123')
 * members.forEach(member => console.log(member.displayName, member.email))
 * ```
 */
export async function getActiveMembersWithUserDetails(
  stableId: string,
): Promise<any[]> {
  const response = await apiClient.get<{ members: any[] }>(
    `/stables/${stableId}/members`,
    { includeUserDetails: true },
  );

  return response.members;
}

/**
 * Delete a stable member via API
 * Used by StableDetailPage
 *
 * @param stableId - Stable ID
 * @param memberId - Member ID to delete
 * @returns Promise that resolves when deletion is complete
 *
 * @example
 * ```typescript
 * await deleteStableMember('stable123', 'member456')
 * ```
 */
export async function deleteStableMember(
  stableId: string,
  memberId: string,
): Promise<void> {
  await apiClient.delete(`/stables/${stableId}/members/${memberId}`);
}
