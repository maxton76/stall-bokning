/**
 * Diagnostic Script: List Organizations and Stables
 *
 * Lists all organizations and stables to verify IDs
 *
 * Usage:
 *   - With emulators: FIRESTORE_EMULATOR_HOST=localhost:8080 npx tsx packages/api/src/scripts/listOrganizations.ts
 *   - Production: npx tsx packages/api/src/scripts/listOrganizations.ts
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if using emulators
const useEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || "localhost:8080";
const serviceAccountPath = path.resolve(
  __dirname,
  "../../service-account-dev.json",
);

let db: FirebaseFirestore.Firestore;

try {
  if (useEmulator) {
    console.log(`🔧 Using Firebase Emulator at ${emulatorHost}\n`);
    process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
    const app = initializeApp({
      projectId: "equiduty-dev",
    });
    db = getFirestore(app);
  } else {
    console.log("🌐 Using production Firebase\n");
    const app = initializeApp({
      credential: cert(serviceAccountPath),
    });
    db = getFirestore(app);
  }
  console.log("✅ Firebase Admin SDK initialized\n");
} catch (error) {
  console.error("❌ Error initializing Firebase Admin SDK:", error);
  process.exit(1);
}

async function listData() {
  // List organizations
  console.log("📋 Organizations:");
  const orgsSnapshot = await db.collection("organizations").get();

  if (orgsSnapshot.empty) {
    console.log("   No organizations found");
  } else {
    orgsSnapshot.forEach((doc) => {
      const org = doc.data();
      console.log(`   ID: ${doc.id}`);
      console.log(`   Name: ${org.name}`);
      console.log(`   Owner: ${org.ownerId}`);
      console.log(`   Stable Count: ${org.stats?.stableCount || 0}`);
      console.log();
    });
  }

  // List stables
  console.log("\n📋 Stables:");
  const stablesSnapshot = await db.collection("stables").get();

  if (stablesSnapshot.empty) {
    console.log("   No stables found");
  } else {
    stablesSnapshot.forEach((doc) => {
      const stable = doc.data();
      console.log(`   ID: ${doc.id}`);
      console.log(`   Name: ${stable.name}`);
      console.log(`   Owner: ${stable.ownerId}`);
      console.log(`   Organization: ${stable.organizationId || "None"}`);
      console.log();
    });
  }
}

listData()
  .then(() => {
    console.log("\n✅ Done");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
