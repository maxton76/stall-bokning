import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getFairnessDistribution,
  getMemberPointsHistory,
  getAssignmentSuggestions,
  type FairnessDistribution,
  type MemberPointsHistory,
  type AssignmentSuggestion,
  type FairnessPeriod,
} from "@/services/fairnessService";

// ==================== Query Keys ====================

export const fairnessKeys = {
  all: ["fairness"] as const,
  distribution: (stableId: string) =>
    [...fairnessKeys.all, "distribution", stableId] as const,
  distributionWithPeriod: (stableId: string, period: FairnessPeriod) =>
    [...fairnessKeys.distribution(stableId), period] as const,
  memberHistory: (userId: string, stableId: string) =>
    [...fairnessKeys.all, "memberHistory", userId, stableId] as const,
  memberHistoryWithDays: (userId: string, stableId: string, days: number) =>
    [...fairnessKeys.memberHistory(userId, stableId), days] as const,
  suggestions: (stableId: string) =>
    [...fairnessKeys.all, "suggestions", stableId] as const,
};

// ==================== Hooks ====================

/**
 * Hook to fetch fairness distribution for a stable
 */
export function useFairnessDistribution(
  stableId: string | undefined,
  period: FairnessPeriod = "month",
) {
  return useQuery({
    queryKey: fairnessKeys.distributionWithPeriod(stableId || "", period),
    queryFn: async (): Promise<FairnessDistribution> => {
      if (!stableId) {
        throw new Error("stableId is required");
      }
      return getFairnessDistribution(stableId, period);
    },
    enabled: !!stableId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch points history for a specific member
 */
export function useMemberPointsHistory(
  userId: string | undefined,
  stableId: string | undefined,
  days: number = 90,
) {
  return useQuery({
    queryKey: fairnessKeys.memberHistoryWithDays(
      userId || "",
      stableId || "",
      days,
    ),
    queryFn: async (): Promise<MemberPointsHistory> => {
      if (!userId || !stableId) {
        throw new Error("userId and stableId are required");
      }
      return getMemberPointsHistory(userId, stableId, days);
    },
    enabled: !!userId && !!stableId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch assignment suggestions for a stable
 */
export function useAssignmentSuggestions(
  stableId: string | undefined,
  limit: number = 5,
) {
  return useQuery({
    queryKey: [...fairnessKeys.suggestions(stableId || ""), limit],
    queryFn: async (): Promise<{
      suggestions: AssignmentSuggestion[];
      totalMembers: number;
    }> => {
      if (!stableId) {
        throw new Error("stableId is required");
      }
      return getAssignmentSuggestions(stableId, limit);
    },
    enabled: !!stableId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to invalidate fairness data (call after completing routines)
 */
export function useInvalidateFairness() {
  const queryClient = useQueryClient();

  return {
    invalidateDistribution: (stableId: string) => {
      queryClient.invalidateQueries({
        queryKey: fairnessKeys.distribution(stableId),
      });
    },
    invalidateSuggestions: (stableId: string) => {
      queryClient.invalidateQueries({
        queryKey: fairnessKeys.suggestions(stableId),
      });
    },
    invalidateAll: (stableId: string) => {
      queryClient.invalidateQueries({
        queryKey: fairnessKeys.distribution(stableId),
      });
      queryClient.invalidateQueries({
        queryKey: fairnessKeys.suggestions(stableId),
      });
    },
  };
}
