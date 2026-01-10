import { Timestamp } from "firebase/firestore";
import type {
  FacilityReservation,
  CreateReservationData,
  UpdateReservationData,
} from "@/types/facilityReservation";

/**
 * Create a new reservation with denormalized data
 */
export async function createReservation(
  reservationData: CreateReservationData,
  userId: string,
  denormalizedData: {
    facilityName: string;
    facilityType: import("@/types/facility").FacilityType;
    stableId: string;
    stableName?: string;
    userEmail: string;
    userFullName?: string;
    horseName?: string;
  },
): Promise<string> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const fullData = {
    ...reservationData,
    ...denormalizedData,
    // Convert Timestamp to ISO string for API
    startTime:
      reservationData.startTime instanceof Timestamp
        ? reservationData.startTime.toDate().toISOString()
        : reservationData.startTime,
    endTime:
      reservationData.endTime instanceof Timestamp
        ? reservationData.endTime.toDate().toISOString()
        : reservationData.endTime,
  };

  const response = await authFetchJSON<{ id: string }>(
    `${import.meta.env.VITE_API_URL}/api/v1/facility-reservations`,
    {
      method: "POST",
      body: JSON.stringify(fullData),
    },
  );

  return response.id;
}

/**
 * Get reservation by ID
 */
export async function getReservation(
  reservationId: string,
): Promise<FacilityReservation | null> {
  try {
    const { authFetchJSON } = await import("@/utils/authFetch");

    const reservation = await authFetchJSON<FacilityReservation>(
      `${import.meta.env.VITE_API_URL}/api/v1/facility-reservations/${reservationId}`,
      { method: "GET" },
    );

    return reservation;
  } catch (error: any) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Get reservations by facility
 */
export async function getReservationsByFacility(
  facilityId: string,
): Promise<FacilityReservation[]> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const response = await authFetchJSON<{ reservations: FacilityReservation[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/facility-reservations?facilityId=${facilityId}`,
    { method: "GET" },
  );

  return response.reservations;
}

/**
 * Get reservations by user
 */
export async function getUserReservations(
  userId: string,
): Promise<FacilityReservation[]> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const response = await authFetchJSON<{ reservations: FacilityReservation[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/facility-reservations?userId=${userId}`,
    { method: "GET" },
  );

  return response.reservations;
}

/**
 * Get reservations by stable
 */
export async function getStableReservations(
  stableId: string,
): Promise<FacilityReservation[]> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const response = await authFetchJSON<{ reservations: FacilityReservation[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/facility-reservations?stableId=${stableId}`,
    { method: "GET" },
  );

  return response.reservations;
}

/**
 * Get reservations by date range
 */
export async function getReservationsByDateRange(
  facilityId: string,
  startDate: Timestamp,
  endDate: Timestamp,
): Promise<FacilityReservation[]> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const startISO = startDate.toDate().toISOString();
  const endISO = endDate.toDate().toISOString();

  const response = await authFetchJSON<{ reservations: FacilityReservation[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/facility-reservations?facilityId=${facilityId}&startDate=${startISO}&endDate=${endISO}`,
    { method: "GET" },
  );

  return response.reservations;
}

/**
 * Update reservation
 */
export async function updateReservation(
  reservationId: string,
  updates: UpdateReservationData,
  userId: string,
): Promise<void> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  // Convert Timestamp fields to ISO strings
  const apiUpdates: any = { ...updates };
  if (updates.startTime instanceof Timestamp) {
    apiUpdates.startTime = updates.startTime.toDate().toISOString();
  }
  if (updates.endTime instanceof Timestamp) {
    apiUpdates.endTime = updates.endTime.toDate().toISOString();
  }

  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/facility-reservations/${reservationId}`,
    {
      method: "PATCH",
      body: JSON.stringify(apiUpdates),
    },
  );
}

/**
 * Cancel reservation
 */
export async function cancelReservation(
  reservationId: string,
  userId: string,
): Promise<void> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/facility-reservations/${reservationId}/cancel`,
    { method: "POST" },
  );
}

/**
 * Approve a pending reservation
 * @param reservationId - Reservation ID
 * @param reviewerId - User ID of the reviewer (admin/owner)
 * @param reviewerName - Name of the reviewer
 * @param reviewerEmail - Email of the reviewer
 * @param reviewNotes - Optional notes about the approval
 * @returns Promise that resolves when approval is complete
 */
export async function approveReservation(
  reservationId: string,
  reviewerId: string,
  reviewerName: string,
  reviewerEmail: string,
  reviewNotes?: string,
): Promise<void> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/facility-reservations/${reservationId}/approve`,
    {
      method: "POST",
      body: JSON.stringify({ reviewNotes }),
    },
  );
}

/**
 * Reject a pending reservation
 * @param reservationId - Reservation ID
 * @param reviewerId - User ID of the reviewer (admin/owner)
 * @param reviewerName - Name of the reviewer
 * @param reviewerEmail - Email of the reviewer
 * @param reviewNotes - Optional notes about the rejection
 * @returns Promise that resolves when rejection is complete
 */
export async function rejectReservation(
  reservationId: string,
  reviewerId: string,
  reviewerName: string,
  reviewerEmail: string,
  reviewNotes?: string,
): Promise<void> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/facility-reservations/${reservationId}/reject`,
    {
      method: "POST",
      body: JSON.stringify({ reviewNotes }),
    },
  );
}

/**
 * Delete reservation
 */
export async function deleteReservation(reservationId: string): Promise<void> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/facility-reservations/${reservationId}`,
    { method: "DELETE" },
  );
}

/**
 * Check for conflicting reservations
 */
export async function checkReservationConflicts(
  facilityId: string,
  startTime: Timestamp,
  endTime: Timestamp,
  excludeReservationId?: string,
): Promise<FacilityReservation[]> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const response = await authFetchJSON<{
    conflicts: FacilityReservation[];
    hasConflicts: boolean;
  }>(
    `${import.meta.env.VITE_API_URL}/api/v1/facility-reservations/check-conflicts`,
    {
      method: "POST",
      body: JSON.stringify({
        facilityId,
        startTime: startTime.toDate().toISOString(),
        endTime: endTime.toDate().toISOString(),
        excludeReservationId,
      }),
    },
  );

  return response.conflicts;
}
