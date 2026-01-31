/**
 * Subscription & Billing Types
 *
 * Types for the platform-to-org billing system (Stripe Subscriptions).
 * This is distinct from the org-to-customer payment system in payment.ts.
 */

import type { SubscriptionTier } from "./admin.js";

// ============================================
// Core Billing Types
// ============================================

export type BillingInterval = "month" | "year";

export type StripeSubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

/**
 * Maps a subscription tier to its Stripe Product and Price IDs.
 * Stored in Firestore `stripeProducts/{tier}` collection.
 */
export interface StripeProductMapping {
  tier: SubscriptionTier;
  stripeProductId: string;
  prices: {
    month: string; // Stripe Price ID for monthly
    year: string; // Stripe Price ID for annual
  };
}

/**
 * Stripe subscription data stored on the organization document.
 * Synced via webhooks.
 */
export interface OrganizationStripeSubscription {
  /** Stripe Customer ID */
  customerId: string;
  /** Stripe Subscription ID */
  subscriptionId: string;
  /** Current subscription status */
  status: StripeSubscriptionStatus;
  /** Current Stripe Price ID */
  priceId: string;
  /** Billing interval */
  billingInterval: BillingInterval;
  /** Current period start (ISO string) */
  currentPeriodStart: string;
  /** Current period end (ISO string) */
  currentPeriodEnd: string;
  /** Whether the subscription will cancel at period end */
  cancelAtPeriodEnd: boolean;
  /** When cancellation was requested (ISO string) */
  canceledAt?: string;
  /** Trial end date (ISO string) */
  trialEnd?: string;
  /** Whether this org has ever had a trial */
  hasHadTrial: boolean;
  /** Payment method info for display */
  paymentMethod?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

// ============================================
// Invoice Types
// ============================================

export interface BillingInvoice {
  id: string;
  /** Amount in smallest currency unit (ore) */
  amountDue: number;
  /** Amount paid in smallest currency unit (ore) */
  amountPaid: number;
  currency: string;
  status: "draft" | "open" | "paid" | "uncollectible" | "void";
  /** ISO date string */
  created: string;
  /** ISO date string */
  periodStart: string;
  /** ISO date string */
  periodEnd: string;
  /** URL to download the invoice PDF */
  invoicePdf?: string;
  /** URL to view the hosted invoice */
  hostedInvoiceUrl?: string;
}

// ============================================
// Request/Response DTOs
// ============================================

export interface CreateSubscriptionCheckoutData {
  tier: SubscriptionTier;
  billingInterval: BillingInterval;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface -- portal request needs no client-side data; kept for API contract clarity
export interface CreateCustomerPortalData {}

/** Subscription data safe for client consumption (Stripe internal IDs stripped). */
export type SafeSubscription = Omit<
  OrganizationStripeSubscription,
  "customerId" | "subscriptionId" | "priceId"
>;

export interface SubscriptionDetailsResponse {
  subscription: SafeSubscription | null;
  tier: SubscriptionTier;
}

export interface BillingHistoryResponse {
  invoices: BillingInvoice[];
  hasMore: boolean;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface CustomerPortalResponse {
  url: string;
}

export interface VerifyCheckoutRequest {
  sessionId: string;
}

export interface VerifyCheckoutResponse {
  /** Whether the checkout session was successfully synced */
  synced: boolean;
  /** Current subscription status after verification */
  subscription: SafeSubscription | null;
  tier: SubscriptionTier;
}
