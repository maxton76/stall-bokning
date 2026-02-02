import { apiClient } from "@/lib/apiClient";

// ============================================
// Types
// ============================================

export interface CheckoutResponse {
  sessionId: string;
  url: string;
  expiresAt: string | null;
}

export interface PayWithSavedCardResponse {
  paymentIntentId: string;
  status: string;
  clientSecret?: string;
  requiresAction: boolean;
}

export interface PaymentStatusResponse {
  invoiceId: string;
  invoiceStatus: string;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  payments: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    paymentMethodType?: string;
    createdAt?: string;
    succeededAt?: string;
  }[];
}

// ============================================
// API Functions
// ============================================

export async function createInvoiceCheckout(
  organizationId: string,
  invoiceId: string,
  data: {
    successUrl: string;
    cancelUrl: string;
    locale?: string;
    setupFutureUsage?: boolean;
  },
): Promise<CheckoutResponse> {
  return apiClient.post<CheckoutResponse>(
    `/organizations/${organizationId}/invoices/${invoiceId}/checkout`,
    data,
  );
}

export async function payInvoiceWithSavedCard(
  organizationId: string,
  invoiceId: string,
  data: {
    paymentMethodId: string;
    amount?: number;
  },
): Promise<PayWithSavedCardResponse> {
  return apiClient.post<PayWithSavedCardResponse>(
    `/organizations/${organizationId}/invoices/${invoiceId}/pay-saved`,
    data,
  );
}

export async function getInvoicePaymentStatus(
  organizationId: string,
  invoiceId: string,
): Promise<PaymentStatusResponse> {
  return apiClient.get<PaymentStatusResponse>(
    `/organizations/${organizationId}/invoices/${invoiceId}/payment-status`,
  );
}
