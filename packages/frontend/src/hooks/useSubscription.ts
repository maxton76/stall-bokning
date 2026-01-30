/**
 * Subscription Hooks
 *
 * TanStack Query hooks for subscription management.
 */

import { useQueryClient } from "@tanstack/react-query";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import {
  getSubscriptionDetails,
  createSubscriptionCheckout,
  createCustomerPortal,
  cancelSubscription,
  resumeSubscription,
  getBillingHistory,
} from "@/services/subscriptionService";
import type { BillingInterval, SubscriptionTier } from "@equiduty/shared";

const SUBSCRIPTION_KEY = "subscription";

export function useSubscriptionDetails(orgId: string | null) {
  return useApiQuery(
    [SUBSCRIPTION_KEY, orgId],
    () => getSubscriptionDetails(orgId!),
    {
      enabled: !!orgId,
      staleTime: 30 * 1000, // 30 seconds
    },
  );
}

export function useCreateCheckout(orgId: string) {
  return useApiMutation(
    (data: { tier: SubscriptionTier; billingInterval: BillingInterval }) =>
      createSubscriptionCheckout(orgId, data),
    {
      onSuccess: (data) => {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      },
      errorMessage: "Failed to start checkout",
    },
  );
}

export function useCustomerPortal(orgId: string) {
  return useApiMutation((_?: void) => createCustomerPortal(orgId), {
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    errorMessage: "Failed to open billing portal",
  });
}

export function useCancelSubscription(orgId: string) {
  const queryClient = useQueryClient();

  return useApiMutation((_?: void) => cancelSubscription(orgId), {
    successMessage:
      "Subscription will be canceled at the end of the billing period",
    errorMessage: "Failed to cancel subscription",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUBSCRIPTION_KEY, orgId] });
    },
  });
}

export function useResumeSubscription(orgId: string) {
  const queryClient = useQueryClient();

  return useApiMutation((_?: void) => resumeSubscription(orgId), {
    successMessage: "Subscription resumed",
    errorMessage: "Failed to resume subscription",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUBSCRIPTION_KEY, orgId] });
    },
  });
}

export function useBillingHistory(orgId: string | null) {
  return useApiQuery(
    ["billingHistory", orgId],
    () => getBillingHistory(orgId!),
    {
      enabled: !!orgId,
    },
  );
}
