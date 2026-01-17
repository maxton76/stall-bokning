import type {
  HorseFeeding,
  CreateHorseFeedingData,
  UpdateHorseFeedingData,
} from "@shared/types";
import { authFetchJSON } from "@/utils/authFetch";

// ============================================================================
// Public Service API
// ============================================================================

/**
 * Get all horse feedings for a stable
 *
 * @param stableId - Stable ID to fetch feedings for
 * @param options - Optional filters
 * @returns Promise with array of horse feedings
 */
export async function getHorseFeedingsByStable(
  stableId: string,
  options?: {
    date?: Date;
    horseId?: string;
    feedingTimeId?: string;
    activeOnly?: boolean;
  },
): Promise<HorseFeeding[]> {
  const params = new URLSearchParams();
  if (options?.date) {
    params.append("date", options.date.toISOString());
  }
  if (options?.horseId) {
    params.append("horseId", options.horseId);
  }
  if (options?.feedingTimeId) {
    params.append("feedingTimeId", options.feedingTimeId);
  }
  if (options?.activeOnly !== undefined) {
    params.append("activeOnly", String(options.activeOnly));
  } else {
    params.append("activeOnly", "true");
  }

  const queryString = params.toString() ? `?${params.toString()}` : "";

  const response = await authFetchJSON<{ horseFeedings: HorseFeeding[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/horse-feedings/stable/${stableId}${queryString}`,
    { method: "GET" },
  );

  return response.horseFeedings;
}

/**
 * Get all feedings for a specific horse
 *
 * @param horseId - Horse ID to fetch feedings for
 * @param activeOnly - If true, only returns active feedings (default: true)
 * @returns Promise with array of horse feedings
 */
export async function getHorseFeedingsByHorse(
  horseId: string,
  activeOnly = true,
): Promise<HorseFeeding[]> {
  const params = new URLSearchParams();
  params.append("activeOnly", String(activeOnly));

  const queryString = `?${params.toString()}`;

  const response = await authFetchJSON<{ horseFeedings: HorseFeeding[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/horse-feedings/horse/${horseId}${queryString}`,
    { method: "GET" },
  );

  return response.horseFeedings;
}

/**
 * Get a single horse feeding by ID
 *
 * @param id - Horse feeding ID
 * @returns Promise with horse feeding or null if not found
 */
export async function getHorseFeedingById(
  id: string,
): Promise<HorseFeeding | null> {
  try {
    const response = await authFetchJSON<HorseFeeding>(
      `${import.meta.env.VITE_API_URL}/api/v1/horse-feedings/${id}`,
      { method: "GET" },
    );

    return response;
  } catch (error) {
    return null;
  }
}

/**
 * Create a new horse feeding
 *
 * @param stableId - Stable ID that owns this feeding
 * @param data - Horse feeding data
 * @returns Promise with created document ID
 */
export async function createHorseFeeding(
  stableId: string,
  data: CreateHorseFeedingData,
): Promise<string> {
  const response = await authFetchJSON<{ id: string }>(
    `${import.meta.env.VITE_API_URL}/api/v1/horse-feedings`,
    {
      method: "POST",
      body: JSON.stringify({ ...data, stableId }),
    },
  );

  return response.id;
}

/**
 * Update a horse feeding
 *
 * @param id - Horse feeding ID
 * @param updates - Partial update data
 * @returns Promise that resolves when update is complete
 */
export async function updateHorseFeeding(
  id: string,
  updates: UpdateHorseFeedingData,
): Promise<void> {
  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/horse-feedings/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(updates),
    },
  );
}

/**
 * Delete a horse feeding
 *
 * @param id - Horse feeding ID
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteHorseFeeding(id: string): Promise<void> {
  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/horse-feedings/${id}`,
    { method: "DELETE" },
  );
}
