/**
 * Configure Stripe Customer Portal
 *
 * Sets up the Stripe Customer Portal with:
 * - Plan switching between Standard and Pro
 * - Cancellation with retention prompts
 * - Payment method management
 * - Invoice history
 * - Swedish locale
 *
 * Usage:
 *   npx tsx packages/api/scripts/configure-stripe-portal.ts
 *
 * Prerequisites:
 *   - STRIPE_SECRET_KEY environment variable
 *   - Stripe Products/Prices seeded (run seed-stripe-products.ts first)
 */

import "dotenv/config";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  typescript: true,
});

async function configurePortal() {
  console.log("🔧 Configuring Stripe Customer Portal...\n");

  // Look up existing products to get their price IDs
  const products = await stripe.products.list({ active: true, limit: 100 });
  const standardProduct = products.data.find((p) =>
    p.name.toLowerCase().includes("standard"),
  );
  const proProduct = products.data.find((p) =>
    p.name.toLowerCase().includes("pro"),
  );

  if (!standardProduct || !proProduct) {
    console.error("❌ Could not find Standard and/or Pro products in Stripe.");
    console.error("   Run seed-stripe-products.ts first.");
    process.exit(1);
  }

  // Get prices for these products
  const standardPrices = await stripe.prices.list({
    product: standardProduct.id,
    active: true,
  });
  const proPrices = await stripe.prices.list({
    product: proProduct.id,
    active: true,
  });

  const allPriceIds = [
    ...standardPrices.data.map((p) => p.id),
    ...proPrices.data.map((p) => p.id),
  ];

  console.log(`  Found ${allPriceIds.length} active prices for portal config`);

  // Create portal configuration
  const portalConfig = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: "Hantera din prenumeration",
    },
    features: {
      // Allow switching between Standard and Pro plans
      subscription_update: {
        enabled: true,
        default_allowed_updates: ["price", "promotion_code"],
        proration_behavior: "create_prorations",
        products: [
          {
            product: standardProduct.id,
            prices: standardPrices.data.map((p) => p.id),
          },
          {
            product: proProduct.id,
            prices: proPrices.data.map((p) => p.id),
          },
        ],
      },
      // Allow cancellation with retention
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
        cancellation_reason: {
          enabled: true,
          options: [
            "too_expensive",
            "missing_features",
            "switched_service",
            "unused",
            "other",
          ],
        },
      },
      // Allow payment method updates
      payment_method_update: {
        enabled: true,
      },
      // Show invoice history
      invoice_history: {
        enabled: true,
      },
      // Allow pausing (if desired)
      subscription_pause: {
        enabled: false,
      },
    },
    default_return_url: process.env.FRONTEND_URL || "https://app.equiduty.com",
  });

  console.log(`\n✅ Portal configuration created: ${portalConfig.id}`);
  console.log(`   Default return URL: ${portalConfig.default_return_url}`);
  console.log(
    `   Subscription update: ${portalConfig.features.subscription_update.enabled}`,
  );
  console.log(
    `   Subscription cancel: ${portalConfig.features.subscription_cancel.enabled}`,
  );
  console.log(
    `   Payment method update: ${portalConfig.features.payment_method_update.enabled}`,
  );
  console.log(
    `   Invoice history: ${portalConfig.features.invoice_history.enabled}`,
  );
  console.log("\n🎉 Customer Portal configured successfully!");
}

configurePortal().catch((error) => {
  console.error("❌ Failed to configure Customer Portal:", error);
  process.exit(1);
});
