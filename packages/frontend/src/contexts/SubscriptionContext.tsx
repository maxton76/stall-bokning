import { createContext, useContext, useMemo, ReactNode } from "react";
import { useOrganizationContext } from "./OrganizationContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys } from "@/lib/queryClient";
import { getOrganization } from "@/services/organizationService";
import { useTierDefinitions } from "@/hooks/useTierDefinitions";
import {
  DEFAULT_TIER_DEFINITIONS,
  getDefaultTierDefinition,
} from "@equiduty/shared/constants/tierDefaults";
import type {
  SubscriptionLimits,
  ModuleFlags,
  SubscriptionAddons,
} from "@equiduty/shared";
import type { Organization } from "@equiduty/shared";

// Inline free-tier fallbacks — ultimate safety net if API + defaults both fail
const FREE_LIMITS_FALLBACK: SubscriptionLimits = {
  members: 3,
  stables: 1,
  horses: 5,
  routineTemplates: 2,
  routineSchedules: 1,
  feedingPlans: 5,
  facilities: 1,
  contacts: 5,
  supportContacts: 0,
};

const FREE_MODULES_FALLBACK: ModuleFlags = {
  analytics: false,
  selectionProcess: false,
  locationHistory: false,
  photoEvidence: false,
  leaveManagement: false,
  inventory: false,
  lessons: false,
  staffMatrix: false,
  advancedPermissions: false,
  integrations: false,
  manure: false,
  aiAssistant: false,
  supportAccess: false,
};

const FREE_ADDONS_FALLBACK: SubscriptionAddons = {
  portal: false,
  invoicing: false,
};

interface SubscriptionContextType {
  tier: string;
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
  /** The organization type (personal or business) */
  organizationType: "personal" | "business" | null;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined,
);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { currentOrganizationId } = useOrganizationContext();

  const { data: organization, isLoading: orgLoading } =
    useApiQuery<Organization | null>(
      queryKeys.organizations.detail(currentOrganizationId || ""),
      () => getOrganization(currentOrganizationId!),
      {
        enabled: !!currentOrganizationId,
        staleTime: 5 * 60 * 1000,
      },
    );

  const { getTier, isLoading: tiersLoading } = useTierDefinitions();

  const isLoading = orgLoading || tiersLoading;

  const value = useMemo<SubscriptionContextType>(() => {
    const tier: string = organization?.subscriptionTier ?? "";
    const status = organization?.stripeSubscription?.status ?? null;

    // Priority: fetched tier defaults (API) → built-in defaults → default tier fallback
    const tierDef =
      (tier ? getTier(tier) : null) ??
      (tier ? DEFAULT_TIER_DEFINITIONS[tier] : null) ??
      getDefaultTierDefinition();
    const limits = tierDef?.limits ?? FREE_LIMITS_FALLBACK;
    const modules = tierDef?.modules ?? FREE_MODULES_FALLBACK;
    const addons = tierDef?.addons ?? FREE_ADDONS_FALLBACK;

    return {
      tier: tier || tierDef.tier,
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
      organizationType: organization?.organizationType ?? null,
    };
  }, [organization, isLoading, getTier]);

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
