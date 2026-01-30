import type {
  Facility,
  CreateFacilityData,
  UpdateFacilityData,
} from "@/types/facility";
import { apiClient } from "@/lib/apiClient";

/**
 * Create a new facility
 */
export async function createFacility(
  stableId: string,
  facilityData: CreateFacilityData,
  userId: string,
): Promise<string> {
  const response = await apiClient.post<{ id: string }>("/facilities", {
    stableId,
    ...facilityData,
  });

  return response.id;
}

/**
 * Get facility by ID
 */
export async function getFacility(
  facilityId: string,
): Promise<Facility | null> {
  try {
    return await apiClient.get<Facility>(`/facilities/${facilityId}`);
  } catch (error: any) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Get all facilities for a stable
 */
export async function getFacilitiesByStable(
  stableId: string,
): Promise<Facility[]> {
  const response = await apiClient.get<{ facilities: Facility[] }>(
    "/facilities",
    { stableId },
  );

  return response.facilities;
}

/**
 * Get active facilities for a stable
 */
export async function getActiveFacilities(
  stableId: string,
): Promise<Facility[]> {
  const response = await apiClient.get<{ facilities: Facility[] }>(
    "/facilities",
    { stableId, status: "active" },
  );

  return response.facilities;
}

/**
 * Update facility
 */
export async function updateFacility(
  facilityId: string,
  updates: UpdateFacilityData,
  userId: string,
): Promise<void> {
  await apiClient.patch(`/facilities/${facilityId}`, updates);
}

/**
 * Delete facility
 */
export async function deleteFacility(
  facilityId: string,
  _userId?: string,
): Promise<void> {
  await apiClient.delete(`/facilities/${facilityId}`);
}
