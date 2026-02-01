/**
 * Stripe Payment Utilities
 *
 * Helpers for creating payments on connected accounts.
 * All amounts in öre (1 SEK = 100 öre).
 */

import type Stripe from "stripe";
import { stripe } from "./stripe.js";
import { db } from "./firebase.js";

/** Default platform application fee percentage */
const DEFAULT_APPLICATION_FEE_PERCENT = 2.5;

/**
 * Calculate the platform application fee for a payment amount.
 * Uses org-specific rate if configured, otherwise default.
 */
export async function calculateApplicationFee(
  organizationId: string,
  amount: number,
): Promise<number> {
  const settingsRef = db
    .collection("organizationStripeSettings")
    .doc(organizationId);
  const settingsSnap = await settingsRef.get();

  const feePercent =
    settingsSnap.data()?.applicationFeePercent ??
    DEFAULT_APPLICATION_FEE_PERCENT;

  // Round to nearest öre
  return Math.round(amount * (feePercent / 100));
}

/**
 * Get the Stripe connected account ID for an organization.
 * Throws if not connected or charges not enabled.
 */
export async function getConnectedAccountId(
  organizationId: string,
): Promise<string> {
  const settingsRef = db
    .collection("organizationStripeSettings")
    .doc(organizationId);
  const settingsSnap = await settingsRef.get();

  if (!settingsSnap.exists) {
    throw new Error("Online payments not configured for this organization");
  }

  const data = settingsSnap.data()!;
  if (!data.stripeAccountId) {
    throw new Error("No Stripe account connected");
  }
  if (!data.chargesEnabled) {
    throw new Error("Stripe account cannot accept charges yet");
  }

  return data.stripeAccountId;
}

/**
 * Create a Stripe Checkout Session on a connected account for invoice payment.
 */
export async function createInvoiceCheckoutSession(options: {
  organizationId: string;
  connectedAccountId: string;
  invoiceId: string;
  invoiceNumber: string;
  contactEmail?: string;
  lineItems: {
    description: string;
    quantity: number;
    unitAmount: number; // öre
  }[];
  totalAmount: number; // öre
  currency?: string;
  successUrl: string;
  cancelUrl: string;
  allowedPaymentMethods?: string[];
  locale?: string;
  setupFutureUsage?: boolean;
  metadata?: Record<string, string>;
}): Promise<Stripe.Checkout.Session> {
  const applicationFee = await calculateApplicationFee(
    options.organizationId,
    options.totalAmount,
  );

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    payment_method_types:
      (options.allowedPaymentMethods as Stripe.Checkout.SessionCreateParams.PaymentMethodType[]) || [
        "card",
      ],
    line_items: options.lineItems.map((item) => ({
      price_data: {
        currency: options.currency || "sek",
        product_data: { name: item.description },
        unit_amount: item.unitAmount,
      },
      quantity: item.quantity,
    })),
    customer_email: options.contactEmail,
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    locale:
      (options.locale as Stripe.Checkout.SessionCreateParams.Locale) || "sv",
    payment_intent_data: {
      application_fee_amount: applicationFee,
      metadata: {
        organizationId: options.organizationId,
        invoiceId: options.invoiceId,
        invoiceNumber: options.invoiceNumber,
        type: "invoice_payment",
        ...options.metadata,
      },
      ...(options.setupFutureUsage
        ? { setup_future_usage: "off_session" as const }
        : {}),
    },
    metadata: {
      organizationId: options.organizationId,
      invoiceId: options.invoiceId,
      invoiceNumber: options.invoiceNumber,
      type: "invoice_payment",
    },
  };

  const session = await stripe.checkout.sessions.create(sessionParams, {
    stripeAccount: options.connectedAccountId,
  });

  return session;
}

/**
 * Create a PaymentIntent using a saved payment method on a connected account.
 */
export async function createSavedCardPayment(options: {
  organizationId: string;
  connectedAccountId: string;
  stripeCustomerId: string;
  paymentMethodId: string;
  amount: number; // öre
  currency?: string;
  invoiceId: string;
  invoiceNumber: string;
  description: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.PaymentIntent> {
  const applicationFee = await calculateApplicationFee(
    options.organizationId,
    options.amount,
  );

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: options.amount,
      currency: options.currency || "sek",
      customer: options.stripeCustomerId,
      payment_method: options.paymentMethodId,
      off_session: true,
      confirm: true,
      application_fee_amount: applicationFee,
      description: options.description,
      metadata: {
        organizationId: options.organizationId,
        invoiceId: options.invoiceId,
        invoiceNumber: options.invoiceNumber,
        type: "invoice_payment",
        ...options.metadata,
      },
    },
    {
      stripeAccount: options.connectedAccountId,
    },
  );

  return paymentIntent;
}

/**
 * Get or create a Stripe Customer on the connected account for a contact.
 */
export async function getOrCreateConnectedCustomer(
  organizationId: string,
  connectedAccountId: string,
  contactId: string,
  email: string,
  name: string,
): Promise<string> {
  // Use a deterministic doc ID to enable transactional check
  const docId = `${organizationId}_${contactId}`;
  const customerRef = db.collection("stripeCustomers").doc(docId);

  let customerId: string | null = null;

  // Use a transaction to prevent duplicate Stripe customer creation (TOCTOU race)
  await db.runTransaction(async (transaction) => {
    const customerDoc = await transaction.get(customerRef);

    if (customerDoc.exists && customerDoc.data()?.stripeCustomerId) {
      customerId = customerDoc.data()!.stripeCustomerId;
      return;
    }

    // Create customer on connected account
    const customer = await stripe.customers.create(
      {
        email,
        name,
        metadata: {
          organizationId,
          contactId,
          platform: "equiduty",
        },
      },
      {
        stripeAccount: connectedAccountId,
      },
    );

    // Atomically store the mapping so concurrent requests see it
    transaction.set(
      customerRef,
      {
        id: docId,
        contactId,
        organizationId,
        stripeCustomerId: customer.id,
        email,
        name,
        savedPaymentMethods: [],
        balance: 0,
        currency: "sek",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { merge: true },
    );

    customerId = customer.id;
  });

  return customerId!;
}
