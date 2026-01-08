import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type {
  VaccinationRecord,
  VaccinationStatus,
  VaccinationStatusResult
} from '@shared/types/vaccination'
import type { Horse } from '@/types/roles'
import type { VaccinationRule } from '@shared/types/organization'

/**
 * Vaccination Service
 * Manages vaccination records and status calculations for horses
 */

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new vaccination record
 */
export async function createVaccinationRecord(
  data: Omit<VaccinationRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<VaccinationRecord> {
  try {
    const now = Timestamp.now()
    const recordData = {
      ...data,
      createdAt: now,
      updatedAt: now
    }

    const docRef = await addDoc(collection(db, 'vaccinationRecords'), recordData)

    // Update horse's vaccination cache
    await updateHorseVaccinationCache(data.horseId)

    return {
      id: docRef.id,
      ...recordData
    }
  } catch (error) {
    console.error('Error creating vaccination record:', error)
    throw new Error('Failed to create vaccination record')
  }
}

/**
 * Update an existing vaccination record
 */
export async function updateVaccinationRecord(
  id: string,
  updates: Partial<VaccinationRecord>
): Promise<void> {
  try {
    const recordRef = doc(db, 'vaccinationRecords', id)
    const recordDoc = await getDoc(recordRef)

    if (!recordDoc.exists()) {
      throw new Error('Vaccination record not found')
    }

    const updateData = {
      ...updates,
      updatedAt: Timestamp.now()
    }

    await updateDoc(recordRef, updateData)

    // Update horse's vaccination cache if the record's horseId is available
    const record = recordDoc.data() as VaccinationRecord
    await updateHorseVaccinationCache(record.horseId)
  } catch (error) {
    console.error('Error updating vaccination record:', error)
    throw new Error('Failed to update vaccination record')
  }
}

/**
 * Delete a vaccination record
 */
export async function deleteVaccinationRecord(id: string): Promise<void> {
  try {
    const recordRef = doc(db, 'vaccinationRecords', id)
    const recordDoc = await getDoc(recordRef)

    if (!recordDoc.exists()) {
      throw new Error('Vaccination record not found')
    }

    const record = recordDoc.data() as VaccinationRecord
    await deleteDoc(recordRef)

    // Update horse's vaccination cache
    await updateHorseVaccinationCache(record.horseId)
  } catch (error) {
    console.error('Error deleting vaccination record:', error)
    throw new Error('Failed to delete vaccination record')
  }
}

/**
 * Get all vaccination records for a specific horse
 */
export async function getHorseVaccinationRecords(horseId: string): Promise<VaccinationRecord[]> {
  try {
    const q = query(
      collection(db, 'vaccinationRecords'),
      where('horseId', '==', horseId),
      orderBy('vaccinationDate', 'desc')
    )

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as VaccinationRecord[]
  } catch (error) {
    console.error('Error fetching horse vaccination records:', error)
    throw new Error('Failed to fetch vaccination records')
  }
}

/**
 * Get all vaccination records for an organization
 */
export async function getOrganizationVaccinationRecords(
  organizationId: string
): Promise<VaccinationRecord[]> {
  try {
    const q = query(
      collection(db, 'vaccinationRecords'),
      where('organizationId', '==', organizationId),
      orderBy('vaccinationDate', 'desc')
    )

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as VaccinationRecord[]
  } catch (error) {
    console.error('Error fetching organization vaccination records:', error)
    throw new Error('Failed to fetch vaccination records')
  }
}

// ============================================================================
// Status Calculation
// ============================================================================

/**
 * Get vaccination status for a horse
 * Returns real-time status based on vaccination records and rules
 */
export async function getVaccinationStatus(horse: Horse): Promise<VaccinationStatusResult> {
  // No rule assigned
  if (!horse.vaccinationRuleId) {
    return {
      status: 'no_rule',
      message: 'No vaccination rule assigned'
    }
  }

  // Rule assigned but no records
  if (!horse.lastVaccinationDate) {
    return {
      status: 'no_records',
      message: 'Vaccination due - no records found',
      vaccinationRuleName: horse.vaccinationRuleName
    }
  }

  // Calculate days until due
  const today = new Date()
  const nextDue = horse.nextVaccinationDue!.toDate()
  const daysUntilDue = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  // Status determination
  if (daysUntilDue < 0) {
    return {
      status: 'expired',
      message: `Vaccination overdue by ${Math.abs(daysUntilDue)} days`,
      daysUntilDue,
      lastVaccinationDate: horse.lastVaccinationDate,
      nextDueDate: horse.nextVaccinationDue,
      vaccinationRuleName: horse.vaccinationRuleName
    }
  } else if (daysUntilDue <= 30) {
    return {
      status: 'expiring_soon',
      message: `Vaccination due in ${daysUntilDue} days`,
      daysUntilDue,
      lastVaccinationDate: horse.lastVaccinationDate,
      nextDueDate: horse.nextVaccinationDue,
      vaccinationRuleName: horse.vaccinationRuleName
    }
  } else {
    return {
      status: 'current',
      message: `Vaccination current - next due in ${daysUntilDue} days`,
      daysUntilDue,
      lastVaccinationDate: horse.lastVaccinationDate,
      nextDueDate: horse.nextVaccinationDue,
      vaccinationRuleName: horse.vaccinationRuleName
    }
  }
}

/**
 * Check if a horse's vaccination is current
 */
export async function isVaccinationCurrent(horse: Horse): Promise<boolean> {
  const status = await getVaccinationStatus(horse)
  return status.status === 'current'
}

/**
 * Get days until next vaccination is due
 * Returns null if no vaccination rule or records
 * Returns negative number if overdue
 */
export async function getDaysUntilVaccinationDue(horse: Horse): Promise<number | null> {
  const status = await getVaccinationStatus(horse)
  return status.daysUntilDue ?? null
}

/**
 * Calculate next due date based on vaccination date and rule
 */
export function calculateNextDueDate(
  vaccinationDate: Timestamp,
  rule: VaccinationRule
): Timestamp {
  const date = vaccinationDate.toDate()

  // Add period months
  date.setMonth(date.getMonth() + rule.periodMonths)

  // Add period days
  date.setDate(date.getDate() + rule.periodDays)

  return Timestamp.fromDate(date)
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Update horse's cached vaccination fields
 * Should be called after any vaccination record changes
 */
export async function updateHorseVaccinationCache(horseId: string): Promise<void> {
  try {
    // Get most recent vaccination record
    const records = await getHorseVaccinationRecords(horseId)

    const horseRef = doc(db, 'horses', horseId)

    if (records.length === 0) {
      // No records - clear cached fields
      await updateDoc(horseRef, {
        lastVaccinationDate: null,
        nextVaccinationDue: null,
        vaccinationStatus: 'no_records',
        updatedAt: Timestamp.now()
      })
      return
    }

    // Get most recent record
    const latestRecord = records[0]

    // Calculate status
    const horseDoc = await getDoc(horseRef)
    if (!horseDoc.exists()) {
      throw new Error('Horse not found')
    }

    const horse = { id: horseDoc.id, ...horseDoc.data() } as Horse

    // Update with latest vaccination info
    const updatedHorse = {
      ...horse,
      lastVaccinationDate: latestRecord.vaccinationDate,
      nextVaccinationDue: latestRecord.nextDueDate
    }

    const status = await getVaccinationStatus(updatedHorse)

    // Update horse document
    await updateDoc(horseRef, {
      lastVaccinationDate: latestRecord.vaccinationDate,
      nextVaccinationDue: latestRecord.nextDueDate,
      vaccinationStatus: status.status,
      updatedAt: Timestamp.now()
    })
  } catch (error) {
    console.error('Error updating horse vaccination cache:', error)
    // Don't throw - cache update failures shouldn't block operations
  }
}

/**
 * Get horses with vaccinations expiring soon
 */
export async function getExpiringSoon(
  organizationId: string,
  days: number = 30
): Promise<Horse[]> {
  try {
    const now = new Date()
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)

    const q = query(
      collection(db, 'horses'),
      where('nextVaccinationDue', '>=', Timestamp.fromDate(now)),
      where('nextVaccinationDue', '<=', Timestamp.fromDate(futureDate))
    )

    const querySnapshot = await getDocs(q)
    const horses = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Horse[]

    // Filter by organization (via stable or owner)
    // This is a simplified version - may need enhancement based on actual data structure
    return horses
  } catch (error) {
    console.error('Error fetching expiring vaccinations:', error)
    throw new Error('Failed to fetch expiring vaccinations')
  }
}
