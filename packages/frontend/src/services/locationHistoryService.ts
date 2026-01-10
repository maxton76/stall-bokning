import { Timestamp } from "firebase/firestore";
import type { LocationHistory } from "@/types/roles";
import { toDate } from "@/utils/timestampUtils";

// ============================================================================
// Create Operations
// ============================================================================

/**
 * Create a new location history entry for stable assignments
 * @param horseId - Horse ID
 * @param horseName - Horse name (cached)
 * @param stableId - Stable ID
 * @param stableName - Stable name (cached)
 * @param userId - User ID creating the entry
 * @param arrivalDate - When horse arrived (defaults to now)
 * @returns Promise with the created entry ID
 */
export async function createLocationHistoryEntry(
  horseId: string,
  horseName: string,
  stableId: string,
  stableName: string,
  userId: string,
  arrivalDate?: Timestamp,
): Promise<string> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const entryData = {
    locationType: "stable" as const,
    stableId,
    stableName,
    arrivalDate: arrivalDate
      ? toDate(arrivalDate)?.toISOString()
      : new Date().toISOString(),
    departureDate: null,
  };

  const response = await authFetchJSON<{ id: string }>(
    `${import.meta.env.VITE_API_URL}/api/v1/location-history/horse/${horseId}`,
    {
      method: "POST",
      body: JSON.stringify(entryData),
    },
  );

  return response.id;
}

/**
 * Create a location history entry for external moves
 * @param horseId - Horse ID
 * @param horseName - Horse name (cached)
 * @param externalLocation - Location name (from contact or manual entry)
 * @param moveType - Type of external move ('temporary' | 'permanent')
 * @param departureDate - When horse departed for external location
 * @param userId - User ID creating the entry
 * @param contactId - Optional contact ID reference
 * @param moveReason - Optional reason for permanent moves
 * @returns Promise with the created entry ID
 */
export async function createExternalLocationHistoryEntry(
  horseId: string,
  horseName: string,
  externalLocation: string,
  moveType: "temporary" | "permanent",
  departureDate: Timestamp,
  userId: string,
  contactId?: string,
  moveReason?: string,
): Promise<string> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const entryData = {
    locationType: "external" as const,
    externalLocation,
    externalMoveType: moveType,
    arrivalDate:
      toDate(departureDate)?.toISOString() || new Date().toISOString(),
    departureDate: null,
    ...(contactId && { externalContactId: contactId }),
    ...(moveReason && { externalMoveReason: moveReason }),
  };

  const response = await authFetchJSON<{ id: string }>(
    `${import.meta.env.VITE_API_URL}/api/v1/location-history/horse/${horseId}`,
    {
      method: "POST",
      body: JSON.stringify(entryData),
    },
  );

  return response.id;
}

/**
 * Close a location history entry by setting the departure date
 * Works for both stable and external locations
 * @param horseId - Horse ID
 * @param locationType - Type of location ('stable' | 'external')
 * @param locationId - Stable ID (if stable) or null (if external)
 * @param userId - User ID making the change
 * @param departureDate - When horse left (defaults to now)
 */
export async function closeLocationHistoryEntry(
  horseId: string,
  locationType: "stable" | "external",
  locationId: string | null,
  userId: string,
  departureDate?: Timestamp,
): Promise<void> {
  // Get current open location entry
  const currentLocation = await getCurrentLocation(horseId);

  if (!currentLocation) {
    // No open entry to close
    return;
  }

  // Validate that we're closing the right location
  if (locationType === "stable" && locationId) {
    if (
      currentLocation.locationType !== "stable" ||
      currentLocation.stableId !== locationId
    ) {
      console.warn("Current location does not match specified stable");
      return;
    }
  } else if (locationType === "external") {
    if (currentLocation.locationType !== "external") {
      console.warn("Current location is not external");
      return;
    }
  } else {
    return;
  }

  // Close the entry via API
  const { authFetchJSON } = await import("@/utils/authFetch");

  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/location-history/${horseId}/${currentLocation.id}/close`,
    {
      method: "PUT",
      body: JSON.stringify({
        departureDate: departureDate
          ? toDate(departureDate)?.toISOString()
          : new Date().toISOString(),
      }),
    },
  );
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get location history for a specific horse
 * @param horseId - Horse ID
 * @returns Promise with array of location history entries
 */
export async function getHorseLocationHistory(
  horseId: string,
): Promise<LocationHistory[]> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const response = await authFetchJSON<{ history: LocationHistory[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/location-history/horse/${horseId}`,
    { method: "GET" },
  );

  return response.history;
}

/**
 * Get the current location for a horse (entry with no departure date)
 * @param horseId - Horse ID
 * @returns Promise with current location or null
 */
export async function getCurrentLocation(
  horseId: string,
): Promise<LocationHistory | null> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const response = await authFetchJSON<{
    currentLocation: LocationHistory | null;
  }>(
    `${import.meta.env.VITE_API_URL}/api/v1/location-history/horse/${horseId}/current`,
    { method: "GET" },
  );

  return response.currentLocation;
}

/**
 * Get all location history for horses owned by a user
 * First gets user's horses, then queries their location history
 * Now uses backend API instead of direct Firestore queries
 * @param userId - User ID to filter by horse ownership
 * @returns Promise with array of location history entries
 */
export async function getUserHorseLocationHistory(
  userId: string,
): Promise<LocationHistory[]> {
  if (!userId) {
    console.warn("getUserHorseLocationHistory called without userId");
    return [];
  }

  const { authFetchJSON } = await import("@/utils/authFetch");

  const response = await authFetchJSON<{ history: LocationHistory[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/location-history/user/${userId}`,
    { method: "GET" },
  );

  return response.history;
}

// ============================================================================
// Migration & Utility
// ============================================================================

/**
 * Backfill location history for an existing horse with current assignment
 * Used for migrating existing horses to the location history system
 * @param horseId - Horse ID
 * @param horseName - Horse name
 * @param currentStableId - Current stable ID
 * @param currentStableName - Current stable name
 * @param assignedAt - When horse was assigned to current stable
 * @param userId - User ID for the migration
 */
export async function backfillLocationHistory(
  horseId: string,
  horseName: string,
  currentStableId: string,
  currentStableName: string,
  assignedAt: Timestamp,
  userId: string,
): Promise<void> {
  // Check if entry already exists
  const existing = await getCurrentLocation(horseId);

  if (existing && existing.stableId === currentStableId) {
    // Already has current location entry
    return;
  }

  // Create history entry for current location
  await createLocationHistoryEntry(
    horseId,
    horseName,
    currentStableId,
    currentStableName,
    userId,
    assignedAt,
  );
}
