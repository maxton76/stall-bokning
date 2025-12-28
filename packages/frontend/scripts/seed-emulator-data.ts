import dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

// IMPORTANT: Set emulator host BEFORE importing firebase-admin
if (process.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:5081'
  console.log('🔧 Connecting to Firestore Emulator at localhost:5081\n')
}

import admin from 'firebase-admin'

// Initialize Firebase Admin
const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'stall-bokning-dev'

admin.initializeApp({
  projectId: projectId
})

const db = admin.firestore()

async function seedData() {
  console.log('🌱 Seeding Emulator with Test Data')
  console.log('📅 Started at:', new Date().toISOString())
  console.log('='.repeat(60) + '\n')

  const batch = db.batch()

  // Test Case 1: StableMember WITHOUT users document (the main issue)
  // This is the user from your screenshot: gasnIeYqVpLCtBGi1ESXt37zPtJz
  console.log('📝 Creating Test Case 1: StableMember WITHOUT users document')
  const member1Ref = db.collection('stableMembers').doc('stable1-member1')
  batch.set(member1Ref, {
    userId: 'gasnIeYqVpLCtBGi1ESXt37zPtJz',
    stableId: 'stable1',
    userEmail: 'maxkrax@gmail.com',
    firstName: 'Max',
    lastName: 'Ahston',
    role: 'member',
    status: 'active',
    joinedAt: admin.firestore.Timestamp.now()
  })
  console.log('  ✅ Created stableMember for Max Ahston (no users doc)')

  // Test Case 2: StableMember WITHOUT firstName/lastName (need email parsing)
  console.log('\n📝 Creating Test Case 2: StableMember without names (email parsing test)')
  const member2Ref = db.collection('stableMembers').doc('stable1-member2')
  batch.set(member2Ref, {
    userId: 'user-needs-name-parsing',
    stableId: 'stable1',
    userEmail: 'john.doe@example.com',
    role: 'member',
    status: 'active',
    joinedAt: admin.firestore.Timestamp.now()
  })
  console.log('  ✅ Created stableMember for john.doe@example.com (no names)')

  // Test Case 3: User EXISTS, StableMember has DIFFERENT data (needs sync)
  console.log('\n📝 Creating Test Case 3: User exists, data differs (sync test)')
  const user3Ref = db.collection('users').doc('user-with-different-data')
  batch.set(user3Ref, {
    uid: 'user-with-different-data',
    email: 'jane.smith@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    systemRole: 'member',
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  })
  const member3Ref = db.collection('stableMembers').doc('stable1-member3')
  batch.set(member3Ref, {
    userId: 'user-with-different-data',
    stableId: 'stable1',
    userEmail: 'jane.smith.old@example.com', // Different email
    firstName: 'Janet', // Different name
    lastName: 'Smithson', // Different name
    role: 'member',
    status: 'active',
    joinedAt: admin.firestore.Timestamp.now()
  })
  console.log('  ✅ Created user Jane Smith')
  console.log('  ✅ Created stableMember Janet Smithson (different data)')

  // Test Case 4: User EXISTS, StableMember data MATCHES (already in sync)
  console.log('\n📝 Creating Test Case 4: Already in sync (no changes needed)')
  const user4Ref = db.collection('users').doc('user-already-synced')
  batch.set(user4Ref, {
    uid: 'user-already-synced',
    email: 'bob.jones@example.com',
    firstName: 'Bob',
    lastName: 'Jones',
    systemRole: 'member',
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  })
  const member4Ref = db.collection('stableMembers').doc('stable1-member4')
  batch.set(member4Ref, {
    userId: 'user-already-synced',
    stableId: 'stable1',
    userEmail: 'bob.jones@example.com',
    firstName: 'Bob',
    lastName: 'Jones',
    role: 'manager',
    status: 'active',
    joinedAt: admin.firestore.Timestamp.now()
  })
  console.log('  ✅ Created user Bob Jones')
  console.log('  ✅ Created stableMember Bob Jones (already synced)')

  // Commit all changes
  console.log('\n⚡ Committing batch...')
  await batch.commit()

  console.log('\n' + '='.repeat(60))
  console.log('✅ Seed Complete!')
  console.log('='.repeat(60))
  console.log(`
📊 Test Data Summary:
- 4 stableMembers created
- 2 users documents created

Test Cases:
1. ❌ StableMember WITHOUT users (Max Ahston) → Should CREATE users
2. ❌ StableMember WITHOUT names → Should CREATE users with parsed names
3. 🔄 User exists, data differs → Should SYNC from users to stableMember
4. ✅ Already in sync → Should SKIP (no changes)

Expected Migration Results:
✅ Users Created:     2 (cases 1 & 2)
✅ Members Synced:    1 (case 3)
✓  Already in Sync:   1 (case 4)
  `)

  console.log('📅 Completed at:', new Date().toISOString())
  console.log('='.repeat(60))
}

// Execute seeding
seedData()
  .then(() => {
    console.log('\n✨ Seeding finished successfully!')
    console.log('💡 Now run: npm run migrate:sync-users')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Seeding failed:', error)
    console.error(error.stack)
    process.exit(1)
  })
