import dotenv from "dotenv";
import admin from "firebase-admin";

dotenv.config({ path: ".env.local" });

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || "equiduty-dev";
admin.initializeApp({ projectId });
const db = admin.firestore();

if (process.env.VITE_USE_FIREBASE_EMULATOR === "true") {
  process.env.FIRESTORE_EMULATOR_HOST = "localhost:5081";
  console.log("🔧 Connected to Firestore Emulator at localhost:5081\n");
}

async function checkFirestore() {
  console.log("📊 Checking Firestore Collections\n");
  console.log("=".repeat(60));

  // Check stableMembers
  console.log("\n📁 stableMembers Collection:");
  console.log("-".repeat(60));
  const membersSnap = await db.collection("stableMembers").get();
  console.log(`Total documents: ${membersSnap.docs.length}\n`);

  if (membersSnap.docs.length > 0) {
    membersSnap.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`[${index + 1}] Document ID: ${doc.id}`);
      console.log(`    userId: ${data.userId}`);
      console.log(`    email: ${data.userEmail || "N/A"}`);
      console.log(
        `    name: ${data.firstName || "N/A"} ${data.lastName || "N/A"}`,
      );
      console.log(`    stableId: ${data.stableId || "N/A"}`);
      console.log(`    stableName: ${data.stableName || "N/A"}`);
      console.log("");
    });
  } else {
    console.log("  ❌ No documents found");
  }

  // Check users
  console.log("\n📁 users Collection:");
  console.log("-".repeat(60));
  const usersSnap = await db.collection("users").get();
  console.log(`Total documents: ${usersSnap.docs.length}\n`);

  if (usersSnap.docs.length > 0) {
    usersSnap.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`[${index + 1}] Document ID: ${doc.id}`);
      console.log(`    email: ${data.email}`);
      console.log(`    name: ${data.firstName} ${data.lastName}`);
      console.log(`    systemRole: ${data.systemRole}`);
      console.log("");
    });
  } else {
    console.log("  ❌ No documents found");
  }

  console.log("=".repeat(60));
}

checkFirestore()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
