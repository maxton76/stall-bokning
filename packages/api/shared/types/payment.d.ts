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
  | "swish"
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
  stripeAccountId?: string;
  accountStatus: StripeAccountStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  onboardingComplete: boolean;
  onboardingUrl?: string;
  onboardingExpiresAt?: Timestamp;
  isEnabled: boolean;
  acceptedPaymentMethods: StripePaymentMethod[];
  defaultCurrency: string;
  applicationFeePercent?: number;
  passFeesToCustomer: boolean;
  payoutSchedule: "daily" | "weekly" | "monthly" | "manual";
  payoutDelayDays: number;
  webhookEndpointId?: string;
  webhookSecret?: string;
  statementDescriptor?: string;
  statementDescriptorSuffix?: string;
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
  amount: number;
  amountReceived: number;
  currency: string;
  applicationFeeAmount?: number;
  status: PaymentStatus;
  stripeStatus: string;
  paymentMethodType?: StripePaymentMethod;
  paymentMethodId?: string;
  last4?: string;
  contactId: string;
  contactEmail: string;
  stripeCustomerId?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  bookingId?: string;
  bookingType?: "lesson" | "facility" | "service";
  description: string;
  metadata?: Record<string, string>;
  checkoutSessionId?: string;
  checkoutUrl?: string;
  checkoutExpiresAt?: Timestamp;
  succeededAt?: Timestamp;
  failedAt?: Timestamp;
  failureCode?: string;
  failureMessage?: string;
  refunds: PaymentRefund[];
  totalRefunded: number;
  receiptUrl?: string;
  receiptNumber?: string;
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
  id: string;
  contactId: string;
  organizationId: string;
  stripeCustomerId: string;
  email: string;
  name: string;
  defaultPaymentMethodId?: string;
  defaultPaymentMethodType?: StripePaymentMethod;
  defaultPaymentMethodLast4?: string;
  savedPaymentMethods: SavedPaymentMethod[];
  balance: number;
  currency: string;
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
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
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
  lineItems?: {
    description: string;
    quantity: number;
    unitAmount: number;
    currency?: string;
  }[];
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  allowedPaymentMethods?: StripePaymentMethod[];
  expiresInMinutes?: number;
  locale?: string;
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
  type: string;
  organizationId?: string;
  processed: boolean;
  processedAt?: Timestamp;
  processingError?: string;
  retryCount: number;
  data: Record<string, unknown>;
  receivedAt: Timestamp;
}
/**
 * Prepaid account/balance
 * For customers who maintain a balance
 * Stored in: prepaidAccounts/{id}
 */
export interface PrepaidAccount {
  id: string;
  contactId: string;
  organizationId: string;
  balance: number;
  currency: string;
  lowBalanceThreshold?: number;
  notifyOnLowBalance: boolean;
  autoRechargeEnabled: boolean;
  autoRechargeAmount?: number;
  autoRechargeThreshold?: number;
  totalDeposited: number;
  totalSpent: number;
  lastDepositAt?: Timestamp;
  lastUsageAt?: Timestamp;
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
  type: "deposit" | "charge" | "refund" | "adjustment" | "transfer";
  amount: number;
  balanceAfter: number;
  currency: string;
  description: string;
  paymentIntentId?: string;
  invoiceId?: string;
  bookingId?: string;
  createdAt: Timestamp;
  createdBy?: string;
}
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
  amount?: number;
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
export interface PaymentAnalytics {
  organizationId: string;
  period: {
    start: Date;
    end: Date;
  };
  totalPayments: number;
  totalAmount: number;
  totalRefunds: number;
  totalRefundAmount: number;
  netAmount: number;
  currency: string;
  successRate: number;
  failureRate: number;
  byPaymentMethod: {
    method: StripePaymentMethod;
    count: number;
    amount: number;
  }[];
  byInvoiceItemType: {
    itemType: string;
    count: number;
    amount: number;
  }[];
  dailyTrend: {
    date: string;
    count: number;
    amount: number;
  }[];
  topCustomers: {
    contactId: string;
    contactName: string;
    paymentCount: number;
    totalAmount: number;
  }[];
}
//# sourceMappingURL=payment.d.ts.map
