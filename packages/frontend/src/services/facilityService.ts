import type {
  Facility,
  CreateFacilityData,
  UpdateFacilityData,
} from "@/types/facility";
import { authFetchJSON } from "@/utils/authFetch";

/**
 * Create a new facility
 */
export async function createFacility(
  stableId: string,
  facilityData: CreateFacilityData,
  userId: string,
): Promise<string> {
  const response = await authFetchJSON<{ id: string }>(
    `${import.meta.env.VITE_API_URL}/api/v1/facilities`,
    {
      method: "POST",
      body: JSON.stringify({
        stableId,
        ...facilityData,
      }),
    },
  );

  return response.id;
}

/**
 * Get facility by ID
 */
export async function getFacility(
  facilityId: string,
): Promise<Facility | null> {
  try {
    const facility = await authFetchJSON<Facility>(
      `${import.meta.env.VITE_API_URL}/api/v1/facilities/${facilityId}`,
      { method: "GET" },
    );

    return facility;
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
  const response = await authFetchJSON<{ facilities: Facility[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/facilities?stableId=${stableId}`,
    { method: "GET" },
  );

  return response.facilities;
}

/**
 * Get active facilities for a stable
 */
export async function getActiveFacilities(
  stableId: string,
): Promise<Facility[]> {
  const response = await authFetchJSON<{ facilities: Facility[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/facilities?stableId=${stableId}&status=active`,
    { method: "GET" },
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
  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/facilities/${facilityId}`,
    {
      method: "PATCH",
      body: JSON.stringify(updates),
    },
  );
}

/**
 * Delete facility (soft delete by setting status)
 */
export async function deleteFacility(
  facilityId: string,
  userId: string,
): Promise<void> {
  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/facilities/${facilityId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status: "inactive" }),
    },
  );
}

/**
 * Hard delete facility
 */
export async function hardDeleteFacility(facilityId: string): Promise<void> {
  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/facilities/${facilityId}`,
    { method: "DELETE" },
  );
}
