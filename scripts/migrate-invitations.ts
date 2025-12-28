import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore'

// Initialize Firebase with your config
// TODO: Replace with actual Firebase config or import from shared config
const firebaseConfig = {
  // Add your Firebase configuration here
  // This should match the config in packages/frontend/src/lib/firebase.ts
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function migrateInvitations() {
  console.log('🔍 Starting invitation migration...')

  const invitesRef = collection(db, 'invites')
  const snapshot = await getDocs(invitesRef)

  let fixed = 0
  let skipped = 0
  let failed = 0

  for (const inviteDoc of snapshot.docs) {
    const data = inviteDoc.data()
    const updates: any = {}
    let needsUpdate = false

    // Fix missing stableName
    if (!data.stableName && data.stableId) {
      try {
        const stableDoc = await getDoc(doc(db, 'stables', data.stableId))
        if (stableDoc.exists()) {
          updates.stableName = stableDoc.data().name
          needsUpdate = true
          console.log(`  ℹ️  Found stableName for ${inviteDoc.id}: ${updates.stableName}`)
        } else {
          console.warn(`  ⚠️  Stable ${data.stableId} not found for invitation ${inviteDoc.id}`)
          failed++
          continue
        }
      } catch (error) {
        console.error(`  ❌ Error fetching stable for ${inviteDoc.id}:`, error)
        failed++
        continue
      }
    }

    // Fix missing role (default to 'member')
    if (!data.role) {
      updates.role = 'member'
      needsUpdate = true
      console.log(`  ℹ️  Defaulting role to 'member' for ${inviteDoc.id}`)
    }

    // Apply updates
    if (needsUpdate) {
      try {
        await updateDoc(doc(db, 'invites', inviteDoc.id), updates)
        fixed++
        console.log(`  ✅ Fixed ${inviteDoc.id}`)
      } catch (error) {
        console.error(`  ❌ Failed to update ${inviteDoc.id}:`, error)
        failed++
      }
    } else {
      skipped++
    }
  }

  console.log(`\n📊 Migration Complete:`)
  console.log(`   ✅ Fixed: ${fixed}`)
  console.log(`   ⏭️  Skipped: ${skipped}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log(`   📝 Total: ${snapshot.docs.length}`)
}

migrateInvitations()
  .then(() => {
    console.log('\n✨ Migration finished successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error)
    process.exit(1)
  })
