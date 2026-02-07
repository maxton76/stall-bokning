/**
 * Initialize Feature Toggles in Firestore
 *
 * This script creates the global feature toggles document with all features.
 * Run this once per environment to set up the feature toggle system.
 *
 * Usage:
 *   npm run init:feature-toggles              # defaults to dev
 *   npm run init:feature-toggles -- --env staging
 *   npm run init:feature-toggles -- --env prod
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { FeatureToggleMap } from "@equiduty/shared";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse --env argument
const validEnvs = ["dev", "staging", "prod"] as const;
type Env = (typeof validEnvs)[number];

function getEnv(): Env {
  const envIndex = process.argv.indexOf("--env");
  if (envIndex === -1 || !process.argv[envIndex + 1]) {
    return "dev";
  }
  const env = process.argv[envIndex + 1] as Env;
  if (!validEnvs.includes(env)) {
    console.error(`❌ Invalid environment: ${env}`);
    console.error(`   Valid environments: ${validEnvs.join(", ")}`);
    process.exit(1);
  }
  return env;
}

const env = getEnv();
const serviceAccountPath = path.resolve(
  __dirname,
  `../service-account-${env}.json`,
);

console.log(`🌍 Environment: ${env}`);

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
  rideLessons: {
    key: "rideLessons",
    enabled: true,
    name: "Ride Lessons",
    description:
      "Lesson management with scheduling, instructor tracking, bookings, and trainer commissions",
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
        "⚠️  Feature toggles document already exists. Skipping initialization.",
      );
      console.log("   Use updateFeatureToggle API to modify existing toggles.");
      process.exit(0);
    }

    // Create document
    await docRef.set(featureToggles);

    console.log("✅ Feature toggles initialized successfully!");
    console.log(
      `   Created ${Object.keys(featureToggles).length} feature toggles`,
    );
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
      "\n💡 Next steps:\n   1. Deploy API with feature toggle routes\n   2. Use admin UI to manage toggles\n   3. Enable features for beta organizations as needed",
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error initializing feature toggles:", error);
    process.exit(1);
  }
}

// Run initialization
initializeFeatureToggles();
