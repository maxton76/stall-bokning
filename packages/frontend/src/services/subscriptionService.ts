/**
 * Subscription Service
 *
 * API client functions for platform subscription management.
 */

import { apiClient } from "@/lib/apiClient";
import type {
  CreateSubscriptionCheckoutData,
  SubscriptionDetailsResponse,
  BillingHistoryResponse,
  CheckoutSessionResponse,
  CustomerPortalResponse,
} from "@equiduty/shared";

export async function getSubscriptionDetails(
  orgId: string,
): Promise<SubscriptionDetailsResponse> {
  return apiClient.get<SubscriptionDetailsResponse>(
    `/organizations/${orgId}/subscription`,
  );
}

export async function createSubscriptionCheckout(
  orgId: string,
  data: CreateSubscriptionCheckoutData,
): Promise<CheckoutSessionResponse> {
  return apiClient.post<CheckoutSessionResponse>(
    `/organizations/${orgId}/subscription/checkout`,
    data,
  );
}

export async function createCustomerPortal(
  orgId: string,
): Promise<CustomerPortalResponse> {
  return apiClient.post<CustomerPortalResponse>(
    `/organizations/${orgId}/subscription/portal`,
  );
}

export async function cancelSubscription(
  orgId: string,
): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>(
    `/organizations/${orgId}/subscription/cancel`,
  );
}

export async function resumeSubscription(
  orgId: string,
): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>(
    `/organizations/${orgId}/subscription/resume`,
  );
}

export async function getBillingHistory(
  orgId: string,
  params?: { limit?: number; starting_after?: string },
): Promise<BillingHistoryResponse> {
  return apiClient.get<BillingHistoryResponse>(
    `/organizations/${orgId}/subscription/invoices`,
    params,
  );
}
