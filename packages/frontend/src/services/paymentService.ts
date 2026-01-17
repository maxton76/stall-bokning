import { authFetchJSON } from "@/utils/authFetch";
import type {
  OrganizationStripeSettings,
  PaymentIntent,
  CheckoutSession,
  SavedPaymentMethod,
  PrepaidAccount,
  PrepaidTransaction,
  CreateCheckoutSessionData,
  CreatePaymentIntentData,
  CreateRefundData,
} from "@stall-bokning/shared";

const API_BASE = import.meta.env.VITE_API_URL || "";

// ============================================
// Types
// ============================================

export interface StripeSettingsResponse extends OrganizationStripeSettings {}

export interface ConnectAccountResponse {
  accountLinkUrl: string;
  expiresAt: string;
}

export interface CheckoutSessionResponse {
  id: string;
  stripeSessionId: string;
  url: string;
  expiresAt: string;
  status: "open" | "complete" | "expired";
}

export interface PaymentIntentResponse {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface PaymentIntentsListResponse {
  payments: PaymentIntent[];
  total: number;
}

export interface RefundResponse {
  success: boolean;
  refund: {
    id: string;
    amount: number;
    currency: string;
    status: string;
  };
}

export interface PaymentMethodsResponse {
  paymentMethods: SavedPaymentMethod[];
}

export interface SavePaymentMethodResponse {
  success: boolean;
  paymentMethod: SavedPaymentMethod;
}

export interface PrepaidAccountResponse extends PrepaidAccount {}

export interface PrepaidTransactionsResponse {
  transactions: PrepaidTransaction[];
}

export interface DepositResponse {
  success: boolean;
  newBalance: number;
  transaction: {
    id: string;
    amount: number;
    type: string;
  };
}

export interface UpdateStripeSettingsData {
  acceptedPaymentMethods?: (
    | "card"
    | "klarna"
    | "swish"
    | "bank_transfer"
    | "sepa_debit"
  )[];
  passFeesToCustomer?: boolean;
  payoutSchedule?: "daily" | "weekly" | "monthly" | "manual";
  statementDescriptor?: string;
  statementDescriptorSuffix?: string;
}

// ============================================
// Stripe Connect Account
// ============================================

export async function getStripeSettings(
  organizationId: string,
): Promise<StripeSettingsResponse> {
  return authFetchJSON<StripeSettingsResponse>(
    `${API_BASE}/api/v1/organizations/${organizationId}/payments/settings`,
  );
}

export async function connectStripeAccount(
  organizationId: string,
  returnUrl: string,
  refreshUrl: string,
): Promise<ConnectAccountResponse> {
  return authFetchJSON<ConnectAccountResponse>(
    `${API_BASE}/api/v1/organizations/${organizationId}/payments/connect`,
    {
      method: "POST",
      body: JSON.stringify({ returnUrl, refreshUrl }),
    },
  );
}

export async function updateStripeSettings(
  organizationId: string,
  data: UpdateStripeSettingsData,
): Promise<StripeSettingsResponse> {
  return authFetchJSON<StripeSettingsResponse>(
    `${API_BASE}/api/v1/organizations/${organizationId}/payments/settings`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

// ============================================
// Checkout Sessions
// ============================================

export async function createCheckoutSession(
  organizationId: string,
  data: CreateCheckoutSessionData,
): Promise<CheckoutSessionResponse> {
  return authFetchJSON<CheckoutSessionResponse>(
    `${API_BASE}/api/v1/organizations/${organizationId}/payments/checkout`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function getCheckoutSession(
  organizationId: string,
  sessionId: string,
): Promise<CheckoutSession> {
  return authFetchJSON<CheckoutSession>(
    `${API_BASE}/api/v1/organizations/${organizationId}/payments/checkout/${sessionId}`,
  );
}

// ============================================
// Payment Intents
// ============================================

export async function createPaymentIntent(
  organizationId: string,
  data: CreatePaymentIntentData,
): Promise<PaymentIntentResponse> {
  return authFetchJSON<PaymentIntentResponse>(
    `${API_BASE}/api/v1/organizations/${organizationId}/payments/intents`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function getPaymentIntents(
  organizationId: string,
  filters?: {
    contactId?: string;
    invoiceId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  },
): Promise<PaymentIntentsListResponse> {
  const params = new URLSearchParams();
  if (filters?.contactId) params.set("contactId", filters.contactId);
  if (filters?.invoiceId) params.set("invoiceId", filters.invoiceId);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.limit) params.set("limit", filters.limit.toString());
  if (filters?.offset) params.set("offset", filters.offset.toString());
  const query = params.toString();

  return authFetchJSON<PaymentIntentsListResponse>(
    `${API_BASE}/api/v1/organizations/${organizationId}/payments/intents${query ? `?${query}` : ""}`,
  );
}

export async function getPaymentIntent(
  organizationId: string,
  intentId: string,
): Promise<PaymentIntent> {
  return authFetchJSON<PaymentIntent>(
    `${API_BASE}/api/v1/organizations/${organizationId}/payments/intents/${intentId}`,
  );
}

// ============================================
// Refunds
// ============================================

export async function createRefund(
  organizationId: string,
  data: CreateRefundData,
): Promise<RefundResponse> {
  return authFetchJSON<RefundResponse>(
    `${API_BASE}/api/v1/organizations/${organizationId}/payments/refunds`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

// ============================================
// Saved Payment Methods
// ============================================

export async function getPaymentMethods(
  organizationId: string,
  contactId: string,
): Promise<PaymentMethodsResponse> {
  return authFetchJSON<PaymentMethodsResponse>(
    `${API_BASE}/api/v1/organizations/${organizationId}/contacts/${contactId}/payment-methods`,
  );
}

export async function savePaymentMethod(
  organizationId: string,
  contactId: string,
  paymentMethodId: string,
  setAsDefault?: boolean,
): Promise<SavePaymentMethodResponse> {
  return authFetchJSON<SavePaymentMethodResponse>(
    `${API_BASE}/api/v1/organizations/${organizationId}/payments/methods`,
    {
      method: "POST",
      body: JSON.stringify({ contactId, paymentMethodId, setAsDefault }),
    },
  );
}

export async function deletePaymentMethod(
  organizationId: string,
  methodId: string,
  contactId: string,
): Promise<{ success: boolean }> {
  return authFetchJSON<{ success: boolean }>(
    `${API_BASE}/api/v1/organizations/${organizationId}/payments/methods/${methodId}?contactId=${contactId}`,
    {
      method: "DELETE",
    },
  );
}

// ============================================
// Prepaid Accounts
// ============================================

export async function getPrepaidAccount(
  organizationId: string,
  contactId: string,
): Promise<PrepaidAccountResponse> {
  return authFetchJSON<PrepaidAccountResponse>(
    `${API_BASE}/api/v1/organizations/${organizationId}/contacts/${contactId}/prepaid`,
  );
}

export async function depositToPrepaid(
  organizationId: string,
  contactId: string,
  amount: number,
  currency?: string,
): Promise<DepositResponse> {
  return authFetchJSON<DepositResponse>(
    `${API_BASE}/api/v1/organizations/${organizationId}/contacts/${contactId}/prepaid/deposit`,
    {
      method: "POST",
      body: JSON.stringify({ amount, currency }),
    },
  );
}

export async function getPrepaidTransactions(
  organizationId: string,
  contactId: string,
  limit?: number,
  offset?: number,
): Promise<PrepaidTransactionsResponse> {
  const params = new URLSearchParams();
  if (limit) params.set("limit", limit.toString());
  if (offset) params.set("offset", offset.toString());
  const query = params.toString();

  return authFetchJSON<PrepaidTransactionsResponse>(
    `${API_BASE}/api/v1/organizations/${organizationId}/contacts/${contactId}/prepaid/transactions${query ? `?${query}` : ""}`,
  );
}

// ============================================
// Utility Functions
// ============================================

export function formatCurrency(
  amount: number,
  currency: string = "SEK",
): string {
  // Amount is in smallest unit (öre for SEK)
  const value = amount / 100;
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function getPaymentStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "succeeded":
      return "default";
    case "processing":
    case "requires_confirmation":
    case "requires_action":
      return "secondary";
    case "failed":
    case "cancelled":
      return "destructive";
    case "pending":
    case "requires_payment_method":
    default:
      return "outline";
  }
}

export function getPaymentMethodIcon(type: string): string {
  switch (type) {
    case "card":
      return "💳";
    case "klarna":
      return "🛒";
    case "swish":
      return "📱";
    case "bank_transfer":
      return "🏦";
    case "sepa_debit":
      return "🏧";
    default:
      return "💰";
  }
}

export function getCardBrandIcon(brand: string): string {
  switch (brand.toLowerCase()) {
    case "visa":
      return "V";
    case "mastercard":
      return "M";
    case "amex":
      return "A";
    default:
      return "•";
  }
}
