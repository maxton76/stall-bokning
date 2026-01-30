import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { apiClient } from "@/lib/apiClient";

/**
 * Hook that monitors app state and updates the onboarding detection context.
 * This enables auto-completion of onboarding steps based on real user actions.
 *
 * Should be rendered inside both OnboardingProvider and AuthProvider.
 */
export function useOnboardingDetection() {
  const { user } = useAuth();
  const { state, updateDetectionContext } = useOnboarding();

  useEffect(() => {
    if (!user || !state || state.dismissed) return;

    let cancelled = false;

    async function detectCounts() {
      try {
        // Fetch counts in parallel
        const [stablesRes, horsesRes, membersRes] = await Promise.allSettled([
          apiClient.get<{ stables: unknown[] }>("/stables"),
          apiClient.get<{ horses: unknown[] }>("/horses?scope=my"),
          apiClient.get<{ members: unknown[] }>("/organization-members"),
        ]);

        if (cancelled) return;

        const stableCount =
          stablesRes.status === "fulfilled"
            ? (stablesRes.value.stables?.length ?? 0)
            : 0;
        const horseCount =
          horsesRes.status === "fulfilled"
            ? (horsesRes.value.horses?.length ?? 0)
            : 0;
        const memberCount =
          membersRes.status === "fulfilled"
            ? (membersRes.value.members?.length ?? 0)
            : 0;

        updateDetectionContext({
          stableCount,
          horseCount,
          memberCount,
          hasStableMembership: stableCount > 0 || memberCount > 0,
        });
      } catch (error) {
        console.error("Onboarding detection fetch failed:", error);
      }
    }

    // Fetch organization name for stable_owner variant
    async function detectOrganization() {
      try {
        const res = await apiClient.get<{
          organizations: Array<{ name: string }>;
        }>("/organizations");

        if (cancelled) return;

        const org = res.organizations?.[0];
        if (org) {
          updateDetectionContext({ organizationName: org.name });
        }
      } catch {
        // Non-critical, ignore
      }
    }

    detectCounts();
    if (state.guideVariant === "stable_owner") {
      detectOrganization();
    }

    // Re-check every 30 seconds while guide is active
    const interval = setInterval(() => {
      detectCounts();
      if (state.guideVariant === "stable_owner") {
        detectOrganization();
      }
    }, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user?.uid, state?.guideVariant, state?.dismissed]);
}
