import { apiClient } from "@/lib/apiClient";
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
} from "@equiduty/shared";

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
  return apiClient.get<StripeSettingsResponse>(
    `/organizations/${organizationId}/payments/settings`,
  );
}

export async function connectStripeAccount(
  organizationId: string,
  returnUrl: string,
  refreshUrl: string,
): Promise<ConnectAccountResponse> {
  return apiClient.post<ConnectAccountResponse>(
    `/organizations/${organizationId}/payments/connect`,
    { returnUrl, refreshUrl },
  );
}

export async function updateStripeSettings(
  organizationId: string,
  data: UpdateStripeSettingsData,
): Promise<StripeSettingsResponse> {
  return apiClient.patch<StripeSettingsResponse>(
    `/organizations/${organizationId}/payments/settings`,
    data,
  );
}

// ============================================
// Checkout Sessions
// ============================================

export async function createCheckoutSession(
  organizationId: string,
  data: CreateCheckoutSessionData,
): Promise<CheckoutSessionResponse> {
  return apiClient.post<CheckoutSessionResponse>(
    `/organizations/${organizationId}/payments/checkout`,
    data,
  );
}

export async function getCheckoutSession(
  organizationId: string,
  sessionId: string,
): Promise<CheckoutSession> {
  return apiClient.get<CheckoutSession>(
    `/organizations/${organizationId}/payments/checkout/${sessionId}`,
  );
}

// ============================================
// Payment Intents
// ============================================

export async function createPaymentIntent(
  organizationId: string,
  data: CreatePaymentIntentData,
): Promise<PaymentIntentResponse> {
  return apiClient.post<PaymentIntentResponse>(
    `/organizations/${organizationId}/payments/intents`,
    data,
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
  const params: Record<string, string> = {};
  if (filters?.contactId) params.contactId = filters.contactId;
  if (filters?.invoiceId) params.invoiceId = filters.invoiceId;
  if (filters?.status) params.status = filters.status;
  if (filters?.limit) params.limit = filters.limit.toString();
  if (filters?.offset) params.offset = filters.offset.toString();

  return apiClient.get<PaymentIntentsListResponse>(
    `/organizations/${organizationId}/payments/intents`,
    Object.keys(params).length > 0 ? params : undefined,
  );
}

export async function getPaymentIntent(
  organizationId: string,
  intentId: string,
): Promise<PaymentIntent> {
  return apiClient.get<PaymentIntent>(
    `/organizations/${organizationId}/payments/intents/${intentId}`,
  );
}

// ============================================
// Refunds
// ============================================

export async function createRefund(
  organizationId: string,
  data: CreateRefundData,
): Promise<RefundResponse> {
  return apiClient.post<RefundResponse>(
    `/organizations/${organizationId}/payments/refunds`,
    data,
  );
}

// ============================================
// Saved Payment Methods
// ============================================

export async function getPaymentMethods(
  organizationId: string,
  contactId: string,
): Promise<PaymentMethodsResponse> {
  return apiClient.get<PaymentMethodsResponse>(
    `/organizations/${organizationId}/contacts/${contactId}/payment-methods`,
  );
}

export async function savePaymentMethod(
  organizationId: string,
  contactId: string,
  paymentMethodId: string,
  setAsDefault?: boolean,
): Promise<SavePaymentMethodResponse> {
  return apiClient.post<SavePaymentMethodResponse>(
    `/organizations/${organizationId}/payments/methods`,
    { contactId, paymentMethodId, setAsDefault },
  );
}

export async function deletePaymentMethod(
  organizationId: string,
  methodId: string,
  contactId: string,
): Promise<{ success: boolean }> {
  return apiClient.delete<{ success: boolean }>(
    `/organizations/${organizationId}/payments/methods/${methodId}`,
    { contactId },
  );
}

// ============================================
// Prepaid Accounts
// ============================================

export async function getPrepaidAccount(
  organizationId: string,
  contactId: string,
): Promise<PrepaidAccountResponse> {
  return apiClient.get<PrepaidAccountResponse>(
    `/organizations/${organizationId}/contacts/${contactId}/prepaid`,
  );
}

export async function depositToPrepaid(
  organizationId: string,
  contactId: string,
  amount: number,
  currency?: string,
): Promise<DepositResponse> {
  return apiClient.post<DepositResponse>(
    `/organizations/${organizationId}/contacts/${contactId}/prepaid/deposit`,
    { amount, currency },
  );
}

export async function getPrepaidTransactions(
  organizationId: string,
  contactId: string,
  limit?: number,
  offset?: number,
): Promise<PrepaidTransactionsResponse> {
  const params: Record<string, string> = {};
  if (limit) params.limit = limit.toString();
  if (offset) params.offset = offset.toString();

  return apiClient.get<PrepaidTransactionsResponse>(
    `/organizations/${organizationId}/contacts/${contactId}/prepaid/transactions`,
    Object.keys(params).length > 0 ? params : undefined,
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
