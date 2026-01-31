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
        // Fetch base counts in parallel
        const [stablesRes, horsesRes, membersRes] = await Promise.allSettled([
          apiClient.get<{ stables: Array<{ id: string }> }>("/stables"),
          apiClient.get<{ horses: unknown[] }>("/horses?scope=my"),
          apiClient.get<{ members: unknown[] }>("/organization-members"),
        ]);

        if (cancelled) return;

        const stables =
          stablesRes.status === "fulfilled"
            ? (stablesRes.value.stables ?? [])
            : [];
        const stableCount = stables.length;
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

        // For stable_owner: fetch additional counts using first stable ID
        if (state?.guideVariant === "stable_owner" && stables.length > 0) {
          const stableId = stables[0]!.id;
          fetchStableSpecificCounts(stableId);
        }
      } catch (error) {
        console.error("Onboarding detection fetch failed:", error);
      }
    }

    async function fetchStableSpecificCounts(stableId: string) {
      try {
        const [activitiesRes, feedingTimesRes, routineSchedulesRes] =
          await Promise.allSettled([
            apiClient.get<{ activities: unknown[] }>(
              `/activities/care?stableIds=${stableId}`,
            ),
            apiClient.get<{ feedingTimes: unknown[] }>(
              `/feeding-times/stable/${stableId}`,
            ),
            apiClient.get<{ schedules: unknown[] }>(
              `/routine-schedules?stableId=${stableId}`,
            ),
          ]);

        if (cancelled) return;

        const healthActivityCount =
          activitiesRes.status === "fulfilled"
            ? (activitiesRes.value.activities?.length ?? 0)
            : 0;

        const feedingScheduleCount =
          feedingTimesRes.status === "fulfilled"
            ? (feedingTimesRes.value.feedingTimes?.length ?? 0)
            : 0;

        const routineScheduleCount =
          routineSchedulesRes.status === "fulfilled"
            ? (routineSchedulesRes.value.schedules?.length ?? 0)
            : 0;

        updateDetectionContext({
          healthActivityCount,
          feedingScheduleCount,
          routineScheduleCount,
        });
      } catch {
        // Non-critical, ignore
      }
    }

    // Fetch organization details for stable_owner variant
    async function detectOrganization() {
      try {
        const res = await apiClient.get<{
          organizations: Array<{
            id: string;
            name: string;
            contactType?: string;
          }>;
        }>("/organizations");

        if (cancelled) return;

        const org = res.organizations?.[0];
        if (org) {
          updateDetectionContext({
            organizationName: org.name,
            organizationContactType: org.contactType,
          });

          // Fetch org-specific counts: feed types + routine templates
          fetchOrgSpecificCounts(org.id);
        }
      } catch {
        // Non-critical, ignore
      }
    }

    async function fetchOrgSpecificCounts(orgId: string) {
      try {
        const [feedTypesRes, templatesRes] = await Promise.allSettled([
          apiClient.get<{ feedTypes: unknown[] }>(
            `/feed-types/organization/${orgId}`,
          ),
          apiClient.get<{
            templates?: unknown[];
            routineTemplates?: unknown[];
          }>(`/routines/templates?organizationId=${orgId}`),
        ]);

        if (cancelled) return;

        const feedTypeCount =
          feedTypesRes.status === "fulfilled"
            ? (feedTypesRes.value.feedTypes?.length ?? 0)
            : 0;

        const routineTemplateCount =
          templatesRes.status === "fulfilled"
            ? (templatesRes.value.templates?.length ??
              templatesRes.value.routineTemplates?.length ??
              0)
            : 0;

        updateDetectionContext({
          feedTypeCount,
          routineTemplateCount,
        });
      } catch {
        // Non-critical, ignore
      }
    }

    // Fetch planning activities count (uses different endpoint pattern)
    async function detectPlanningActivities() {
      // Planning activities are detected via visitedRoutes fallback
      // No dedicated count endpoint without stableId context
      // The visitedRoutes.has("/activities/planning") handles this in the step config
    }

    detectCounts();
    if (state.guideVariant === "stable_owner") {
      detectOrganization();
      detectPlanningActivities();
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
