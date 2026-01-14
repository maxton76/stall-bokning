import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  Timestamp,
  writeBatch,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Horse, UserHorseInventory } from "@/types/roles";
import { mapDocsToObjects } from "@/utils/firestoreHelpers";
import {
  createLocationHistoryEntry,
  closeLocationHistoryEntry,
  createExternalLocationHistoryEntry,
} from "./locationHistoryService";
import { createCrudService } from "./firestoreCrud";

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

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Horse CRUD service using the standardized factory
 */
const horseCrud = createCrudService<Horse>({
  collectionName: "horses",
  timestampsEnabled: true,
  sanitizeFn: sanitizeHorseData,
});

/**
 * Create a new horse
 * @param userId - ID of the user who owns the horse
 * @param horseData - Horse data (excluding auto-generated fields)
 * @returns Promise with the created horse ID
 */
export async function createHorse(
  userId: string,
  horseData: Omit<
    Horse,
    "id" | "ownerId" | "createdAt" | "updatedAt" | "lastModifiedBy"
  >,
): Promise<string> {
  const dataWithOwner = {
    ...horseData,
    ownerId: userId,
    isExternal: horseData.isExternal ?? false,
  } as Omit<
    Horse,
    "id" | "createdAt" | "updatedAt" | "createdBy" | "lastModifiedBy"
  >;

  const horseId = await horseCrud.create(userId, dataWithOwner);

  // Create initial location history entry if horse is assigned to a stable
  if (horseData.currentStableId && horseData.currentStableName) {
    await createLocationHistoryEntry(
      horseId,
      horseData.name,
      horseData.currentStableId,
      horseData.currentStableName,
      userId,
      horseData.assignedAt, // Use assignedAt timestamp if provided
    );
  }

  return horseId;
}

/**
 * Get a single horse by ID
 * Now uses backend API instead of direct Firestore queries
 * @param horseId - Horse ID
 * @returns Promise with horse data or null if not found
 */
export async function getHorse(horseId: string): Promise<Horse | null> {
  try {
    const { authFetchJSON } = await import("@/utils/authFetch");

    const horse = await authFetchJSON<Horse>(
      `${import.meta.env.VITE_API_URL}/api/v1/horses/${horseId}`,
      { method: "GET" },
    );

    return horse;
  } catch (error: any) {
    // Return null if horse not found or access denied
    if (error.status === 404 || error.status === 403) {
      return null;
    }
    throw error;
  }
}

/**
 * Update an existing horse
 * @param horseId - Horse ID
 * @param userId - ID of user making the update
 * @param updates - Partial horse data to update
 * @returns Promise that resolves when update is complete
 */
export async function updateHorse(
  horseId: string,
  userId: string,
  updates: Partial<Omit<Horse, "id" | "ownerId" | "createdAt">>,
): Promise<void> {
  // Get existing horse data for audit logging
  const existingHorse = await getHorse(horseId);
  if (!existingHorse) {
    throw new Error("Horse not found");
  }

  // Perform the update
  await horseCrud.update(horseId, userId, updates);

  // Log horse data changes (non-blocking)
  const { logHorseUpdate, calculateChanges } =
    await import("./auditLogService");
  const changes = calculateChanges(
    existingHorse as unknown as Record<string, unknown>,
    { ...existingHorse, ...updates } as unknown as Record<string, unknown>,
  );

  if (changes.length > 0) {
    logHorseUpdate(
      horseId,
      existingHorse.name,
      existingHorse.currentStableId,
      changes,
      userId,
    ).catch((err) => {
      console.error("Audit log failed:", err);
    });
  }
}

/**
 * Delete a horse
 * @param horseId - Horse ID
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteHorse(horseId: string): Promise<void> {
  return horseCrud.delete(horseId);
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get all horses owned by a user OR in user's stables
 * Now uses backend API instead of direct Firestore queries
 * @param userId - User ID
 * @returns Promise with array of horses
 */
export async function getUserHorses(userId: string): Promise<Horse[]> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const response = await authFetchJSON<{ horses: Horse[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/horses`,
    { method: "GET" },
  );

  // Filter to active horses only (API returns all horses user has access to)
  return response.horses.filter((horse) => horse.status === "active");
}

/**
 * Get all horses assigned to a stable
 * Now uses backend API instead of direct Firestore queries
 * @param stableId - Stable ID
 * @returns Promise with array of horses
 */
export async function getStableHorses(stableId: string): Promise<Horse[]> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const response = await authFetchJSON<{ horses: Horse[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/horses?stableId=${stableId}`,
    { method: "GET" },
  );

  // Filter to active horses only
  return response.horses.filter((horse) => horse.status === "active");
}

/**
 * Get a user's horses that are assigned to a specific stable
 * @param userId - User ID
 * @param stableId - Stable ID
 * @returns Promise with array of horses
 */
export async function getUserHorsesAtStable(
  userId: string,
  stableId: string,
): Promise<Horse[]> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const params = new URLSearchParams({
    ownerId: userId,
    stableId: stableId,
    status: "active",
  });

  const response = await authFetchJSON<{ horses: Horse[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/horses?${params.toString()}`,
    { method: "GET" },
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
 * Assign a horse to a stable
 * Uses batched writes for atomicity with location history
 * @param horseId - Horse ID
 * @param stableId - Stable ID
 * @param stableName - Stable name (for caching)
 * @param userId - ID of user making the assignment
 * @returns Promise that resolves when assignment is complete
 */
export async function assignHorseToStable(
  horseId: string,
  stableId: string,
  stableName: string,
  userId: string,
): Promise<void> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/horses/${horseId}/assign-to-stable`,
    {
      method: "POST",
      body: JSON.stringify({
        stableId,
        stableName,
      }),
    },
  );
}

/**
 * Unassign a horse from its current stable
 * Uses batched writes for atomicity with location history
 * @param horseId - Horse ID
 * @param userId - ID of user making the unassignment
 * @returns Promise that resolves when unassignment is complete
 */
export async function unassignHorseFromStable(
  horseId: string,
  userId: string,
): Promise<void> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/horses/${horseId}/unassign-from-stable`,
    {
      method: "POST",
    },
  );
}

/**
 * Transfer a horse from one stable to another
 * Uses batched writes for atomicity with location history
 * @param horseId - Horse ID
 * @param fromStableId - Current stable ID (for validation)
 * @param toStableId - New stable ID
 * @param toStableName - New stable name (for caching)
 * @param userId - ID of user making the transfer
 * @returns Promise that resolves when transfer is complete
 */
export async function transferHorse(
  horseId: string,
  fromStableId: string,
  toStableId: string,
  toStableName: string,
  userId: string,
): Promise<void> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/horses/${horseId}/transfer`,
    {
      method: "POST",
      body: JSON.stringify({
        fromStableId,
        toStableId,
        toStableName,
      }),
    },
  );
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
  console.log("🔍 getHorseOrganizationId: Starting for horse:", {
    horseId: horse.id,
    horseName: horse.name,
    currentStableId: horse.currentStableId,
    ownerId: horse.ownerId,
  });

  // If horse is assigned to a stable, get organization from stable
  if (horse.currentStableId) {
    console.log(
      "🏛️ getHorseOrganizationId: Horse has stable, fetching stable doc:",
      horse.currentStableId,
    );
    const stableDoc = await getDoc(doc(db, "stables", horse.currentStableId));
    if (stableDoc.exists()) {
      const organizationId = stableDoc.data().organizationId || null;
      console.log(
        "✅ getHorseOrganizationId: Found organization from stable:",
        organizationId,
      );
      return organizationId;
    }
    console.warn("⚠️ getHorseOrganizationId: Stable doc not found");
  }

  // For unassigned horses, get organization from owner's membership
  if (horse.ownerId) {
    console.log(
      "👤 getHorseOrganizationId: Horse unassigned, checking owner membership:",
      horse.ownerId,
    );
    const membershipsQuery = query(
      collection(db, "organizationMembers"),
      where("userId", "==", horse.ownerId),
      where("status", "==", "active"),
      limit(1),
    );
    const membershipsSnapshot = await getDocs(membershipsQuery);

    console.log("📋 getHorseOrganizationId: Membership query results:", {
      empty: membershipsSnapshot.empty,
      size: membershipsSnapshot.size,
      docs: membershipsSnapshot.docs.map((d) => ({ id: d.id, data: d.data() })),
    });

    if (!membershipsSnapshot.empty) {
      const organizationId = membershipsSnapshot.docs[0]!.data().organizationId;
      console.log(
        "✅ getHorseOrganizationId: Found organization from owner membership:",
        organizationId,
      );
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
 * Unassign all horses owned by a user from a specific stable
 * Called when a member leaves a stable
 * @param userId - User ID
 * @param stableId - Stable ID
 * @returns Promise with the number of horses unassigned
 */
export async function unassignMemberHorses(
  userId: string,
  stableId: string,
): Promise<number> {
  const horses = await getUserHorsesAtStable(userId, stableId);

  if (horses.length === 0) return 0;

  const batch = writeBatch(db);
  horses.forEach((horse) => {
    const horseRef = doc(db, "horses", horse.id);
    batch.update(horseRef, {
      currentStableId: null,
      currentStableName: null,
      assignedAt: null,
      updatedAt: Timestamp.now(),
      lastModifiedBy: userId,
    });
  });

  await batch.commit();
  return horses.length;
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
 * Assign a horse to a group
 * Now uses backend API instead of direct Firestore operations
 * @param horseId - Horse ID
 * @param groupId - Group ID
 * @param groupName - Group name (for caching)
 * @param userId - ID of user making the assignment (kept for compatibility, not used)
 * @returns Promise that resolves when assignment is complete
 */
export async function assignHorseToGroup(
  horseId: string,
  groupId: string,
  groupName: string,
  userId: string,
): Promise<void> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/horses/${horseId}/assign-to-group`,
    {
      method: "POST",
      body: JSON.stringify({
        groupId,
        groupName,
      }),
    },
  );
}

/**
 * Unassign a horse from its current group
 * Now uses backend API instead of direct Firestore operations
 * @param horseId - Horse ID
 * @param userId - ID of user making the unassignment (kept for compatibility, not used)
 * @returns Promise that resolves when unassignment is complete
 */
export async function unassignHorseFromGroup(
  horseId: string,
  userId: string,
): Promise<void> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/horses/${horseId}/unassign-from-group`,
    {
      method: "POST",
    },
  );
}

/**
 * Unassign all horses from a specific group
 * Called when a group is deleted
 * Now uses backend API instead of direct Firestore operations
 * @param groupId - Group ID
 * @param userId - ID of user making the changes (kept for compatibility, not used)
 * @returns Promise with the number of horses unassigned
 */
export async function unassignHorsesFromGroup(
  groupId: string,
  userId: string,
): Promise<number> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const response = await authFetchJSON<{
    success: boolean;
    unassignedCount: number;
  }>(
    `${import.meta.env.VITE_API_URL}/api/v1/horses/batch/unassign-from-group`,
    {
      method: "POST",
      body: JSON.stringify({ groupId }),
    },
  );

  return response.unassignedCount;
}

// ============================================================================
// Vaccination Rule Assignment Operations
// ============================================================================

/**
 * Assign a vaccination rule to a horse
 * @param horseId - Horse ID
 * @param ruleId - Vaccination rule ID
 * @param ruleName - Vaccination rule name (for caching)
 * @param userId - ID of user making the assignment
 * @returns Promise that resolves when assignment is complete
 */
export async function assignVaccinationRuleToHorse(
  horseId: string,
  ruleId: string,
  ruleName: string,
  userId: string,
): Promise<void> {
  const horseRef = doc(db, "horses", horseId);
  await updateDoc(horseRef, {
    vaccinationRuleId: ruleId,
    vaccinationRuleName: ruleName,
    updatedAt: Timestamp.now(),
    lastModifiedBy: userId,
  });
}

/**
 * Unassign a vaccination rule from a horse
 * @param horseId - Horse ID
 * @param userId - ID of user making the unassignment
 * @returns Promise that resolves when unassignment is complete
 */
export async function unassignVaccinationRuleFromHorse(
  horseId: string,
  userId: string,
): Promise<void> {
  const horseRef = doc(db, "horses", horseId);
  await updateDoc(horseRef, {
    vaccinationRuleId: null,
    vaccinationRuleName: null,
    updatedAt: Timestamp.now(),
    lastModifiedBy: userId,
  });
}

/**
 * Unassign all horses from a specific vaccination rule
 * Called when a vaccination rule is deleted
 * Now uses backend API instead of direct Firestore operations
 * @param ruleId - Vaccination rule ID
 * @param userId - ID of user making the changes (kept for compatibility, not used)
 * @returns Promise with the number of horses unassigned
 */
export async function unassignHorsesFromVaccinationRule(
  ruleId: string,
  userId: string,
): Promise<number> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const response = await authFetchJSON<{
    success: boolean;
    unassignedCount: number;
  }>(
    `${import.meta.env.VITE_API_URL}/api/v1/horses/batch/unassign-from-vaccination-rule`,
    {
      method: "POST",
      body: JSON.stringify({ ruleId }),
    },
  );

  return response.unassignedCount;
}

// ============================================================================
// External Location Operations
// ============================================================================

/**
 * Move horse to an external location (temporary or permanent)
 * @param horseId - Horse ID
 * @param userId - ID of user making the move
 * @param data - Move data including contact, location, type, date, reason
 * @returns Promise that resolves when move is complete
 */
export async function moveHorseToExternalLocation(
  horseId: string,
  userId: string,
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

  const { authFetchJSON } = await import("@/utils/authFetch");

  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/horses/${horseId}/move-external`,
    {
      method: "POST",
      body: JSON.stringify({
        contactId: data.contactId,
        externalLocation: locationName,
        moveType: data.moveType,
        departureDate: data.departureDate.toISOString(),
        reason: data.reason,
        removeHorse: data.removeHorse || false,
      }),
    },
  );
}
