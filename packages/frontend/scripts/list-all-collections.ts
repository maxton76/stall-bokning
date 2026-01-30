import dotenv from "dotenv";
import admin from "firebase-admin";

dotenv.config({ path: ".env.local" });

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || "equiduty-dev";
admin.initializeApp({ projectId });
const db = admin.firestore();

if (process.env.VITE_USE_FIREBASE_EMULATOR === "true") {
  process.env.FIRESTORE_EMULATOR_HOST = "localhost:5081";
}

async function listAllCollections() {
  console.log("📂 Listing ALL Firestore Collections\n");

  const collections = await db.listCollections();
  console.log(`Found ${collections.length} root collections:\n`);

  for (const collection of collections) {
    console.log(`📁 ${collection.id}`);
    const snapshot = await collection.limit(10).get();
    console.log(`   Documents: ${snapshot.size}`);

    if (snapshot.size > 0) {
      console.log(`   Sample document IDs:`);
      snapshot.docs.slice(0, 3).forEach((doc) => {
        console.log(`   - ${doc.id}`);
      });
    }
    console.log("");
  }
}

listAllCollections()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
