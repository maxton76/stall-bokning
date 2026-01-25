import type { Horse, UserHorseInventory } from "@/types/roles";
import { apiClient } from "@/lib/apiClient";

// ============================================================================
// API-First Service - All writes go through the API
// ============================================================================

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
  const response = await apiClient.post<Horse & { id: string }>("/horses", {
    ...horseData,
    isExternal: horseData.isExternal ?? false,
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
    return await apiClient.get<Horse>(`/horses/${horseId}`);
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
  await apiClient.patch(`/horses/${horseId}`, updates);
}

/**
 * Delete a horse via API
 * @param horseId - Horse ID
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteHorse(horseId: string): Promise<void> {
  await apiClient.delete(`/horses/${horseId}`);
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
  const response = await apiClient.get<{
    horses: Horse[];
    meta: { scope: string; count: number };
  }>("/horses", { scope, status, stableId });

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
 * Get horses owned by the current user (via ownerOrganizationId)
 * Alias for getMyHorses for semantic clarity
 * @param status - Filter by status (default: 'active')
 * @returns Promise with array of owned horses
 */
export async function getOwnedHorses(
  status: "active" | "inactive" = "active",
): Promise<Horse[]> {
  return getMyHorses(undefined, status);
}

/**
 * Get horses placed at the user's organization (not owned by them)
 * These are horses with placementOrganizationId matching user's org
 * @param status - Filter by status (default: 'active')
 * @returns Promise with array of placed horses
 */
export async function getPlacedHorses(
  status: "active" | "inactive" = "active",
): Promise<Horse[]> {
  const allHorses = await getAllAccessibleHorses(status);
  // Filter to horses that have placement data (not owned by user)
  return allHorses.filter((horse) => {
    const horseWithMeta = horse as Horse & {
      _isOwner?: boolean;
      _accessSource?: string;
    };
    return (
      horseWithMeta._isOwner === false ||
      horseWithMeta._accessSource === "placement"
    );
  });
}

/**
 * Check if a horse is owned by the current user
 * Uses the _isOwner metadata from API response
 * @param horse - Horse object with metadata
 * @returns boolean indicating if user owns the horse
 */
export function isHorseOwner(horse: Horse): boolean {
  const horseWithMeta = horse as Horse & { _isOwner?: boolean };
  return horseWithMeta._isOwner === true;
}

/**
 * Get the access level for a horse
 * Uses the _accessLevel metadata from API response
 * @param horse - Horse object with metadata
 * @returns Access level string or undefined
 */
export function getHorseAccessLevel(
  horse: Horse,
):
  | "public"
  | "basic_care"
  | "professional"
  | "management"
  | "owner"
  | undefined {
  const horseWithMeta = horse as Horse & { _accessLevel?: string };
  return horseWithMeta._accessLevel as
    | "public"
    | "basic_care"
    | "professional"
    | "management"
    | "owner"
    | undefined;
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
  const response = await apiClient.get<{ horses: Horse[] }>("/horses", {
    ownerId: userId,
    stableId,
    status: "active",
  });

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
  await apiClient.post(`/horses/${horseId}/assign-to-stable`, {
    stableId,
    stableName,
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
  await apiClient.post(`/horses/${horseId}/unassign-from-stable`);
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
  await apiClient.post(`/horses/${horseId}/transfer`, {
    fromStableId,
    toStableId,
    toStableName,
  });
}

/**
 * Get organization ID for a horse's current stable
 * Returns null if horse not assigned or stable not in organization
 * Falls back to owner's organization membership if horse is unassigned
 * @param horse - Horse object (must have id property)
 * @returns Promise with organization ID or null
 */
export async function getHorseOrganizationId(
  horse: Horse,
): Promise<string | null> {
  try {
    const response = await apiClient.get<{ organizationId: string | null }>(
      `/horses/${horse.id}/organization`,
    );
    return response.organizationId;
  } catch (error: any) {
    // Return null if horse not found or access denied
    if (error.status === 404 || error.status === 403) {
      console.warn(
        `⚠️ getHorseOrganizationId: ${error.status === 404 ? "Horse not found" : "Access denied"}`,
      );
      return null;
    }
    console.error(
      "❌ getHorseOrganizationId: Failed to get organization",
      error,
    );
    throw error;
  }
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
  const response = await apiClient.post<{
    success: boolean;
    unassignedCount: number;
  }>("/horses/batch/unassign-member-horses", { userId, stableId });

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
  await apiClient.post(`/horses/${horseId}/assign-to-group`, {
    groupId,
    groupName,
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
  await apiClient.post(`/horses/${horseId}/unassign-from-group`);
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
  const response = await apiClient.post<{
    success: boolean;
    unassignedCount: number;
  }>("/horses/batch/unassign-from-group", { groupId });

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
  await apiClient.post(`/horses/${horseId}/assign-vaccination-rule`, {
    ruleId,
    ruleName,
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
  await apiClient.post(`/horses/${horseId}/unassign-vaccination-rule`);
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
  const response = await apiClient.post<{
    success: boolean;
    unassignedCount: number;
  }>("/horses/batch/unassign-from-vaccination-rule", { ruleId });

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

  await apiClient.post(`/horses/${horseId}/move-external`, {
    contactId: data.contactId,
    externalLocation: locationName,
    moveType: data.moveType,
    departureDate: data.departureDate.toISOString(),
    reason: data.reason,
    removeHorse: data.removeHorse || false,
  });
}
