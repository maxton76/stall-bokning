/**
 * Check if user and organization were created properly
 */

import dotenv from "dotenv";
import admin from "firebase-admin";

dotenv.config({ path: ".env.local" });

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

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || "equiduty-dev";

if (!admin.apps.length) {
  admin.initializeApp({ projectId });
}

const db = admin.firestore();
const auth = admin.auth();

async function checkUserAndOrg() {
  const orgId = "HgUJXscI1FsUugxnzV98";

  console.log("\n📋 Checking Organization:", orgId);
  console.log("=".repeat(60));

  // Check organization
  const orgDoc = await db.collection("organizations").doc(orgId).get();
  if (orgDoc.exists) {
    console.log("\n✅ Organization exists");
    const orgData = orgDoc.data();
    console.log("   Owner ID:", orgData?.ownerId);
    console.log("   Name:", orgData?.name);
    console.log("   Stats:", JSON.stringify(orgData?.stats, null, 2));
  } else {
    console.log("\n❌ Organization does NOT exist");
    return;
  }

  // Check organization members
  const members = await db
    .collection("organizationMembers")
    .where("organizationId", "==", orgId)
    .get();

  console.log("\n👥 Organization Members:", members.size);
  if (members.empty) {
    console.log("   ❌ NO MEMBERS FOUND - This is the problem!");
  } else {
    members.forEach((doc) => {
      const data = doc.data();
      console.log(`\n   ✅ Member: ${doc.id}`);
      console.log("      User ID:", data.userId);
      console.log("      Email:", data.userEmail);
      console.log("      Roles:", data.roles);
      console.log("      Status:", data.status);
    });
  }

  // Check users collection
  const orgData = orgDoc.data();
  if (orgData?.ownerId) {
    console.log("\n👤 Checking Owner User Document:", orgData.ownerId);
    const userDoc = await db.collection("users").doc(orgData.ownerId).get();
    if (userDoc.exists) {
      console.log("   ✅ User document exists");
      const userData = userDoc.data();
      console.log("      Email:", userData?.email);
      console.log("      Name:", userData?.firstName, userData?.lastName);
      console.log("      System Role:", userData?.systemRole);
    } else {
      console.log("   ❌ User document does NOT exist - This is the problem!");
    }

    // Check Auth user
    try {
      const authUser = await auth.getUser(orgData.ownerId);
      console.log("\n   ✅ Firebase Auth user exists");
      console.log("      Email:", authUser.email);
      console.log("      Display Name:", authUser.displayName);
    } catch (error) {
      console.log("\n   ❌ Firebase Auth user does NOT exist");
    }
  }
}

checkUserAndOrg()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n💥 Error:", error);
    process.exit(1);
  });
