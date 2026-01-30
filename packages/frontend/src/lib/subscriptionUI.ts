/**
 * Subscription UI Helpers
 *
 * Shared UI logic for subscription status display.
 */

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

/**
 * Map a Stripe subscription status to a shadcn/ui Badge variant.
 */
export function statusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case "active":
      return "default";
    case "trialing":
      return "secondary";
    case "past_due":
    case "unpaid":
      return "destructive";
    case "canceled":
      return "outline";
    default:
      return "outline";
  }
}

/**
 * Calculate the number of trial days remaining from a trial end date.
 * Returns 0 if no trial or trial has ended.
 */
export function getTrialDaysRemaining(trialEnd?: string): number {
  if (!trialEnd) return 0;
  return Math.max(
    0,
    Math.ceil(
      (new Date(trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    ),
  );
}
