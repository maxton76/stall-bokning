#!/usr/bin/env ts-node
/**
 * Cleanup script for incomplete horse activity history entries
 *
 * This script identifies and removes incomplete history entries that only have
 * the core fields (id, horseId, routineInstanceId, category) but are missing
 * the detailed fields (stepName, executedAt, etc.)
 *
 * Usage:
 *   ts-node scripts/cleanup-incomplete-history.ts --env dev
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

// Parse command line arguments
const args = process.argv.slice(2);
const envIndex = args.indexOf('--env');
const environment = envIndex >= 0 ? args[envIndex + 1] : 'dev';

console.log(`🔧 Environment: ${environment}`);

// Load service account based on environment
const serviceAccountPath = path.join(
  __dirname,
  '..',
  'packages',
  'api',
  `service-account-${environment}.json`
);

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`❌ Service account file not found: ${serviceAccountPath}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function cleanupIncompleteHistoryEntries() {
  console.log('📋 Fetching all horse activity history entries...');

  const snapshot = await db.collection('horseActivityHistory').get();

  console.log(`📊 Total entries: ${snapshot.size}`);

  let incompleteCount = 0;
  let completeCount = 0;
  const incompleteIds: string[] = [];

  // Check each entry for required fields
  snapshot.docs.forEach((doc) => {
    const data = doc.data();

    // Required fields for a complete entry
    const requiredFields = [
      'stepName',
      'executedAt',
      'executedBy',
      'scheduledDate',
      'routineTemplateName',
      'horseName',
      'organizationId',
      'stableId',
      'routineStepId'
    ];

    const missingFields = requiredFields.filter(field => !data[field]);

    if (missingFields.length > 0) {
      incompleteCount++;
      incompleteIds.push(doc.id);
      console.log(`⚠️  Incomplete entry: ${doc.id}`);
      console.log(`   Missing fields: ${missingFields.join(', ')}`);
      console.log(`   Has fields: ${Object.keys(data).join(', ')}`);
    } else {
      completeCount++;
    }
  });

  console.log('\n📊 Summary:');
  console.log(`   ✅ Complete entries: ${completeCount}`);
  console.log(`   ⚠️  Incomplete entries: ${incompleteCount}`);

  if (incompleteIds.length === 0) {
    console.log('\n✅ No incomplete entries found!');
    return;
  }

  // Ask for confirmation
  console.log(`\n⚠️  About to delete ${incompleteIds.length} incomplete entries.`);
  console.log('   Press Ctrl+C to cancel, or wait 5 seconds to proceed...');

  await new Promise(resolve => setTimeout(resolve, 5000));

  // Delete incomplete entries in batches
  const batchSize = 500;
  let deletedCount = 0;

  for (let i = 0; i < incompleteIds.length; i += batchSize) {
    const batch = db.batch();
    const batchIds = incompleteIds.slice(i, i + batchSize);

    batchIds.forEach(id => {
      batch.delete(db.collection('horseActivityHistory').doc(id));
    });

    await batch.commit();
    deletedCount += batchIds.length;
    console.log(`🗑️  Deleted ${deletedCount}/${incompleteIds.length} incomplete entries...`);
  }

  console.log(`\n✅ Cleanup complete! Deleted ${deletedCount} incomplete entries.`);
  console.log('\n💡 Next steps:');
  console.log('   1. Complete a routine to generate new, complete history entries');
  console.log('   2. Verify entries appear correctly in the app');
}

// Run the cleanup
cleanupIncompleteHistoryEntries()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
