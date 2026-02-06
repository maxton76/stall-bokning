#!/usr/bin/env npx ts-node

/**
 * One-time migration script to expand `manage_billing` into 8 granular
 * billing permissions in organizations that have a custom permission matrix.
 *
 * For each org with a stored `permissionMatrix` containing `manage_billing`:
 *   - Every role that had `manage_billing: true` receives all 8 new billing
 *     permissions (view_invoices, manage_invoices, view_payments, manage_payments,
 *     manage_billing_settings, view_financial_reports, manage_prices, manage_billing_groups).
 *   - The `manage_billing` key is removed from the stored matrix.
 *
 * Organizations WITHOUT a custom matrix are unaffected — they automatically
 * get the new defaults via the `getEffectiveMatrix()` merge logic.
 *
 * Run with:
 *   npx ts-node scripts/migrate-billing-permissions.ts
 *   ENV=staging npx ts-node scripts/migrate-billing-permissions.ts
 *   ENV=staging DRY_RUN=true npx ts-node scripts/migrate-billing-permissions.ts
 */

import * as admin from "firebase-admin";
import * as path from "path";

// ============================================
// Configuration
// ============================================

const env = process.env.ENV || "dev";
const dryRun = process.env.DRY_RUN === "true";
const projectId = `equiduty-${env}`;

const serviceAccountPath = path.resolve(
  __dirname,
  `../packages/api/service-account-${env}.json`,
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
  projectId,
});

const db = admin.firestore();

/**
 * The 8 new granular billing permissions that replace `manage_billing`.
 */
const NEW_BILLING_PERMISSIONS = [
  "view_invoices",
  "manage_invoices",
  "view_payments",
  "manage_payments",
  "manage_billing_settings",
  "view_financial_reports",
  "manage_prices",
  "manage_billing_groups",
] as const;

// ============================================
// Migration logic
// ============================================

async function migrateBillingPermissions() {
  console.log(`\n🚀 Billing permissions migration for project: ${projectId}`);
  if (dryRun) {
    console.log("⚠️  DRY RUN — no changes will be written\n");
  } else {
    console.log("");
  }

  // Query all organizations (we need to check for permissionMatrix field)
  const orgsSnapshot = await db.collection("organizations").get();

  console.log(`Found ${orgsSnapshot.size} total organizations\n`);

  let migratedCount = 0;
  let skippedNoMatrix = 0;
  let skippedNoBilling = 0;
  let errorCount = 0;

  let batch = db.batch();
  const batchLimit = 500;
  let currentBatchCount = 0;

  for (const doc of orgsSnapshot.docs) {
    const orgData = doc.data();
    const matrix = orgData.permissionMatrix;

    // Skip orgs without a custom matrix
    if (!matrix) {
      skippedNoMatrix++;
      continue;
    }

    // Skip orgs whose matrix doesn't contain manage_billing
    const manageBillingEntry = matrix.manage_billing;
    if (!manageBillingEntry) {
      skippedNoBilling++;
      continue;
    }

    // Find roles that had manage_billing: true
    const rolesWithBilling = Object.entries(manageBillingEntry)
      .filter(([, granted]) => granted === true)
      .map(([role]) => role);

    if (rolesWithBilling.length === 0) {
      skippedNoBilling++;
      continue;
    }

    console.log(
      `  📋 ${doc.id}: expanding manage_billing for roles: ${rolesWithBilling.join(", ")}`,
    );

    // Build the update: for each new permission, grant to the same roles
    const updates: Record<string, any> = {};

    for (const perm of NEW_BILLING_PERMISSIONS) {
      // Preserve any existing grants for this permission
      const existingEntry = matrix[perm] || {};
      const merged = { ...existingEntry };

      for (const role of rolesWithBilling) {
        merged[role] = true;
      }

      updates[`permissionMatrix.${perm}`] = merged;
    }

    // Remove the old manage_billing key
    updates["permissionMatrix.manage_billing"] =
      admin.firestore.FieldValue.delete();
    updates["updatedAt"] = admin.firestore.FieldValue.serverTimestamp();

    if (!dryRun) {
      try {
        batch.update(doc.ref, updates);
        currentBatchCount++;

        if (currentBatchCount >= batchLimit) {
          await batch.commit();
          console.log(
            `\n📦 Committed batch of ${currentBatchCount} updates\n`,
          );
          batch = db.batch();
          currentBatchCount = 0;
        }
      } catch (error: any) {
        errorCount++;
        console.error(`  ❌ Error updating ${doc.id}: ${error.message}`);
        continue;
      }
    }

    migratedCount++;
  }

  // Commit remaining batch
  if (!dryRun && currentBatchCount > 0) {
    await batch.commit();
    console.log(`\n📦 Committed final batch of ${currentBatchCount} updates`);
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Migration Complete!${dryRun ? " (DRY RUN)" : ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Total organizations:   ${orgsSnapshot.size}
  Migrated:              ${migratedCount}
  Skipped (no matrix):   ${skippedNoMatrix}
  Skipped (no billing):  ${skippedNoBilling}
  Errors:                ${errorCount}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

// Run
migrateBillingPermissions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
