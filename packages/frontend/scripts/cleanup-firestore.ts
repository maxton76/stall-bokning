/**
 * Cleanup Firestore Emulator Data
 *
 * Deletes all documents from all collections in the Firestore emulator.
 *
 * Usage:
 *   FIRESTORE_EMULATOR_HOST=localhost:5081 npx tsx scripts/cleanup-firestore.ts
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

// All collections to clean
const collections = [
  "users",
  "vaccinationRules",
  "contacts",
  "organizations",
  "organizationMembers",
  "invites",
  "stables",
  "stableMembers",
  "horseGroups",
  "horses",
  "activityTypes",
  "activities",
  "vaccinationRecords",
  "facilities",
  "facilityReservations",
  "shiftTypes",
  "schedules",
  "shifts",
  "auditLogs",
];

async function deleteCollection(collectionName: string) {
  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    console.log(`   ⏭️  ${collectionName}: already empty`);
    return 0;
  }

  const batchSize = 500;
  let deletedCount = 0;

  // Delete in batches
  while (true) {
    const batch = db.batch();
    const docs = await collectionRef.limit(batchSize).get();

    if (docs.empty) break;

    docs.forEach((doc) => {
      batch.delete(doc.ref);
      deletedCount++;
    });

    await batch.commit();
  }

  console.log(`   ✅ ${collectionName}: deleted ${deletedCount} documents`);
  return deletedCount;
}

async function deleteSubcollections() {
  console.log("\n📝 Cleaning subcollections...");

  // Delete locationHistory subcollection under horses
  const horsesSnapshot = await db.collection("horses").get();
  let totalDeleted = 0;

  for (const horseDoc of horsesSnapshot.docs) {
    const locationHistoryRef = horseDoc.ref.collection("locationHistory");
    const locationDocs = await locationHistoryRef.get();

    if (!locationDocs.empty) {
      const batch = db.batch();
      locationDocs.forEach((doc) => {
        batch.delete(doc.ref);
        totalDeleted++;
      });
      await batch.commit();
    }
  }

  if (totalDeleted > 0) {
    console.log(`   ✅ locationHistory: deleted ${totalDeleted} documents`);
  } else {
    console.log(`   ⏭️  locationHistory: already empty`);
  }

  return totalDeleted;
}

async function cleanupFirestore() {
  console.log("🗑️  Starting Firestore Cleanup");
  console.log("=".repeat(60));
  console.log(`📅 Started at: ${new Date().toISOString()}\n`);

  const startTime = Date.now();
  let totalDeleted = 0;

  try {
    // First, delete subcollections
    const subcollectionCount = await deleteSubcollections();
    totalDeleted += subcollectionCount;

    // Then delete main collections
    console.log("\n📝 Cleaning main collections...");
    for (const collectionName of collections) {
      const count = await deleteCollection(collectionName);
      totalDeleted += count;
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n" + "=".repeat(60));
    console.log("✅ CLEANUP COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   Duration: ${duration}s`);
    console.log(`   Collections cleaned: ${collections.length}`);
    console.log(`   Documents deleted: ${totalDeleted}`);
    console.log(`\n📅 Completed at: ${new Date().toISOString()}`);
  } catch (error) {
    console.error("\n❌ Cleanup failed:", error);
    throw error;
  }
}

// Run cleanup
cleanupFirestore()
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  });
