import type {
  HorseFeeding,
  CreateHorseFeedingData,
  UpdateHorseFeedingData,
} from "@shared/types";
import { apiClient } from "@/lib/apiClient";

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
  const params: Record<string, string> = {};
  if (options?.date) {
    params.date = options.date.toISOString();
  }
  if (options?.horseId) {
    params.horseId = options.horseId;
  }
  if (options?.feedingTimeId) {
    params.feedingTimeId = options.feedingTimeId;
  }
  if (options?.activeOnly !== undefined) {
    params.activeOnly = String(options.activeOnly);
  } else {
    params.activeOnly = "true";
  }

  const response = await apiClient.get<{ horseFeedings: HorseFeeding[] }>(
    `/horse-feedings/stable/${stableId}`,
    params,
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
  const response = await apiClient.get<{ horseFeedings: HorseFeeding[] }>(
    `/horse-feedings/horse/${horseId}`,
    { activeOnly: String(activeOnly) },
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
    return await apiClient.get<HorseFeeding>(`/horse-feedings/${id}`);
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
  const response = await apiClient.post<{ id: string }>("/horse-feedings", {
    ...data,
    stableId,
  });

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
  await apiClient.put(`/horse-feedings/${id}`, updates);
}

/**
 * Delete a horse feeding
 *
 * @param id - Horse feeding ID
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteHorseFeeding(id: string): Promise<void> {
  await apiClient.delete(`/horse-feedings/${id}`);
}
