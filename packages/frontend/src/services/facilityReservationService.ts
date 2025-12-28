import { createCrudService } from './firestoreCrud'
import { where, Timestamp } from 'firebase/firestore'
import type {
  FacilityReservation,
  CreateReservationData,
  UpdateReservationData
} from '@/types/facilityReservation'

const reservationCrud = createCrudService<FacilityReservation>({
  collectionName: 'facilityReservations',
  timestampsEnabled: true
})

/**
 * Create a new reservation with denormalized data
 */
export async function createReservation(
  reservationData: CreateReservationData,
  userId: string,
  denormalizedData: {
    facilityName: string
    facilityType: import('@/types/facility').FacilityType
    stableId: string
    stableName?: string
    userEmail: string
    userFullName?: string
    horseName?: string
  }
): Promise<string> {
  const fullData = {
    ...reservationData,
    ...denormalizedData,
    status: 'pending' as const
  }

  return reservationCrud.create(userId, fullData)
}

/**
 * Get reservation by ID
 */
export async function getReservation(reservationId: string): Promise<FacilityReservation | null> {
  return reservationCrud.getById(reservationId)
}

/**
 * Get reservations by facility
 */
export async function getReservationsByFacility(facilityId: string): Promise<FacilityReservation[]> {
  return reservationCrud.query([
    where('facilityId', '==', facilityId)
  ])
}

/**
 * Get reservations by user
 */
export async function getUserReservations(userId: string): Promise<FacilityReservation[]> {
  return reservationCrud.query([
    where('userId', '==', userId)
  ])
}

/**
 * Get reservations by stable
 */
export async function getStableReservations(stableId: string): Promise<FacilityReservation[]> {
  return reservationCrud.query([
    where('stableId', '==', stableId)
  ])
}

/**
 * Get reservations by date range
 */
export async function getReservationsByDateRange(
  facilityId: string,
  startDate: Timestamp,
  endDate: Timestamp
): Promise<FacilityReservation[]> {
  return reservationCrud.query([
    where('facilityId', '==', facilityId),
    where('startTime', '>=', startDate),
    where('startTime', '<=', endDate)
  ])
}

/**
 * Update reservation
 */
export async function updateReservation(
  reservationId: string,
  updates: UpdateReservationData,
  userId: string
): Promise<void> {
  return reservationCrud.update(reservationId, userId, updates)
}

/**
 * Cancel reservation
 */
export async function cancelReservation(
  reservationId: string,
  userId: string
): Promise<void> {
  return reservationCrud.update(reservationId, userId, {
    status: 'cancelled'
  })
}

/**
 * Delete reservation
 */
export async function deleteReservation(reservationId: string): Promise<void> {
  return reservationCrud.delete(reservationId)
}

/**
 * Check for conflicting reservations
 */
export async function checkReservationConflicts(
  facilityId: string,
  startTime: Timestamp,
  endTime: Timestamp,
  excludeReservationId?: string
): Promise<FacilityReservation[]> {
  const reservations = await reservationCrud.query([
    where('facilityId', '==', facilityId),
    where('status', 'in', ['pending', 'confirmed'])
  ])

  // Filter for time overlaps
  return reservations.filter(r => {
    if (excludeReservationId && r.id === excludeReservationId) return false

    const rStart = r.startTime.toMillis()
    const rEnd = r.endTime.toMillis()
    const newStart = startTime.toMillis()
    const newEnd = endTime.toMillis()

    return (newStart < rEnd && newEnd > rStart)
  })
}
