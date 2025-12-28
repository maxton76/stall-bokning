import dotenv from 'dotenv'
import { promises as fs } from 'fs'
import { parseEmailToName } from '../src/lib/nameUtils.js'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

// IMPORTANT: Set emulator host BEFORE importing firebase-admin
if (process.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:5081'
  console.log('🔧 Connecting to Firestore Emulator at localhost:5081\n')
}

import admin from 'firebase-admin'

// Initialize Firebase Admin (bypasses security rules)
const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'stall-bokning-dev'

admin.initializeApp({
  projectId: projectId
})

const db = admin.firestore()

interface UserData {
  uid: string
  email: string
  firstName: string
  lastName: string
  systemRole: 'system_admin' | 'stable_owner' | 'member'
  createdAt: admin.firestore.Timestamp
  updatedAt: admin.firestore.Timestamp
}

interface StableMemberData {
  id: string
  userId: string
  stableId: string
  userEmail?: string
  firstName?: string
  lastName?: string
  role: string
  status: string
  joinedAt: admin.firestore.Timestamp
}

interface MigrationStats {
  usersCreated: number
  membersSynced: number
  alreadyInSync: number
  errors: number
  warnings: string[]
}

/**
 * Backup a Firestore collection to JSON file
 */
async function backupCollection(collectionName: string): Promise<void> {
  console.log(`📦 Backing up ${collectionName} collection...`)

  const snapshot = await db.collection(collectionName).get()
  const data = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `scripts/backup/${collectionName}-backup-${timestamp}.json`

  await fs.writeFile(filename, JSON.stringify(data, null, 2))
  console.log(`✅ Backup created: ${filename} (${data.length} documents)\n`)
}

/**
 * Check if sync is needed between user and stableMember
 */
function needsSync(user: UserData, member: StableMemberData): boolean {
  return (
    user.firstName !== member.firstName ||
    user.lastName !== member.lastName ||
    user.email !== member.userEmail
  )
}

/**
 * Sync stableMember data from user (source of truth)
 */
function syncMemberFromUser(
  user: UserData,
  memberRef: admin.firestore.DocumentReference,
  batch: admin.firestore.WriteBatch
): void {
  batch.update(memberRef, {
    firstName: user.firstName,
    lastName: user.lastName,
    userEmail: user.email
  })
}

/**
 * Create user document from stableMember data
 */
function createUserFromMember(
  member: StableMemberData,
  batch: admin.firestore.WriteBatch,
  stats: MigrationStats
): void {
  let firstName: string
  let lastName: string

  if (member.firstName && member.lastName) {
    // Use existing cached data
    firstName = member.firstName
    lastName = member.lastName
    console.log(`  📝 Using cached name: ${firstName} ${lastName}`)
  } else if (member.userEmail) {
    // Parse email using utility
    const parsed = parseEmailToName(member.userEmail)
    const parts = parsed.split(' ')
    firstName = parts[0] || 'Unknown'
    lastName = parts.slice(1).join(' ') || 'User'
    stats.warnings.push(`Parsed name from email for ${member.userId}: ${member.userEmail} → ${firstName} ${lastName}`)
    console.log(`  ⚙️  Parsed from email: ${member.userEmail} → ${firstName} ${lastName}`)
  } else {
    firstName = 'Unknown'
    lastName = 'User'
    stats.warnings.push(`No name data available for ${member.userId}, using default`)
    console.log(`  ⚠️  No name data, using defaults`)
  }

  const userDoc = {
    uid: member.userId,
    email: member.userEmail || '',
    firstName,
    lastName,
    systemRole: 'member' as const,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  }

  batch.set(db.collection('users').doc(member.userId), userDoc)
}

/**
 * Main migration function
 */
async function migrate(): Promise<void> {
  console.log('🚀 Starting Users ↔ StableMembers Sync Migration')
  console.log('📅 Started at:', new Date().toISOString())
  console.log('=' .repeat(60) + '\n')

  // Phase 1: Backup
  console.log('📦 PHASE 1: Creating Backups')
  console.log('-'.repeat(60))
  await backupCollection('users')
  await backupCollection('stableMembers')

  // Phase 2: Fetch data
  console.log('📊 PHASE 2: Fetching Data')
  console.log('-'.repeat(60))

  const usersSnap = await db.collection('users').get()
  const membersSnap = await db.collection('stableMembers').get()

  console.log(`✅ Fetched ${usersSnap.docs.length} user documents`)
  console.log(`✅ Fetched ${membersSnap.docs.length} stableMember documents\n`)

  // Build user map for fast lookups
  const userMap = new Map<string, UserData>()
  usersSnap.forEach(doc => {
    userMap.set(doc.id, doc.data() as UserData)
  })

  // Initialize statistics
  const stats: MigrationStats = {
    usersCreated: 0,
    membersSynced: 0,
    alreadyInSync: 0,
    errors: 0,
    warnings: []
  }

  // Phase 3 & 4: Process stableMembers
  console.log('🔄 PHASE 3 & 4: Processing StableMembers')
  console.log('-'.repeat(60))

  let batch = db.batch()
  let batchCount = 0
  let processedCount = 0

  for (const memberDoc of membersSnap.docs) {
    const member = memberDoc.data() as StableMemberData
    member.id = memberDoc.id
    const user = userMap.get(member.userId)

    processedCount++
    console.log(`\n[${processedCount}/${membersSnap.docs.length}] Processing member: ${member.id}`)
    console.log(`  UserId: ${member.userId}`)
    console.log(`  Email: ${member.userEmail || 'N/A'}`)

    try {
      if (!user) {
        // CREATE: User document doesn't exist
        console.log(`  ❌ User document not found - creating...`)
        createUserFromMember(member, batch, stats)
        stats.usersCreated++
        batchCount++
      } else {
        // SYNC: Check if data needs updating
        if (needsSync(user, member)) {
          console.log(`  🔄 Data mismatch - syncing from user document`)
          console.log(`     User: ${user.firstName} ${user.lastName}`)
          console.log(`     Member: ${member.firstName || 'N/A'} ${member.lastName || 'N/A'}`)
          syncMemberFromUser(user, memberDoc.ref, batch)
          stats.membersSynced++
          batchCount++
        } else {
          console.log(`  ✅ Already in sync`)
          stats.alreadyInSync++
        }
      }

      // Commit batch every 500 operations (Firestore limit)
      if (batchCount >= 500) {
        console.log(`\n⚡ Committing batch (${batchCount} operations)...`)
        await batch.commit()
        batch = db.batch()
        batchCount = 0
      }
    } catch (error) {
      console.error(`  ❌ Failed to process ${memberDoc.id}:`, error)
      stats.errors++
    }
  }

  // Final batch commit
  if (batchCount > 0) {
    console.log(`\n⚡ Committing final batch (${batchCount} operations)...`)
    await batch.commit()
  }

  // Phase 5: Report
  console.log('\n' + '='.repeat(60))
  console.log('📊 PHASE 5: Migration Report')
  console.log('='.repeat(60))
  console.log(`
✅ Users Created:     ${stats.usersCreated}
✅ Members Synced:    ${stats.membersSynced}
✓  Already in Sync:   ${stats.alreadyInSync}
❌ Errors:            ${stats.errors}

📝 Total Processed:   ${membersSnap.docs.length}
  `)

  if (stats.warnings.length > 0) {
    console.log('⚠️  Warnings:')
    stats.warnings.forEach((warning, index) => {
      console.log(`   ${index + 1}. ${warning}`)
    })
    console.log('')
  }

  console.log('📅 Completed at:', new Date().toISOString())
  console.log('='.repeat(60))
}

// Execute migration
migrate()
  .then(() => {
    console.log('\n✨ Migration finished successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error)
    console.error(error.stack)
    process.exit(1)
  })
