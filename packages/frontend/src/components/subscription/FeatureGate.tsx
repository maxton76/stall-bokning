import { ReactNode } from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { UpgradePrompt } from "./UpgradePrompt";
import type { ModuleFlags, SubscriptionLimits } from "@equiduty/shared";

interface FeatureGateProps {
  /** Module that must be enabled */
  module?: keyof ModuleFlags;
  /** Limit key to check against */
  limit?: keyof SubscriptionLimits;
  /** Current count for limit check */
  currentCount?: number;
  /** Custom fallback instead of the default upgrade prompt */
  fallback?: ReactNode;
  children: ReactNode;
}

export function FeatureGate({
  module,
  limit,
  currentCount = 0,
  fallback,
  children,
}: FeatureGateProps) {
  const { isFeatureAvailable, isWithinLimit } = useSubscription();

  if (module && !isFeatureAvailable(module)) {
    return fallback ?? <UpgradePrompt module={module} />;
  }

  if (limit && !isWithinLimit(limit, currentCount)) {
    return fallback ?? <UpgradePrompt limit={limit} />;
  }

  return <>{children}</>;
}
