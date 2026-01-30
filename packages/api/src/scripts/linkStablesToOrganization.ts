/**
 * Migration Script: Link Existing Stables to Organization
 *
 * This script links specific stables to their parent organization:
 * - Stable IDs: 5lu8Irn4UMngdpFCcQ1d, A2N94bFJry4devCSyO1F
 * - Organization ID: HgUJXscI1FsUugxnzV98
 *
 * The script is idempotent - safe to run multiple times.
 *
 * Usage:
 *   - With emulators: FIRESTORE_EMULATOR_HOST=localhost:8080 npx tsx packages/api/src/scripts/linkStablesToOrganization.ts
 *   - Production: npx tsx packages/api/src/scripts/linkStablesToOrganization.ts
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if using emulators
const useEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || "localhost:8080";

// Initialize Firebase Admin SDK
const serviceAccountPath = path.resolve(
  __dirname,
  "../../service-account-dev.json",
);

let db: FirebaseFirestore.Firestore;

try {
  if (useEmulator) {
    console.log(`🔧 Using Firebase Emulator at ${emulatorHost}`);
    process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
    const app = initializeApp({
      projectId: "equiduty-dev",
    });
    db = getFirestore(app);
  } else {
    console.log("🌐 Using production Firebase");
    const app = initializeApp({
      credential: cert(serviceAccountPath),
    });
    db = getFirestore(app);
  }
  console.log("✅ Firebase Admin SDK initialized successfully");
} catch (error) {
  console.error("❌ Error initializing Firebase Admin SDK:", error);
  process.exit(1);
}

// Configuration
const ORGANIZATION_ID = "HgUJXscI1FsUugxnzV98";
const STABLE_IDS = ["5lu8Irn4UMngdpFCcQ1d", "A2N94bFJry4devCSyO1F"];

export async function linkStablesToOrganization() {
  console.log("🚀 Starting stable-to-organization linkage migration...\n");

  // 1. Validate organization exists
  console.log(`🔍 Validating organization ${ORGANIZATION_ID}...`);
  const orgDoc = await db
    .collection("organizations")
    .doc(ORGANIZATION_ID)
    .get();

  if (!orgDoc.exists) {
    console.error(`❌ Organization ${ORGANIZATION_ID} does not exist`);
    process.exit(1);
  }

  const organization = orgDoc.data();
  console.log(`✅ Organization found: ${organization?.name}`);

  // 2. Validate stables exist and check current state
  console.log("\n🔍 Validating stables...");
  const stableData: { id: string; name: string; currentOrgId?: string }[] = [];

  for (const stableId of STABLE_IDS) {
    const stableDoc = await db.collection("stables").doc(stableId).get();

    if (!stableDoc.exists) {
      console.error(`❌ Stable ${stableId} does not exist`);
      process.exit(1);
    }

    const stable = stableDoc.data();
    stableData.push({
      id: stableId,
      name: stable?.name || "Unknown",
      currentOrgId: stable?.organizationId,
    });

    console.log(`   📋 Stable: ${stable?.name} (${stableId})`);
    console.log(
      `      Current organizationId: ${stable?.organizationId || "None"}`,
    );
  }

  // 3. Check if migration is needed (idempotency)
  const alreadyLinked = stableData.filter(
    (s) => s.currentOrgId === ORGANIZATION_ID,
  );
  const needsLinking = stableData.filter(
    (s) => s.currentOrgId !== ORGANIZATION_ID,
  );

  if (alreadyLinked.length > 0) {
    console.log("\n⏭️  Some stables already linked to this organization:");
    alreadyLinked.forEach((s) => console.log(`   ✅ ${s.name} (${s.id})`));
  }

  if (needsLinking.length === 0) {
    console.log("\n✨ All stables already linked. No migration needed.");
    return;
  }

  console.log("\n📝 Stables to be linked:");
  needsLinking.forEach((s) => console.log(`   🔗 ${s.name} (${s.id})`));

  // 4. Update stable documents with organizationId
  console.log("\n🔄 Linking stables to organization...");
  let linkedCount = 0;
  let errorCount = 0;

  for (const stable of needsLinking) {
    try {
      await db.collection("stables").doc(stable.id).update({
        organizationId: ORGANIZATION_ID,
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log(`   ✅ Linked: ${stable.name} (${stable.id})`);
      linkedCount++;
    } catch (error) {
      console.error(
        `   ❌ Error linking ${stable.name} (${stable.id}):`,
        error,
      );
      errorCount++;
    }
  }

  // 5. Count total stables in organization
  console.log("\n📊 Counting stables in organization...");
  const orgStablesSnapshot = await db
    .collection("stables")
    .where("organizationId", "==", ORGANIZATION_ID)
    .get();

  const totalStableCount = orgStablesSnapshot.size;
  console.log(`   Found ${totalStableCount} stable(s) in organization`);

  // 6. Update organization stats
  console.log("\n🔄 Updating organization stats...");
  try {
    await db.collection("organizations").doc(ORGANIZATION_ID).update({
      "stats.stableCount": totalStableCount,
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(
      `   ✅ Organization stats updated: stableCount = ${totalStableCount}`,
    );
  } catch (error) {
    console.error("   ❌ Error updating organization stats:", error);
    errorCount++;
  }

  // 7. Verify updates succeeded
  console.log("\n🔍 Verifying migration...");
  const verifyStablesSnapshot = await db
    .collection("stables")
    .where("organizationId", "==", ORGANIZATION_ID)
    .get();

  const verifyOrgDoc = await db
    .collection("organizations")
    .doc(ORGANIZATION_ID)
    .get();
  const verifyOrg = verifyOrgDoc.data();

  console.log("\n📈 Migration Results:");
  console.log(`   ✅ Linked: ${linkedCount}`);
  console.log(`   ⏭️  Already linked: ${alreadyLinked.length}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(
    `   📊 Total stables in organization: ${verifyStablesSnapshot.size}`,
  );
  console.log(
    `   📊 Organization stableCount: ${verifyOrg?.stats?.stableCount || 0}`,
  );

  // Final validation
  if (
    verifyStablesSnapshot.size === STABLE_IDS.length &&
    verifyOrg?.stats?.stableCount === STABLE_IDS.length
  ) {
    console.log("\n✨ Migration completed successfully!");
  } else {
    console.log(
      "\n⚠️  Migration completed with warnings. Please verify manually.",
    );
  }
}

// Run migration automatically when script is executed
linkStablesToOrganization()
  .then(() => {
    console.log("\n✅ Migration script finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Migration script failed:", error);
    process.exit(1);
  });
