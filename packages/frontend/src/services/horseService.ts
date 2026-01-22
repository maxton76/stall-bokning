import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Horse, UserHorseInventory } from "@/types/roles";
import { authFetchJSON } from "@/utils/authFetch";

// ============================================================================
// API-First Service - All writes go through the API
// ============================================================================

const API_BASE = `${import.meta.env.VITE_API_URL}/api/v1/horses`;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sanitize horse data for external horses
 * External horses should NOT have dateOfArrival, currentStableId, or usage
 */
function sanitizeHorseData(horseData: Partial<Horse>): Partial<Horse> {
  if (horseData.isExternal) {
    return {
      ...horseData,
      dateOfArrival: undefined,
      currentStableId: undefined,
      currentStableName: undefined,
      assignedAt: undefined,
      usage: undefined,
    };
  }
  return horseData;
}

/**
 * Compute hasSpecialInstructions flag based on horse data
 */
function computeHasSpecialInstructions(horseData: Partial<Horse>): boolean {
  return !!(
    (horseData.specialInstructions &&
      horseData.specialInstructions.trim().length > 0) ||
    (horseData.equipment && horseData.equipment.length > 0)
  );
}

// ============================================================================
// CRUD Operations via API
// ============================================================================

/**
 * Create a new horse via API
 * @param _userId - ID of the user who owns the horse (passed via auth token)
 * @param horseData - Horse data (excluding auto-generated fields)
 * @returns Promise with the created horse ID
 */
export async function createHorse(
  _userId: string,
  horseData: Omit<
    Horse,
    "id" | "ownerId" | "createdAt" | "updatedAt" | "lastModifiedBy"
  >,
): Promise<string> {
  const response = await authFetchJSON<Horse & { id: string }>(API_BASE, {
    method: "POST",
    body: JSON.stringify({
      ...horseData,
      isExternal: horseData.isExternal ?? false,
    }),
  });

  return response.id;
}

/**
 * Get a single horse by ID via API
 * @param horseId - Horse ID
 * @returns Promise with horse data or null if not found
 */
export async function getHorse(horseId: string): Promise<Horse | null> {
  try {
    return await authFetchJSON<Horse>(`${API_BASE}/${horseId}`);
  } catch (error: any) {
    // Return null if horse not found or access denied
    if (error.status === 404 || error.status === 403) {
      return null;
    }
    throw error;
  }
}

/**
 * Update an existing horse via API
 * @param horseId - Horse ID
 * @param _userId - ID of user making the update (passed via auth token)
 * @param updates - Partial horse data to update
 * @returns Promise that resolves when update is complete
 */
export async function updateHorse(
  horseId: string,
  _userId: string,
  updates: Partial<Omit<Horse, "id" | "ownerId" | "createdAt">>,
): Promise<void> {
  await authFetchJSON(`${API_BASE}/${horseId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

/**
 * Delete a horse via API
 * @param horseId - Horse ID
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteHorse(horseId: string): Promise<void> {
  await authFetchJSON(`${API_BASE}/${horseId}`, {
    method: "DELETE",
  });
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get horses based on scope with field-level RBAC
 * @param scope - 'my' (owned), 'stable' (specific stable), 'all' (all accessible)
 * @param stableId - Required if scope='stable'
 * @param status - Filter by status (default: 'active')
 * @returns Promise with array of horses (with _accessLevel and _isOwner metadata)
 */
export async function getHorses(
  scope: "my" | "stable" | "all" = "my",
  stableId?: string,
  status: "active" | "inactive" = "active",
): Promise<Horse[]> {
  const params = new URLSearchParams({ scope, status });
  if (stableId) params.append("stableId", stableId);

  const response = await authFetchJSON<{
    horses: Horse[];
    meta: { scope: string; count: number };
  }>(`${API_BASE}?${params.toString()}`);

  return response.horses;
}

/**
 * Get only horses owned by the current user (full data access)
 * @param stableId - Optional: filter to specific stable
 * @param status - Filter by status (default: 'active')
 * @returns Promise with array of owned horses
 */
export async function getMyHorses(
  stableId?: string,
  status: "active" | "inactive" = "active",
): Promise<Horse[]> {
  return getHorses("my", stableId, status);
}

/**
 * Get all horses assigned to a specific stable (role-filtered data)
 * User must have access to the stable
 * @param stableId - Stable ID
 * @param status - Filter by status (default: 'active')
 * @returns Promise with array of horses
 */
export async function getStableHorses(
  stableId: string,
  status: "active" | "inactive" = "active",
): Promise<Horse[]> {
  return getHorses("stable", stableId, status);
}

/**
 * Get all horses accessible to the user across all their stables (role-filtered)
 * Includes owned horses (full data) + stable horses (filtered by role)
 * @param status - Filter by status (default: 'active')
 * @returns Promise with array of horses
 */
export async function getAllAccessibleHorses(
  status: "active" | "inactive" = "active",
): Promise<Horse[]> {
  return getHorses("all", undefined, status);
}

/**
 * @deprecated Use getMyHorses() instead
 * Get all horses owned by a user OR in user's stables via API
 * @param _userId - User ID (uses authenticated user from token)
 * @returns Promise with array of horses
 */
export async function getUserHorses(_userId: string): Promise<Horse[]> {
  return getAllAccessibleHorses("active");
}

/**
 * Get a user's horses that are assigned to a specific stable via API
 * @param userId - User ID
 * @param stableId - Stable ID
 * @returns Promise with array of horses
 */
export async function getUserHorsesAtStable(
  userId: string,
  stableId: string,
): Promise<Horse[]> {
  const params = new URLSearchParams({
    ownerId: userId,
    stableId: stableId,
    status: "active",
  });

  const response = await authFetchJSON<{ horses: Horse[] }>(
    `${API_BASE}?${params.toString()}`,
  );

  return response.horses;
}

/**
 * Get a user's horses that are assigned to multiple stables
 * @param userId - User ID
 * @param stableIds - Array of stable IDs
 * @returns Promise with array of horses
 */
export async function getUserHorsesAtStables(
  userId: string,
  stableIds: string[],
): Promise<Horse[]> {
  if (stableIds.length === 0) return [];

  // Query horses for each stable and combine results
  const allHorses: Horse[] = [];

  for (const stableId of stableIds) {
    const horses = await getUserHorsesAtStable(userId, stableId);
    allHorses.push(...horses);
  }

  // Remove duplicates (in case a horse is somehow assigned to multiple stables)
  const uniqueHorses = allHorses.filter(
    (horse, index, self) => index === self.findIndex((h) => h.id === horse.id),
  );

  return uniqueHorses;
}

/**
 * Get all unassigned horses for a user
 * @param userId - User ID
 * @returns Promise with array of unassigned horses
 */
export async function getUnassignedHorses(userId: string): Promise<Horse[]> {
  const allHorses = await getUserHorses(userId);
  return allHorses.filter((horse) => !horse.currentStableId);
}

// ============================================================================
// Assignment Operations
// ============================================================================

/**
 * Assign a horse to a stable via API
 * @param horseId - Horse ID
 * @param stableId - Stable ID
 * @param stableName - Stable name (for caching)
 * @param _userId - ID of user making the assignment (passed via auth token)
 * @returns Promise that resolves when assignment is complete
 */
export async function assignHorseToStable(
  horseId: string,
  stableId: string,
  stableName: string,
  _userId: string,
): Promise<void> {
  await authFetchJSON(`${API_BASE}/${horseId}/assign-to-stable`, {
    method: "POST",
    body: JSON.stringify({
      stableId,
      stableName,
    }),
  });
}

/**
 * Unassign a horse from its current stable via API
 * @param horseId - Horse ID
 * @param _userId - ID of user making the unassignment (passed via auth token)
 * @returns Promise that resolves when unassignment is complete
 */
export async function unassignHorseFromStable(
  horseId: string,
  _userId: string,
): Promise<void> {
  await authFetchJSON(`${API_BASE}/${horseId}/unassign-from-stable`, {
    method: "POST",
  });
}

/**
 * Transfer a horse from one stable to another via API
 * @param horseId - Horse ID
 * @param fromStableId - Current stable ID (for validation)
 * @param toStableId - New stable ID
 * @param toStableName - New stable name (for caching)
 * @param _userId - ID of user making the transfer (passed via auth token)
 * @returns Promise that resolves when transfer is complete
 */
export async function transferHorse(
  horseId: string,
  fromStableId: string,
  toStableId: string,
  toStableName: string,
  _userId: string,
): Promise<void> {
  await authFetchJSON(`${API_BASE}/${horseId}/transfer`, {
    method: "POST",
    body: JSON.stringify({
      fromStableId,
      toStableId,
      toStableName,
    }),
  });
}

/**
 * Get organization ID for a horse's current stable
 * Returns null if horse not assigned or stable not in organization
 * @param horse - Horse object
 * @returns Promise with organization ID or null
 */
export async function getHorseOrganizationId(
  horse: Horse,
): Promise<string | null> {
  // If horse is assigned to a stable, get organization from stable
  if (horse.currentStableId) {
    const stableDoc = await getDoc(doc(db, "stables", horse.currentStableId));
    if (stableDoc.exists()) {
      const organizationId = stableDoc.data().organizationId || null;
      return organizationId;
    }
    console.warn("⚠️ getHorseOrganizationId: Stable doc not found");
  }

  // For unassigned horses, get organization from owner's membership
  if (horse.ownerId) {
    const membershipsQuery = query(
      collection(db, "organizationMembers"),
      where("userId", "==", horse.ownerId),
      where("status", "==", "active"),
      limit(1),
    );
    const membershipsSnapshot = await getDocs(membershipsQuery);

    if (!membershipsSnapshot.empty) {
      const organizationId = membershipsSnapshot.docs[0]!.data().organizationId;
      return organizationId;
    }
    console.warn(
      "⚠️ getHorseOrganizationId: No active memberships found for owner",
    );
  }

  console.warn("❌ getHorseOrganizationId: No organization found");
  return null;
}

// ============================================================================
// Member Lifecycle
// ============================================================================

/**
 * Unassign all horses owned by a user from a specific stable via API
 * Called when a member leaves a stable
 * @param userId - User ID
 * @param stableId - Stable ID
 * @returns Promise with the number of horses unassigned
 */
export async function unassignMemberHorses(
  userId: string,
  stableId: string,
): Promise<number> {
  const response = await authFetchJSON<{
    success: boolean;
    unassignedCount: number;
  }>(`${API_BASE}/batch/unassign-member-horses`, {
    method: "POST",
    body: JSON.stringify({ userId, stableId }),
  });

  return response.unassignedCount;
}

// ============================================================================
// Inventory
// ============================================================================

/**
 * Get a user's complete horse inventory across all stables
 * @param userId - User ID
 * @returns Promise with user's horse inventory data
 */
export async function getUserHorseInventory(
  userId: string,
): Promise<UserHorseInventory> {
  const allHorses = await getUserHorses(userId);
  const assignedHorses = allHorses.filter((h) => h.currentStableId);
  const unassignedHorses = allHorses.filter((h) => !h.currentStableId);

  // Group assigned horses by stable
  const stableMap = new Map<string, { stableName: string; horses: Horse[] }>();

  assignedHorses.forEach((horse) => {
    if (!horse.currentStableId) return;

    const existing = stableMap.get(horse.currentStableId);
    if (existing) {
      existing.horses.push(horse);
    } else {
      stableMap.set(horse.currentStableId, {
        stableName: horse.currentStableName || "Unknown Stable",
        horses: [horse],
      });
    }
  });

  const stableAssignments = Array.from(stableMap.entries()).map(
    ([stableId, data]) => ({
      stableId,
      stableName: data.stableName,
      horseCount: data.horses.length,
      horses: data.horses,
    }),
  );

  return {
    userId,
    totalHorses: allHorses.length,
    assignedHorses: assignedHorses.length,
    unassignedHorses: unassignedHorses.length,
    stableAssignments,
  };
}

// ============================================================================
// Group Assignment Operations
// ============================================================================

/**
 * Assign a horse to a group via API
 * @param horseId - Horse ID
 * @param groupId - Group ID
 * @param groupName - Group name (for caching)
 * @param _userId - ID of user making the assignment (passed via auth token)
 * @returns Promise that resolves when assignment is complete
 */
export async function assignHorseToGroup(
  horseId: string,
  groupId: string,
  groupName: string,
  _userId: string,
): Promise<void> {
  await authFetchJSON(`${API_BASE}/${horseId}/assign-to-group`, {
    method: "POST",
    body: JSON.stringify({
      groupId,
      groupName,
    }),
  });
}

/**
 * Unassign a horse from its current group via API
 * @param horseId - Horse ID
 * @param _userId - ID of user making the unassignment (passed via auth token)
 * @returns Promise that resolves when unassignment is complete
 */
export async function unassignHorseFromGroup(
  horseId: string,
  _userId: string,
): Promise<void> {
  await authFetchJSON(`${API_BASE}/${horseId}/unassign-from-group`, {
    method: "POST",
  });
}

/**
 * Unassign all horses from a specific group via API
 * Called when a group is deleted
 * @param groupId - Group ID
 * @param _userId - ID of user making the changes (passed via auth token)
 * @returns Promise with the number of horses unassigned
 */
export async function unassignHorsesFromGroup(
  groupId: string,
  _userId: string,
): Promise<number> {
  const response = await authFetchJSON<{
    success: boolean;
    unassignedCount: number;
  }>(`${API_BASE}/batch/unassign-from-group`, {
    method: "POST",
    body: JSON.stringify({ groupId }),
  });

  return response.unassignedCount;
}

// ============================================================================
// Vaccination Rule Assignment Operations
// ============================================================================

/**
 * Assign a vaccination rule to a horse via API
 * @param horseId - Horse ID
 * @param ruleId - Vaccination rule ID
 * @param ruleName - Vaccination rule name (for caching)
 * @param _userId - ID of user making the assignment (passed via auth token)
 * @returns Promise that resolves when assignment is complete
 */
export async function assignVaccinationRuleToHorse(
  horseId: string,
  ruleId: string,
  ruleName: string,
  _userId: string,
): Promise<void> {
  await authFetchJSON(`${API_BASE}/${horseId}/assign-vaccination-rule`, {
    method: "POST",
    body: JSON.stringify({
      ruleId,
      ruleName,
    }),
  });
}

/**
 * Unassign a vaccination rule from a horse via API
 * @param horseId - Horse ID
 * @param _userId - ID of user making the unassignment (passed via auth token)
 * @returns Promise that resolves when unassignment is complete
 */
export async function unassignVaccinationRuleFromHorse(
  horseId: string,
  _userId: string,
): Promise<void> {
  await authFetchJSON(`${API_BASE}/${horseId}/unassign-vaccination-rule`, {
    method: "POST",
  });
}

/**
 * Unassign all horses from a specific vaccination rule via API
 * Called when a vaccination rule is deleted
 * @param ruleId - Vaccination rule ID
 * @param _userId - ID of user making the changes (passed via auth token)
 * @returns Promise with the number of horses unassigned
 */
export async function unassignHorsesFromVaccinationRule(
  ruleId: string,
  _userId: string,
): Promise<number> {
  const response = await authFetchJSON<{
    success: boolean;
    unassignedCount: number;
  }>(`${API_BASE}/batch/unassign-from-vaccination-rule`, {
    method: "POST",
    body: JSON.stringify({ ruleId }),
  });

  return response.unassignedCount;
}

// ============================================================================
// External Location Operations
// ============================================================================

/**
 * Move horse to an external location (temporary or permanent) via API
 * @param horseId - Horse ID
 * @param _userId - ID of user making the move (passed via auth token)
 * @param data - Move data including contact, location, type, date, reason
 * @returns Promise that resolves when move is complete
 */
export async function moveHorseToExternalLocation(
  horseId: string,
  _userId: string,
  data: {
    contactId?: string; // Contact reference (optional)
    externalLocation?: string;
    moveType: "temporary" | "permanent";
    departureDate: Date;
    reason?: string;
    removeHorse?: boolean;
  },
): Promise<void> {
  // If contactId provided, fetch contact for location name
  let locationName = data.externalLocation || "External location";
  if (data.contactId) {
    const { getContact } = await import("./contactService");
    const contact = await getContact(data.contactId);
    if (contact) {
      locationName =
        contact.contactType === "Personal"
          ? `${contact.firstName} ${contact.lastName}`
          : contact.businessName;
    }
  }

  await authFetchJSON(`${API_BASE}/${horseId}/move-external`, {
    method: "POST",
    body: JSON.stringify({
      contactId: data.contactId,
      externalLocation: locationName,
      moveType: data.moveType,
      departureDate: data.departureDate.toISOString(),
      reason: data.reason,
      removeHorse: data.removeHorse || false,
    }),
  });
}
