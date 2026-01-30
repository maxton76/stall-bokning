/**
 * Quick script to add organizationId to existing stable
 * Run with: npx tsx scripts/fix-stable-org.ts
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

// Firebase emulator configuration
const firebaseConfig = {
  apiKey: "demo-api-key",
  projectId: "equiduty-dev",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Connect to emulator (always connect when using demo project)
const { connectFirestoreEmulator } = await import("firebase/firestore");
connectFirestoreEmulator(db, "127.0.0.1", 5081);
console.log("📡 Connected to Firestore emulator");

async function fixStableOrganization() {
  const stableId = "HlsUJOJJ9UEinWNNwToc";
  const organizationId = "GIlPalwerOdpy1dxouul";

  try {
    console.log(
      `🔧 Updating stable ${stableId} with organizationId: ${organizationId}`,
    );

    const stableRef = doc(db, "stables", stableId);
    await updateDoc(stableRef, {
      organizationId,
    });

    console.log("✅ Successfully updated stable with organizationId");
  } catch (error) {
    console.error("❌ Error updating stable:", error);
    throw error;
  }
}

// Run the fix
fixStableOrganization()
  .then(() => {
    console.log("🎉 Migration complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  });
