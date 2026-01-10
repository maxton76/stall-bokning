import { Timestamp } from "firebase/firestore";
import { createCrudService, CrudService, queryHelpers } from "./firestoreCrud";
import { updateOrganizationStats } from "./organizationService";
import type { Stable } from "@/types/roles";

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
// Base CRUD Service
// ============================================================================

/**
 * Base CRUD operations for stables using the factory pattern
 */
const stableCrud: CrudService<Stable> = createCrudService<Stable>({
  collectionName: "stables",
  timestampsEnabled: true,
});

// ============================================================================
// Extended Stable Service
// ============================================================================

/**
 * Create a new stable
 *
 * @param userId - User ID creating the stable (will be set as ownerId)
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
  userId: string,
  data: CreateStableData,
): Promise<string> {
  const stableData = {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const stableId = await stableCrud.create(userId, stableData);

  // Update organization stats if stable belongs to an organization
  if (data.organizationId) {
    const count = await getOrganizationStableCount(data.organizationId);
    await updateOrganizationStats(data.organizationId, { stableCount: count });
  }

  return stableId;
}

/**
 * Get a stable by ID
 *
 * @param stableId - Stable ID
 * @returns Promise with stable data or null if not found
 */
export async function getStable(stableId: string): Promise<Stable | null> {
  return stableCrud.getById(stableId);
}

/**
 * Update a stable
 *
 * @param stableId - Stable ID
 * @param userId - User ID performing the update
 * @param updates - Partial stable data to update
 * @returns Promise that resolves when update is complete
 */
export async function updateStable(
  stableId: string,
  userId: string,
  updates: UpdateStableData,
): Promise<void> {
  return stableCrud.update(stableId, userId, updates);
}

/**
 * Delete a stable
 *
 * @param stableId - Stable ID
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteStable(stableId: string): Promise<void> {
  return stableCrud.delete(stableId);
}

// ============================================================================
// Organization-Specific Operations
// ============================================================================

/**
 * Link a stable to an organization
 *
 * Updates the stable's organizationId and updates organization stats.
 * Idempotent - safe to call multiple times.
 *
 * @param stableId - Stable ID to link
 * @param organizationId - Organization ID to link to
 * @param userId - User ID performing the operation
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
  userId: string,
): Promise<void> {
  // Update stable with organizationId
  await stableCrud.update(stableId, userId, {
    organizationId,
  });

  // Update organization stats
  const count = await getOrganizationStableCount(organizationId);
  await updateOrganizationStats(organizationId, { stableCount: count });
}

/**
 * Unlink a stable from its organization
 *
 * Removes the organizationId from the stable and updates organization stats.
 *
 * @param stableId - Stable ID to unlink
 * @param userId - User ID performing the operation
 * @returns Promise that resolves when unlinking is complete
 *
 * @example
 * ```typescript
 * await unlinkStableFromOrganization('stable123', userId)
 * ```
 */
export async function unlinkStableFromOrganization(
  stableId: string,
  userId: string,
): Promise<void> {
  // Get current stable to find organizationId
  const stable = await getStable(stableId);
  if (!stable) throw new Error("Stable not found");

  const previousOrgId = stable.organizationId;

  // Remove organizationId from stable
  await stableCrud.update(stableId, userId, {
    organizationId: undefined,
  });

  // Update organization stats if stable was linked
  if (previousOrgId) {
    const count = await getOrganizationStableCount(previousOrgId);
    await updateOrganizationStats(previousOrgId, { stableCount: count });
  }
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
 * Get all stables for an organization
 * Now uses backend API instead of direct Firestore queries
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
  const { authFetchJSON } = await import("@/utils/authFetch");

  const response = await authFetchJSON<{ stables: Stable[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/organizations/${organizationId}/stables`,
    { method: "GET" },
  );

  return response.stables;
}

/**
 * Get all stables owned by a user
 *
 * @param userId - User ID
 * @returns Promise with array of stables
 *
 * @example
 * ```typescript
 * const stables = await getStablesByOwner(userId)
 * ```
 */
export async function getStablesByOwner(userId: string): Promise<Stable[]> {
  return stableCrud.query([queryHelpers.whereUser(userId, "ownerId")]);
}

// ============================================================================
// Member-Specific Operations
// ============================================================================

/**
 * Get active members for a stable with user details
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
  const { authFetchJSON } = await import("@/utils/authFetch");

  const response = await authFetchJSON<{ members: any[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/stables/${stableId}/members?includeUserDetails=true`,
    { method: "GET" },
  );

  return response.members;
}

/**
 * Delete a stable member
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
  const { authFetchJSON } = await import("@/utils/authFetch");

  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/stables/${stableId}/members/${memberId}`,
    { method: "DELETE" },
  );
}
