#!/usr/bin/env npx ts-node

/**
 * One-time migration script to update personal organizations with:
 * - displayName: "Privat"
 * - hideWhenEmpty: true
 *
 * Run with: npx ts-node scripts/migrate-personal-orgs.ts
 * Or: task migrate:personal-orgs
 */

import * as admin from "firebase-admin";
import * as path from "path";

// Determine environment from ENV or default to dev
const env = process.env.ENV || "dev";
const projectId = `equiduty-${env}`;

// Initialize Firebase Admin
const serviceAccountPath = path.resolve(
  __dirname,
  `../packages/api/service-account-${env}.json`
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
  projectId,
});

const db = admin.firestore();

async function migratePersonalOrgs() {
  console.log(`\n🚀 Starting migration for project: ${projectId}\n`);

  // Get all personal organizations
  const personalOrgsSnapshot = await db
    .collection("organizations")
    .where("organizationType", "==", "personal")
    .get();

  console.log(`Found ${personalOrgsSnapshot.size} personal organizations\n`);

  if (personalOrgsSnapshot.empty) {
    console.log("No personal organizations to migrate.");
    return;
  }

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  let batch = db.batch();
  const batchLimit = 500;
  let currentBatchCount = 0;

  for (const doc of personalOrgsSnapshot.docs) {
    const orgData = doc.data();

    // Skip if already has displayName set
    if (orgData.displayName) {
      console.log(`  ⏭️  Skipping ${doc.id} (already has displayName)`);
      skippedCount++;
      continue;
    }

    try {
      batch.update(doc.ref, {
        displayName: "Privat",
        hideWhenEmpty: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      currentBatchCount++;
      migratedCount++;
      console.log(`  ✅ Queued ${doc.id} for update`);

      // Commit batch if we hit the limit
      if (currentBatchCount >= batchLimit) {
        await batch.commit();
        console.log(`\n📦 Committed batch of ${currentBatchCount} updates\n`);
        // Create new batch after commit - previous batch is consumed
        batch = db.batch();
        currentBatchCount = 0;
      }
    } catch (error: any) {
      errorCount++;
      console.error(`  ❌ Error updating ${doc.id}: ${error.message}`);
    }
  }

  // Commit any remaining updates
  if (currentBatchCount > 0) {
    await batch.commit();
    console.log(`\n📦 Committed final batch of ${currentBatchCount} updates`);
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Migration Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Total found:  ${personalOrgsSnapshot.size}
  Migrated:     ${migratedCount}
  Skipped:      ${skippedCount}
  Errors:       ${errorCount}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

// Run migration
migratePersonalOrgs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
