/**
 * List Firestore Collections
 *
 * Lists all collections in the Firestore emulator to verify what exists.
 *
 * Usage:
 *   FIRESTORE_EMULATOR_HOST=localhost:5081 npx tsx scripts/list-collections.ts
 */

import dotenv from "dotenv";
import admin from "firebase-admin";

// Load environment variables
dotenv.config({ path: ".env.local" });

// Set emulator host BEFORE importing firebase-admin
if (
  process.env.VITE_USE_FIREBASE_EMULATOR === "true" ||
  process.env.FIRESTORE_EMULATOR_HOST
) {
  process.env.FIRESTORE_EMULATOR_HOST =
    process.env.FIRESTORE_EMULATOR_HOST || "localhost:5081";
  console.log(
    "🔧 Connecting to Firestore Emulator at",
    process.env.FIRESTORE_EMULATOR_HOST,
  );
}

// Initialize Firebase Admin
const projectId = process.env.VITE_FIREBASE_PROJECT_ID || "equiduty-dev";

if (!admin.apps.length) {
  admin.initializeApp({ projectId });
}

const db = admin.firestore();

async function listCollections() {
  console.log("📋 Listing Firestore Collections");
  console.log("=".repeat(60));
  console.log(`📅 Timestamp: ${new Date().toISOString()}\n`);

  try {
    const collections = await db.listCollections();

    console.log(`\n📊 Found ${collections.length} collections:\n`);

    if (collections.length === 0) {
      console.log("   ⚠️  No collections found in the emulator");
    } else {
      for (const collection of collections) {
        // Get document count for each collection
        const snapshot = await db.collection(collection.id).get();
        console.log(`   ✅ ${collection.id} (${snapshot.size} documents)`);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`📊 Total: ${collections.length} collections`);
  } catch (error) {
    console.error("\n❌ Failed to list collections:", error);
    throw error;
  }
}

// Run listing
listCollections()
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  });
