import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore'

// Firebase configuration
// TODO: Replace with actual Firebase config or import from shared config
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function migrateStableMembersAddNames() {
  console.log('🔍 Starting stableMember name migration...')
  console.log('📅 Started at:', new Date().toISOString())

  const membersRef = collection(db, 'stableMembers')
  const snapshot = await getDocs(membersRef)

  let updated = 0
  let skipped = 0
  let failed = 0
  let alreadyHasNames = 0

  console.log(`📊 Found ${snapshot.docs.length} stableMember documents\n`)

  for (const memberDoc of snapshot.docs) {
    const data = memberDoc.data()

    // Skip if already has names
    if (data.firstName && data.lastName) {
      alreadyHasNames++
      continue
    }

    try {
      // Fetch user document to get firstName/lastName
      const userRef = doc(db, 'users', data.userId)
      const userSnap = await getDoc(userRef)

      if (userSnap.exists()) {
        const userData = userSnap.data()

        if (userData.firstName && userData.lastName) {
          await updateDoc(memberDoc.ref, {
            firstName: userData.firstName,
            lastName: userData.lastName
          })
          console.log(`  ✅ Updated ${memberDoc.id}: ${userData.firstName} ${userData.lastName}`)
          updated++
        } else {
          console.warn(`  ⚠️  User ${data.userId} has no firstName/lastName`)
          skipped++
        }
      } else {
        console.warn(`  ⚠️  User ${data.userId} not found`)
        skipped++
      }
    } catch (error) {
      console.error(`  ❌ Failed to update ${memberDoc.id}:`, error)
      failed++
    }
  }

  console.log(`\n📊 Migration Complete:`)
  console.log(`   ✅ Updated: ${updated}`)
  console.log(`   ✓  Already had names: ${alreadyHasNames}`)
  console.log(`   ⏭️  Skipped: ${skipped}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log(`   📝 Total: ${snapshot.docs.length}`)
  console.log(`📅 Completed at: ${new Date().toISOString()}`)
}

migrateStableMembersAddNames()
  .then(() => {
    console.log('\n✨ Migration finished successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error)
    process.exit(1)
  })
