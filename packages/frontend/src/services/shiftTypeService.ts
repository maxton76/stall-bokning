import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { ShiftType } from '@/types/schedule'
import { mapDocsToObjects } from '@/utils/firestoreHelpers'

export async function createShiftType(
  stableId: string,
  shiftTypeData: Omit<ShiftType, 'id' | 'stableId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const shiftTypeRef = await addDoc(collection(db, 'shiftTypes'), {
    ...shiftTypeData,
    stableId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  })
  return shiftTypeRef.id
}

export async function getShiftTypesByStable(stableId: string): Promise<ShiftType[]> {
  const q = query(
    collection(db, 'shiftTypes'),
    where('stableId', '==', stableId)
  )
  const snapshot = await getDocs(q)
  return mapDocsToObjects<ShiftType>(snapshot)
}

export async function getShiftType(shiftTypeId: string): Promise<ShiftType | null> {
  const shiftTypeRef = doc(db, 'shiftTypes', shiftTypeId)
  const shiftTypeSnap = await getDoc(shiftTypeRef)

  if (!shiftTypeSnap.exists()) return null

  return {
    id: shiftTypeSnap.id,
    ...shiftTypeSnap.data()
  } as ShiftType
}

export async function updateShiftType(
  shiftTypeId: string,
  updates: Partial<Omit<ShiftType, 'id' | 'stableId'>>
): Promise<void> {
  const shiftTypeRef = doc(db, 'shiftTypes', shiftTypeId)
  await updateDoc(shiftTypeRef, {
    ...updates,
    updatedAt: Timestamp.now()
  })
}

export async function deleteShiftType(shiftTypeId: string): Promise<void> {
  await deleteDoc(doc(db, 'shiftTypes', shiftTypeId))
}
