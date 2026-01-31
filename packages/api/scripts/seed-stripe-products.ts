/**
 * Seed Stripe Products & Prices
 *
 * Creates Stripe Products for Standard and Pro tiers,
 * creates monthly + annual Prices in SEK,
 * and stores mappings in Firestore `stripeProducts/{tier}`.
 *
 * Usage: npx tsx packages/api/scripts/seed-stripe-products.ts
 *
 * Requires:
 *   STRIPE_SECRET_KEY env var
 *   GOOGLE_APPLICATION_CREDENTIALS or FIRESTORE_EMULATOR_HOST env var
 */

import "dotenv/config";
import Stripe from "stripe";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { TIER_PRICING, TRIAL_DAYS } from "@equiduty/shared";

// Initialize Firebase Admin
if (getApps().length === 0) {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    initializeApp({ projectId: "equiduty-dev" });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const serviceAccount = await import(
      process.env.GOOGLE_APPLICATION_CREDENTIALS
    );
    initializeApp({ credential: cert(serviceAccount.default) });
  } else {
    initializeApp();
  }
}

const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("STRIPE_SECRET_KEY is required");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  typescript: true,
});

interface TierConfig {
  tier: string;
  name: string;
  description: string;
}

const tiers: TierConfig[] = [
  {
    tier: "standard",
    name: "EquiDuty Standard",
    description: "Work together — scale up and get visibility",
  },
  {
    tier: "pro",
    name: "EquiDuty Pro",
    description: "Full operations — complete operational toolkit",
  },
];

async function seed() {
  console.log("Seeding Stripe products and prices...\n");

  for (const { tier, name, description } of tiers) {
    const pricing = TIER_PRICING[tier];

    // Create Stripe Product
    const product = await stripe.products.create({
      name,
      description,
      metadata: { tier, platform: "equiduty" },
    });
    console.log(`Created product: ${product.id} (${name})`);

    // Create monthly price
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: pricing.month,
      currency: "sek",
      recurring: { interval: "month" },
      metadata: { tier, interval: "month" },
    });
    console.log(
      `  Monthly price: ${monthlyPrice.id} (${pricing.month / 100} SEK/mo)`,
    );

    // Create annual price
    const yearlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: pricing.year,
      currency: "sek",
      recurring: { interval: "year" },
      metadata: { tier, interval: "year" },
    });
    console.log(
      `  Annual price: ${yearlyPrice.id} (${pricing.year / 100} SEK/yr)`,
    );

    // Store mapping in Firestore
    await db
      .collection("stripeProducts")
      .doc(tier)
      .set({
        tier,
        stripeProductId: product.id,
        prices: {
          month: monthlyPrice.id,
          year: yearlyPrice.id,
        },
      });
    console.log(`  Stored mapping in Firestore stripeProducts/${tier}\n`);
  }

  console.log(`Trial days: ${TRIAL_DAYS}`);
  console.log("\nDone! Stripe products and Firestore mappings created.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
