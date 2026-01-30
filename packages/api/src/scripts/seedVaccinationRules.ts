/**
 * Seed script for creating system-wide vaccination rules
 * Creates FEI and KNHS standard rules in Firestore
 *
 * Usage:
 *   npx tsx packages/api/src/scripts/seedVaccinationRules.ts              # defaults to dev
 *   npx tsx packages/api/src/scripts/seedVaccinationRules.ts staging      # uses staging service account
 *   npx tsx packages/api/src/scripts/seedVaccinationRules.ts prod         # uses prod service account
 *
 * Or via GOOGLE_APPLICATION_CREDENTIALS:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json npx tsx packages/api/src/scripts/seedVaccinationRules.ts
 */

import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine environment from CLI argument or default to 'dev'
const env = process.argv[2] || "dev";
const validEnvs = ["dev", "staging", "prod"];

if (!validEnvs.includes(env)) {
  console.error(
    `Invalid environment: ${env}. Must be one of: ${validEnvs.join(", ")}`,
  );
  process.exit(1);
}

console.log(`🔧 Environment: ${env}`);

// Initialize Firebase Admin SDK
// Priority: GOOGLE_APPLICATION_CREDENTIALS env var > service-account-{env}.json > application default credentials
try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(
      `Using GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`,
    );
    initializeApp({
      credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS),
    });
  } else {
    const serviceAccountPath = path.resolve(
      __dirname,
      `../../service-account-${env}.json`,
    );
    if (existsSync(serviceAccountPath)) {
      console.log(`Using service account: service-account-${env}.json`);
      initializeApp({
        credential: cert(serviceAccountPath),
      });
    } else {
      console.log("Using application default credentials (gcloud auth)");
      initializeApp({
        credential: applicationDefault(),
        projectId: `equiduty-${env}`,
      });
    }
  }
} catch (error) {
  // App already initialized
  console.log("Firebase Admin already initialized");
}

const db = getFirestore();

/**
 * Standard vaccination rules
 */
const STANDARD_RULES = [
  {
    id: "system-fei",
    name: "FEI rules",
    description:
      "Horse has to be vaccinated within 6 months and 21 days and cannot compete for 7 days.",
    periodMonths: 6,
    periodDays: 21,
    daysNotCompeting: 7,
  },
  {
    id: "system-knhs",
    name: "KNHS rules",
    description:
      "Horse has to be vaccinated within 12 months and 0 days and cannot compete for 7 days.",
    periodMonths: 12,
    periodDays: 0,
    daysNotCompeting: 7,
  },
];

/**
 * Seed system vaccination rules
 */
async function seedVaccinationRules() {
  console.log("🌱 Starting vaccination rules seed...\n");

  let created = 0;
  let existing = 0;
  let errors = 0;

  for (const rule of STANDARD_RULES) {
    try {
      // Check if rule already exists
      const docRef = db.collection("vaccinationRules").doc(rule.id);
      const doc = await docRef.get();

      if (doc.exists) {
        console.log(`✓ Rule "${rule.name}" (${rule.id}) already exists`);
        existing++;
        continue;
      }

      // Create new system rule
      const now = Timestamp.now();
      await docRef.set({
        id: rule.id,
        scope: "system",
        systemWide: true,
        name: rule.name,
        description: rule.description,
        periodMonths: rule.periodMonths,
        periodDays: rule.periodDays,
        daysNotCompeting: rule.daysNotCompeting,
        createdAt: now,
        updatedAt: now,
        createdBy: "system",
      });

      console.log(`✅ Created rule "${rule.name}" (${rule.id})`);
      created++;
    } catch (error) {
      console.error(`❌ Error creating rule "${rule.name}":`, error);
      errors++;
    }
  }

  console.log("\n📊 Seed Results:");
  console.log(`  Created: ${created}`);
  console.log(`  Already existed: ${existing}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Total processed: ${STANDARD_RULES.length}`);

  if (errors === 0) {
    console.log("\n✅ Seed completed successfully!");
  } else {
    console.log("\n⚠️  Seed completed with errors");
    process.exit(1);
  }
}

// Run seed script
seedVaccinationRules()
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  });
