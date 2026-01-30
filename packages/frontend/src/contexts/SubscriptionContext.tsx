import { createContext, useContext, useMemo, ReactNode } from "react";
import { useOrganizationContext } from "./OrganizationContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys } from "@/lib/queryClient";
import { getOrganization } from "@/services/organizationService";
import {
  TIER_LIMITS,
  TIER_MODULES,
  TIER_ADDONS,
} from "@equiduty/shared/constants/tierDefaults";
import type {
  SubscriptionTier,
  SubscriptionLimits,
  ModuleFlags,
  SubscriptionAddons,
} from "@equiduty/shared";
import type { Organization } from "@equiduty/shared";

interface SubscriptionContextType {
  tier: SubscriptionTier;
  status: string | null;
  limits: SubscriptionLimits;
  modules: ModuleFlags;
  addons: SubscriptionAddons;
  isFeatureAvailable: (module: keyof ModuleFlags) => boolean;
  isWithinLimit: (
    key: keyof SubscriptionLimits,
    currentCount: number,
  ) => boolean;
  isLoading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined,
);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { currentOrganizationId } = useOrganizationContext();

  const { data: organization, isLoading } = useApiQuery<Organization | null>(
    queryKeys.organizations.detail(currentOrganizationId || ""),
    () => getOrganization(currentOrganizationId!),
    {
      enabled: !!currentOrganizationId,
      staleTime: 5 * 60 * 1000,
    },
  );

  const value = useMemo<SubscriptionContextType>(() => {
    const tier: SubscriptionTier = organization?.subscriptionTier ?? "free";
    const status = organization?.stripeSubscription?.status ?? null;
    const limits = TIER_LIMITS[tier];
    const modules = TIER_MODULES[tier];
    const addons = TIER_ADDONS[tier];

    return {
      tier,
      status,
      limits,
      modules,
      addons,
      isFeatureAvailable: (module: keyof ModuleFlags) => modules[module],
      isWithinLimit: (key: keyof SubscriptionLimits, currentCount: number) => {
        const limit = limits[key];
        return limit === -1 || currentCount < limit;
      },
      isLoading,
    };
  }, [organization, isLoading]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error(
      "useSubscription must be used within a SubscriptionProvider",
    );
  }
  return context;
}
