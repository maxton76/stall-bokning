import { Timestamp } from "firebase/firestore";
import type {
  FacilityReservation,
  CreateReservationData,
  UpdateReservationData,
} from "@/types/facilityReservation";
import { apiClient } from "@/lib/apiClient";

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

  const response = await apiClient.post<{ id: string }>(
    "/facility-reservations",
    fullData,
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
    return await apiClient.get<FacilityReservation>(
      `/facility-reservations/${reservationId}`,
    );
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
  const response = await apiClient.get<{ reservations: FacilityReservation[] }>(
    "/facility-reservations",
    { facilityId },
  );

  return response.reservations;
}

/**
 * Get reservations by user
 */
export async function getUserReservations(
  userId: string,
): Promise<FacilityReservation[]> {
  const response = await apiClient.get<{ reservations: FacilityReservation[] }>(
    "/facility-reservations",
    { userId },
  );

  return response.reservations;
}

/**
 * Get reservations by stable
 */
export async function getStableReservations(
  stableId: string,
): Promise<FacilityReservation[]> {
  const response = await apiClient.get<{ reservations: FacilityReservation[] }>(
    "/facility-reservations",
    { stableId },
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
  const response = await apiClient.get<{ reservations: FacilityReservation[] }>(
    "/facility-reservations",
    {
      facilityId,
      startDate: startDate.toDate().toISOString(),
      endDate: endDate.toDate().toISOString(),
    },
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
  // Convert Timestamp fields to ISO strings
  const apiUpdates: any = { ...updates };
  if (updates.startTime instanceof Timestamp) {
    apiUpdates.startTime = updates.startTime.toDate().toISOString();
  }
  if (updates.endTime instanceof Timestamp) {
    apiUpdates.endTime = updates.endTime.toDate().toISOString();
  }

  await apiClient.patch(`/facility-reservations/${reservationId}`, apiUpdates);
}

/**
 * Cancel reservation
 */
export async function cancelReservation(
  reservationId: string,
  userId: string,
): Promise<void> {
  await apiClient.post(`/facility-reservations/${reservationId}/cancel`);
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
  await apiClient.post(`/facility-reservations/${reservationId}/approve`, {
    reviewNotes,
  });
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
  await apiClient.post(`/facility-reservations/${reservationId}/reject`, {
    reviewNotes,
  });
}

/**
 * Delete reservation
 */
export async function deleteReservation(reservationId: string): Promise<void> {
  await apiClient.delete(`/facility-reservations/${reservationId}`);
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
  const response = await apiClient.post<{
    conflicts: FacilityReservation[];
    hasConflicts: boolean;
  }>("/facility-reservations/check-conflicts", {
    facilityId,
    startTime: startTime.toDate().toISOString(),
    endTime: endTime.toDate().toISOString(),
    excludeReservationId,
  });

  return response.conflicts;
}
