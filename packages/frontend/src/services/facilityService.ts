import type {
  Facility,
  CreateFacilityData,
  UpdateFacilityData,
  TimeBlock,
  ScheduleException,
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
  options?: { reservableOnly?: boolean },
): Promise<Facility[]> {
  const params: Record<string, string> = { stableId };

  if (options?.reservableOnly) {
    params.reservableOnly = "true";
  }

  const response = await apiClient.get<{ facilities: Facility[] }>(
    "/facilities",
    params,
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

/**
 * Get available time slots for a facility on a specific date
 */
export async function getAvailableSlots(
  facilityId: string,
  date: string,
): Promise<{ date: string; timeBlocks: TimeBlock[] }> {
  return apiClient.get(`/facilities/${facilityId}/available-slots`, { date });
}

/**
 * Add a schedule exception to a facility
 */
export async function addScheduleException(
  facilityId: string,
  exception: {
    date: string;
    type: "closed" | "modified";
    timeBlocks?: TimeBlock[];
    reason?: string;
  },
): Promise<{ success: boolean; exception: ScheduleException }> {
  return apiClient.post(`/facilities/${facilityId}/exceptions`, exception);
}

/**
 * Remove a schedule exception
 */
export async function removeScheduleException(
  facilityId: string,
  date: string,
): Promise<void> {
  await apiClient.delete(`/facilities/${facilityId}/exceptions/${date}`);
}
