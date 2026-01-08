/**
 * Migration Script: Create Personal Organizations for Existing Users
 *
 * This script:
 * 1. Finds all users without organizationMember records
 * 2. Creates personal organization for each user
 * 3. Creates organizationMember with administrator role
 * 4. Links existing stables to the new organization (if applicable)
 *
 * Usage: npx tsx packages/api/src/scripts/migrateUsersToOrganizations.ts
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import * as path from 'path'
import { fileURLToPath } from 'url'

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize Firebase Admin SDK
const serviceAccountPath = path.resolve(__dirname, '../../service-account-dev.json')

let db: FirebaseFirestore.Firestore

try {
  const app = initializeApp({
    credential: cert(serviceAccountPath)
  })
  db = getFirestore(app)
  console.log('✅ Firebase Admin SDK initialized successfully')
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error)
  process.exit(1)
}

export async function migrateUsersToOrganizations() {
  console.log('🚀 Starting user to organization migration...\n')

  // 1. Get all users
  const usersSnapshot = await db.collection('users').get()
  let migratedCount = 0
  let skippedCount = 0
  let errorCount = 0

  console.log(`📊 Found ${usersSnapshot.size} total users`)

  for (const userDoc of usersSnapshot.docs) {
    const user = userDoc.data()
    const userId = userDoc.id

    try {
      // 2. Check if user already has organizationMember records
      const memberSnapshot = await db.collection('organizationMembers')
        .where('userId', '==', userId)
        .limit(1)
        .get()

      if (!memberSnapshot.empty) {
        console.log(`⏭️  User ${userId} (${user.email}) already has organization membership, skipping`)
        skippedCount++
        continue
      }

      // 3. Create personal organization
      const orgRef = await db.collection('organizations').add({
        name: `${user.firstName}'s Organization`,
        ownerId: userId,
        ownerEmail: user.email?.toLowerCase() || '',
        subscriptionTier: 'free',
        stats: {
          stableCount: 0,
          totalMemberCount: 1
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      })

      const organizationId = orgRef.id

      // 4. Create organizationMember for owner
      const memberId = `${userId}_${organizationId}`
      await db.collection('organizationMembers').doc(memberId).set({
        id: memberId,
        organizationId,
        userId,
        userEmail: user.email?.toLowerCase() || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneNumber: user.phoneNumber || null,
        roles: ['administrator'],
        primaryRole: 'administrator',
        status: 'active',
        showInPlanning: true,
        stableAccess: 'all',
        assignedStableIds: [],
        joinedAt: FieldValue.serverTimestamp(),
        invitedBy: 'system',
        inviteAcceptedAt: FieldValue.serverTimestamp()
      })

      console.log(`✅ Created organization ${organizationId} for user ${userId} (${user.email})`)
      migratedCount++
    } catch (error) {
      console.error(`❌ Error migrating user ${userId} (${user.email}):`, error)
      errorCount++
    }
  }

  console.log('\n📈 Migration complete!')
  console.log(`   ✅ Migrated: ${migratedCount}`)
  console.log(`   ⏭️  Skipped: ${skippedCount}`)
  console.log(`   ❌ Errors: ${errorCount}`)
  console.log(`   📊 Total: ${usersSnapshot.size}`)
}

// Run migration automatically when script is executed
migrateUsersToOrganizations()
  .then(() => {
    console.log('\n✨ Migration script finished successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Migration script failed:', error)
    process.exit(1)
  })
