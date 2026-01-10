import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { backfillLocationHistory } from '@/services/locationHistoryService'
import type { Horse } from '@/types/roles'

/**
 * Backfill location history for all horses that have a current stable
 * but no location history entry
 */
export async function backfillAllHorsesLocationHistory(userId: string): Promise<void> {
  console.log('🔄 Starting location history backfill...')

  // Get all horses
  const horsesRef = collection(db, 'horses')
  const horsesSnapshot = await getDocs(horsesRef)

  let totalHorses = 0
  let backfilledCount = 0
  let skippedCount = 0
  let errorCount = 0

  for (const horseDoc of horsesSnapshot.docs) {
    totalHorses++
    const horse = { id: horseDoc.id, ...horseDoc.data() } as Horse

    // Skip horses not assigned to a stable
    if (!horse.currentStableId || !horse.currentStableName) {
      console.log(`⏭️  Skipping ${horse.name} - not assigned to a stable`)
      skippedCount++
      continue
    }

    try {
      // Check if location history already exists
      const historyRef = collection(db, 'horses', horse.id, 'locationHistory')
      const historySnapshot = await getDocs(historyRef)

      if (!historySnapshot.empty) {
        console.log(`⏭️  Skipping ${horse.name} - already has location history`)
        skippedCount++
        continue
      }

      // Backfill location history
      await backfillLocationHistory(
        horse.id,
        horse.name,
        horse.currentStableId,
        horse.currentStableName,
        horse.currentStableAssignedAt || horse.createdAt, // Use assignment date or creation date
        userId
      )

      console.log(`✅ Backfilled location history for ${horse.name}`)
      backfilledCount++
    } catch (error) {
      console.error(`❌ Error backfilling ${horse.name}:`, error)
      errorCount++
    }
  }

  console.log('\n📊 Backfill Summary:')
  console.log(`   Total horses: ${totalHorses}`)
  console.log(`   ✅ Backfilled: ${backfilledCount}`)
  console.log(`   ⏭️  Skipped: ${skippedCount}`)
  console.log(`   ❌ Errors: ${errorCount}`)
  console.log('🎉 Location history backfill complete!')
}

/**
 * Backfill location history for a single horse
 */
export async function backfillSingleHorseLocationHistory(
  horseId: string,
  userId: string
): Promise<void> {
  console.log(`🔄 Backfilling location history for horse: ${horseId}`)

  // Get horse data
  const horseDoc = await getDocs(query(collection(db, 'horses'), where('__name__', '==', horseId)))

  if (horseDoc.empty) {
    console.error('❌ Horse not found')
    return
  }

  const horse = { id: horseDoc.docs[0]!.id, ...horseDoc.docs[0]!.data() } as Horse

  if (!horse.currentStableId || !horse.currentStableName) {
    console.log('⏭️  Horse not assigned to a stable')
    return
  }

  // Check if location history already exists
  const historyRef = collection(db, 'horses', horse.id, 'locationHistory')
  const historySnapshot = await getDocs(historyRef)

  if (!historySnapshot.empty) {
    console.log('⏭️  Horse already has location history')
    return
  }

  // Backfill location history
  await backfillLocationHistory(
    horse.id,
    horse.name,
    horse.currentStableId,
    horse.currentStableName,
    horse.currentStableAssignedAt || horse.createdAt,
    userId
  )

  console.log(`✅ Location history backfilled for ${horse.name}`)
}
