import { collection, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

/**
 * One-time migration to fix old location history entries
 * - Adds locationType field to entries that don't have it
 * - Closes orphaned open entries (entries with no departureDate when horse is elsewhere)
 */
export async function migrateLocationHistory(horseId: string): Promise<void> {
  console.log(`Migrating location history for horse: ${horseId}`)

  const historyRef = collection(db, 'horses', horseId, 'locationHistory')
  const snapshot = await getDocs(historyRef)

  const entries = snapshot.docs.map(doc => ({
    id: doc.id,
    ref: doc.ref,
    data: doc.data()
  }))

  // Sort by arrivalDate
  entries.sort((a, b) => {
    const aTime = a.data.arrivalDate?.toMillis() || 0
    const bTime = b.data.arrivalDate?.toMillis() || 0
    return aTime - bTime
  })

  console.log(`Found ${entries.length} location history entries`)

  // Find entries that need migration
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const updates: any = {}
    let needsUpdate = false

    // Add locationType if missing
    if (!entry.data.locationType) {
      if (entry.data.stableId) {
        updates.locationType = 'stable'
        needsUpdate = true
        console.log(`  Entry ${i}: Adding locationType=stable`)
      } else if (entry.data.externalLocation) {
        updates.locationType = 'external'
        needsUpdate = true
        console.log(`  Entry ${i}: Adding locationType=external`)
      }
    }

    // Close orphaned open entries (not the last entry)
    if (!entry.data.departureDate && i < entries.length - 1) {
      // This entry should be closed - set departure to the next entry's arrival
      const nextEntry = entries[i + 1]
      updates.departureDate = nextEntry.data.arrivalDate
      needsUpdate = true
      console.log(`  Entry ${i}: Closing with departureDate from next entry`)
    }

    if (needsUpdate) {
      await updateDoc(entry.ref, updates)
      console.log(`  Entry ${i}: Updated successfully`)
    }
  }

  console.log('Migration complete!')
}

/**
 * Migrate all horses location history
 */
export async function migrateAllLocationHistory(horseIds: string[]): Promise<void> {
  console.log(`Migrating location history for ${horseIds.length} horses...`)

  for (const horseId of horseIds) {
    try {
      await migrateLocationHistory(horseId)
    } catch (error) {
      console.error(`Failed to migrate horse ${horseId}:`, error)
    }
  }

  console.log('All migrations complete!')
}
