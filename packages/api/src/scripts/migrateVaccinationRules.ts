/**
 * Migration script for converting stable-scoped vaccination rules to organization-scoped
 * Maps: stableId → stable document → ownerId → organization → organizationId
 *
 * Usage: npx tsx packages/api/src/scripts/migrateVaccinationRules.ts
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import * as path from 'path'
import { fileURLToPath } from 'url'

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize Firebase Admin SDK
const serviceAccountPath = path.resolve(__dirname, '../../service-account-dev.json')

try {
  initializeApp({
    credential: cert(serviceAccountPath)
  })
} catch (error) {
  console.log('Firebase Admin already initialized')
}

const db = getFirestore()

/**
 * Migration statistics
 */
interface MigrationStats {
  total: number
  migrated: number
  skipped: number
  errors: number
  errorDetails: Array<{ ruleId: string; error: string }>
}

/**
 * Migrate a single vaccination rule from stable-scoped to organization-scoped
 */
async function migrateRule(ruleId: string, ruleData: any, stats: MigrationStats): Promise<void> {
  try {
    // Check if already migrated (has scope and organizationId)
    if (ruleData.scope === 'organization' && ruleData.organizationId) {
      console.log(`  ✓ Rule "${ruleData.name}" (${ruleId}) already migrated`)
      stats.skipped++
      return
    }

    // Skip system rules
    if (ruleData.scope === 'system' || ruleData.systemWide === true) {
      console.log(`  ✓ Rule "${ruleData.name}" (${ruleId}) is a system rule - skipping`)
      stats.skipped++
      return
    }

    // Get stableId
    const stableId = ruleData.stableId
    if (!stableId) {
      throw new Error('No stableId found on rule')
    }

    // Get stable document to find ownerId
    const stableDoc = await db.collection('stables').doc(stableId).get()
    if (!stableDoc.exists) {
      throw new Error(`Stable ${stableId} not found`)
    }

    const stableData = stableDoc.data()
    const ownerId = stableData?.ownerId
    if (!ownerId) {
      throw new Error(`No ownerId found for stable ${stableId}`)
    }

    // Find organization where this owner is the owner
    const orgsSnapshot = await db.collection('organizations')
      .where('ownerId', '==', ownerId)
      .limit(1)
      .get()

    if (orgsSnapshot.empty) {
      throw new Error(`No organization found for ownerId ${ownerId}`)
    }

    const orgDoc = orgsSnapshot.docs[0]
    const organizationId = orgDoc.id
    const organizationName = orgDoc.data().name

    // Update the vaccination rule
    await db.collection('vaccinationRules').doc(ruleId).update({
      scope: 'organization',
      organizationId,
      updatedAt: Timestamp.now()
      // Keep stableId for backward compatibility (marked as deprecated)
    })

    console.log(`  ✅ Migrated "${ruleData.name}" → Organization: ${organizationName} (${organizationId})`)
    stats.migrated++
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`  ❌ Error migrating rule "${ruleData.name}" (${ruleId}):`, errorMessage)
    stats.errors++
    stats.errorDetails.push({ ruleId, error: errorMessage })
  }
}

/**
 * Main migration function
 */
async function migrateVaccinationRules() {
  console.log('🔄 Starting vaccination rules migration...\n')

  const stats: MigrationStats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    errorDetails: []
  }

  try {
    // Get all vaccination rules
    const rulesSnapshot = await db.collection('vaccinationRules').get()
    stats.total = rulesSnapshot.size

    console.log(`📋 Found ${stats.total} vaccination rules\n`)

    if (stats.total === 0) {
      console.log('✅ No rules to migrate\n')
      return
    }

    // Process each rule
    for (const doc of rulesSnapshot.docs) {
      console.log(`\nProcessing: ${doc.id}`)
      await migrateRule(doc.id, doc.data(), stats)
    }

    // Print summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 Migration Summary:')
    console.log('='.repeat(60))
    console.log(`  Total rules:     ${stats.total}`)
    console.log(`  Migrated:        ${stats.migrated} ✅`)
    console.log(`  Skipped:         ${stats.skipped} ⏭️`)
    console.log(`  Errors:          ${stats.errors} ❌`)
    console.log('='.repeat(60))

    // Print error details if any
    if (stats.errorDetails.length > 0) {
      console.log('\n❌ Error Details:')
      stats.errorDetails.forEach(({ ruleId, error }) => {
        console.log(`  - ${ruleId}: ${error}`)
      })
    }

    if (stats.errors === 0) {
      console.log('\n✅ Migration completed successfully!')
    } else {
      console.log('\n⚠️  Migration completed with errors')
      process.exit(1)
    }
  } catch (error) {
    console.error('\n💥 Fatal error during migration:', error)
    process.exit(1)
  }
}

// Run migration
migrateVaccinationRules()
  .then(() => {
    console.log('\n🎉 Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
