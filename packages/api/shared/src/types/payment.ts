import type { Timestamp } from "firebase/firestore";

/**
 * Payment Types
 * Types for Stripe payment integration and online payments
 */

/**
 * Payment status
 */
export type PaymentStatus =
  | "pending"
  | "processing"
  | "requires_payment_method"
  | "requires_confirmation"
  | "requires_action"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "refunded"
  | "partially_refunded";

/**
 * Payment provider
 */
export type PaymentProvider = "stripe" | "swish" | "manual";

/**
 * Supported Stripe payment methods
 */
export type StripePaymentMethod =
  | "card"
  | "klarna"
  | "swish" // Swedish instant payment
  | "bank_transfer"
  | "sepa_debit";

/**
 * Stripe account status
 */
export type StripeAccountStatus =
  | "not_connected"
  | "pending"
  | "restricted"
  | "enabled"
  | "disabled";

/**
 * Organization Stripe settings
 * Stored as part of organization or separate collection
 */
export interface OrganizationStripeSettings {
  organizationId: string;

  // Stripe Connect account
  stripeAccountId?: string;
  accountStatus: StripeAccountStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;

  // Connect onboarding
  onboardingComplete: boolean;
  onboardingUrl?: string;
  onboardingExpiresAt?: Timestamp;

  // Payment settings
  isEnabled: boolean;
  acceptedPaymentMethods: StripePaymentMethod[];
  defaultCurrency: string; // "sek"

  // Fees configuration
  applicationFeePercent?: number; // Platform fee percentage
  passFeesToCustomer: boolean;

  // Payout settings
  payoutSchedule: "daily" | "weekly" | "monthly" | "manual";
  payoutDelayDays: number;

  // Webhook configuration
  webhookEndpointId?: string;
  webhookSecret?: string;

  // Display settings
  statementDescriptor?: string; // Appears on bank statements
  statementDescriptorSuffix?: string;

  // Metadata
  connectedAt?: Timestamp;
  lastPayoutAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Payment intent record
 * Stored in: paymentIntents/{id}
 */
export interface PaymentIntent {
  id: string;
  organizationId: string;
  stripePaymentIntentId: string;

  // Amounts
  amount: number; // In smallest currency unit (öre for SEK)
  amountReceived: number;
  currency: string;
  applicationFeeAmount?: number;

  // Status
  status: PaymentStatus;
  stripeStatus: string; // Raw Stripe status

  // Payment method
  paymentMethodType?: StripePaymentMethod;
  paymentMethodId?: string;
  last4?: string; // Last 4 digits of card

  // Customer
  contactId: string;
  contactEmail: string;
  stripeCustomerId?: string;

  // Related entities
  invoiceId?: string;
  invoiceNumber?: string;
  bookingId?: string;
  bookingType?: "lesson" | "facility" | "service";

  // Description
  description: string;
  metadata?: Record<string, string>;

  // Checkout session (if using hosted checkout)
  checkoutSessionId?: string;
  checkoutUrl?: string;
  checkoutExpiresAt?: Timestamp;

  // Success/failure
  succeededAt?: Timestamp;
  failedAt?: Timestamp;
  failureCode?: string;
  failureMessage?: string;

  // Refunds
  refunds: PaymentRefund[];
  totalRefunded: number;

  // Receipt
  receiptUrl?: string;
  receiptNumber?: string;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Payment refund
 */
export interface PaymentRefund {
  id: string;
  stripeRefundId: string;
  amount: number;
  currency: string;
  reason?: "duplicate" | "fraudulent" | "requested_by_customer" | "other";
  status: "pending" | "succeeded" | "failed" | "cancelled";
  failureReason?: string;
  createdAt: Timestamp;
  createdBy: string;
}

/**
 * Stripe customer record
 * Links contact to Stripe customer
 * Stored in: stripeCustomers/{id}
 */
export interface StripeCustomer {
  id: string; // Same as contactId
  contactId: string;
  organizationId: string;
  stripeCustomerId: string;

  // Customer info
  email: string;
  name: string;

  // Default payment method
  defaultPaymentMethodId?: string;
  defaultPaymentMethodType?: StripePaymentMethod;
  defaultPaymentMethodLast4?: string;

  // Saved payment methods
  savedPaymentMethods: SavedPaymentMethod[];

  // Balance (for prepaid accounts)
  balance: number;
  currency: string;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Saved payment method
 */
export interface SavedPaymentMethod {
  id: string;
  stripePaymentMethodId: string;
  type: StripePaymentMethod;
  isDefault: boolean;

  // Card details (if type is card)
  card?: {
    brand: string; // "visa", "mastercard", etc.
    last4: string;
    expMonth: number;
    expYear: number;
  };

  // Bank account (if type is sepa_debit)
  bankAccount?: {
    bankName: string;
    last4: string;
    country: string;
  };

  createdAt: Timestamp;
}

/**
 * Checkout session configuration
 */
export interface CreateCheckoutSessionData {
  invoiceId?: string;
  bookingId?: string;
  contactId: string;

  // Line items (if not using invoiceId)
  lineItems?: {
    description: string;
    quantity: number;
    unitAmount: number; // In smallest currency unit
    currency?: string;
  }[];

  // Customer info
  customerEmail?: string;

  // URLs
  successUrl: string;
  cancelUrl: string;

  // Options
  allowedPaymentMethods?: StripePaymentMethod[];
  expiresInMinutes?: number;
  locale?: string; // "sv", "en", etc.

  // Metadata
  metadata?: Record<string, string>;
}

/**
 * Checkout session response
 */
export interface CheckoutSession {
  id: string;
  stripeSessionId: string;
  url: string;
  expiresAt: Timestamp;
  paymentIntentId?: string;
  status: "open" | "complete" | "expired";
}

/**
 * Webhook event record
 * Stored in: stripeWebhookEvents/{id}
 */
export interface StripeWebhookEvent {
  id: string;
  stripeEventId: string;
  type: string; // "payment_intent.succeeded", etc.
  organizationId?: string;

  // Processing
  processed: boolean;
  processedAt?: Timestamp;
  processingError?: string;
  retryCount: number;

  // Event data
  data: Record<string, unknown>;

  // Metadata
  receivedAt: Timestamp;
}

/**
 * Prepaid account/balance
 * For customers who maintain a balance
 * Stored in: prepaidAccounts/{id}
 */
export interface PrepaidAccount {
  id: string; // Same as contactId
  contactId: string;
  organizationId: string;

  // Balance
  balance: number;
  currency: string;

  // Low balance settings
  lowBalanceThreshold?: number;
  notifyOnLowBalance: boolean;
  autoRechargeEnabled: boolean;
  autoRechargeAmount?: number;
  autoRechargeThreshold?: number;

  // Statistics
  totalDeposited: number;
  totalSpent: number;
  lastDepositAt?: Timestamp;
  lastUsageAt?: Timestamp;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Prepaid transaction
 * Stored in: prepaidTransactions/{id}
 */
export interface PrepaidTransaction {
  id: string;
  accountId: string;
  contactId: string;
  organizationId: string;

  // Transaction details
  type: "deposit" | "charge" | "refund" | "adjustment" | "transfer";
  amount: number; // Positive for deposits, negative for charges
  balanceAfter: number;
  currency: string;

  // Description
  description: string;

  // Related entities
  paymentIntentId?: string;
  invoiceId?: string;
  bookingId?: string;

  // Metadata
  createdAt: Timestamp;
  createdBy?: string;
}

// ============================================================
// API DTOs
// ============================================================

export interface ConnectStripeAccountData {
  returnUrl: string;
  refreshUrl: string;
}

export interface ConnectStripeAccountResponse {
  accountLinkUrl: string;
  expiresAt: Timestamp;
}

export interface CreatePaymentIntentData {
  amount: number;
  currency?: string;
  contactId: string;
  description: string;
  invoiceId?: string;
  bookingId?: string;
  paymentMethodTypes?: StripePaymentMethod[];
  metadata?: Record<string, string>;
}

export interface CreateRefundData {
  paymentIntentId: string;
  amount?: number; // Full refund if not specified
  reason?: "duplicate" | "fraudulent" | "requested_by_customer" | "other";
}

export interface SavePaymentMethodData {
  contactId: string;
  paymentMethodId: string;
  setAsDefault?: boolean;
}

export interface DepositToPrepaidData {
  amount: number;
  currency?: string;
}

// ============================================================
// Webhook Payloads
// ============================================================

export interface PaymentSucceededWebhookData {
  paymentIntentId: string;
  amount: number;
  currency: string;
  invoiceId?: string;
  bookingId?: string;
  contactId: string;
}

export interface PaymentFailedWebhookData {
  paymentIntentId: string;
  failureCode: string;
  failureMessage: string;
  invoiceId?: string;
  bookingId?: string;
}

// ============================================================
// Reports/Analytics
// ============================================================

export interface PaymentAnalytics {
  organizationId: string;
  period: {
    start: Date;
    end: Date;
  };

  // Volume
  totalPayments: number;
  totalAmount: number;
  totalRefunds: number;
  totalRefundAmount: number;
  netAmount: number;
  currency: string;

  // Success rates
  successRate: number;
  failureRate: number;

  // By payment method
  byPaymentMethod: {
    method: StripePaymentMethod;
    count: number;
    amount: number;
  }[];

  // By invoice type
  byInvoiceItemType: {
    itemType: string;
    count: number;
    amount: number;
  }[];

  // Daily trend
  dailyTrend: {
    date: string;
    count: number;
    amount: number;
  }[];

  // Top customers
  topCustomers: {
    contactId: string;
    contactName: string;
    paymentCount: number;
    totalAmount: number;
  }[];
}
