/**
 * Initialize Feature Toggles in Firestore
 *
 * This script creates the global feature toggles document with all features.
 * Run this once per environment to set up the feature toggle system.
 *
 * Usage:
 *   npm run init:feature-toggles
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { FeatureToggleMap } from "@equiduty/shared";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const serviceAccountPath = path.resolve(
  __dirname,
  "../service-account-dev.json"
);

initializeApp({
  credential: cert(serviceAccountPath),
});

const db = getFirestore();

/**
 * Feature toggle definitions
 * All existing module flags default to enabled for backward compatibility
 * New features default to disabled for gradual rollout
 */
const featureToggles: FeatureToggleMap = {
  // Primary Features (Main Menu Items)
  lessons: {
    key: "lessons",
    enabled: true,
    name: "Lessons",
    description: "Lesson management system with scheduling and instructor tracking",
    category: "primary",
    rolloutPhase: "general",
  },
  invoicing: {
    key: "invoicing",
    enabled: true,
    name: "Invoicing",
    description:
      "Full financial management suite including invoices, payments, and billing",
    category: "primary",
    rolloutPhase: "general",
  },

  // Secondary Features (Administration Menu Items)
  trainerCommission: {
    key: "trainerCommission",
    enabled: false,
    name: "Trainer Commission",
    description: "Instructor fee tracking and commission calculations",
    category: "secondary",
    dependsOn: "lessons",
    rolloutPhase: "internal",
  },
  leaveManagement: {
    key: "leaveManagement",
    enabled: true,
    name: "Leave Management",
    description: "Employee vacation and leave tracking system",
    category: "secondary",
    rolloutPhase: "general",
  },
  integrations: {
    key: "integrations",
    enabled: true,
    name: "Integrations",
    description: "Third-party integrations and API connections",
    category: "secondary",
    rolloutPhase: "general",
  },
  manure: {
    key: "manure",
    enabled: true,
    name: "Manure Management",
    description: "Manure removal scheduling and tracking",
    category: "secondary",
    rolloutPhase: "general",
  },
  chargeableItems: {
    key: "chargeableItems",
    enabled: false,
    name: "Chargeable Items",
    description: "Billable items catalog for invoice line items",
    category: "secondary",
    rolloutPhase: "internal",
  },
  billingGroups: {
    key: "billingGroups",
    enabled: false,
    name: "Billing Groups",
    description: "Group customers for batch invoicing and payment management",
    category: "secondary",
    rolloutPhase: "internal",
  },
};

async function initializeFeatureToggles() {
  try {
    console.log("🚀 Initializing feature toggles...");

    const docRef = db.doc("featureToggles/global");

    // Check if document already exists
    const doc = await docRef.get();
    if (doc.exists) {
      console.warn(
        "⚠️  Feature toggles document already exists. Skipping initialization."
      );
      console.log(
        "   Use updateFeatureToggle API to modify existing toggles."
      );
      process.exit(0);
    }

    // Create document
    await docRef.set(featureToggles);

    console.log("✅ Feature toggles initialized successfully!");
    console.log(`   Created ${Object.keys(featureToggles).length} feature toggles`);
    console.log("\n📊 Feature Toggle Summary:");

    // Show enabled/disabled counts
    const enabled = Object.values(featureToggles).filter((t) => t.enabled);
    const disabled = Object.values(featureToggles).filter((t) => !t.enabled);

    console.log(`   Enabled: ${enabled.length}`);
    console.log(`   Disabled: ${disabled.length}`);

    console.log("\n🔓 Enabled Features:");
    enabled.forEach((t) => {
      console.log(`   - ${t.name} (${t.key})`);
    });

    console.log("\n🔒 Disabled Features:");
    disabled.forEach((t) => {
      console.log(`   - ${t.name} (${t.key})`);
    });

    console.log(
      "\n💡 Next steps:\n   1. Deploy API with feature toggle routes\n   2. Use admin UI to manage toggles\n   3. Enable features for beta organizations as needed"
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error initializing feature toggles:", error);
    process.exit(1);
  }
}

// Run initialization
initializeFeatureToggles();
