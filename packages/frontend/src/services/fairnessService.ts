import { apiClient } from "@/lib/apiClient";

// ==================== Types ====================

export interface MemberFairnessData {
  userId: string;
  displayName: string;
  email: string;
  avatar?: string;

  // Points data
  totalPoints: number;
  pointsThisPeriod: number;

  // Task counts
  tasksCompleted: number;
  tasksThisPeriod: number;

  // Estimated hours (points * 30 min estimated per point)
  estimatedHoursWorked: number;

  // Fairness metrics
  fairnessScore: number; // 0-100, 50 = average
  percentageOfTotal: number;
  deviationFromAverage: number; // Negative = under, Positive = over

  // Trend data
  trend: "up" | "down" | "stable";
  trendValue: number;
}

export interface FairnessDistribution {
  stableId: string;
  stableName?: string;
  period: "week" | "month" | "quarter" | "year";
  periodStartDate: string;
  periodEndDate: string;

  // Aggregate stats
  totalPoints: number;
  totalTasks: number;
  averagePointsPerMember: number;
  averageTasksPerMember: number;
  activeMemberCount: number;

  // Member data
  members: MemberFairnessData[];

  // Fairness metrics
  fairnessIndex: number; // 0-100, higher = more fair
  giniCoefficient: number; // 0 = perfect equality, 1 = max inequality

  // Generated timestamp
  generatedAt: string;
}

export interface MemberPointsHistory {
  userId: string;
  displayName: string;
  history: {
    date: string;
    points: number;
    cumulativePoints: number;
    tasksCompleted: number;
  }[];
  totalPoints: number;
  averagePointsPerDay: number;
}

export interface AssignmentSuggestion {
  userId: string;
  displayName: string;
  historicalPoints: number;
  priority: number; // 1-10, higher = should be assigned more
}

export type FairnessPeriod = "week" | "month" | "quarter" | "year";

// ==================== API Functions ====================

/**
 * Get fairness distribution data for a stable
 */
export async function getFairnessDistribution(
  stableId: string,
  period: FairnessPeriod = "month",
): Promise<FairnessDistribution> {
  const response = await apiClient.get<{ distribution: FairnessDistribution }>(
    `/fairness/distribution/${stableId}`,
    { period },
  );

  return response.distribution;
}

/**
 * Get points history for a specific member
 */
export async function getMemberPointsHistory(
  userId: string,
  stableId: string,
  days: number = 90,
): Promise<MemberPointsHistory> {
  const response = await apiClient.get<{ memberHistory: MemberPointsHistory }>(
    `/fairness/member/${userId}/history`,
    { stableId, days: days.toString() },
  );

  return response.memberHistory;
}

/**
 * Get assignment suggestions based on fairness algorithm
 */
export async function getAssignmentSuggestions(
  stableId: string,
  limit: number = 5,
): Promise<{ suggestions: AssignmentSuggestion[]; totalMembers: number }> {
  const response = await apiClient.get<{
    suggestions: AssignmentSuggestion[];
    totalMembers: number;
  }>(`/fairness/suggestions/${stableId}`, { limit: limit.toString() });

  return response;
}

// ==================== Utility Functions ====================

/**
 * Get a descriptive label for fairness score
 */
export function getFairnessLabel(score: number): string {
  if (score < 30) return "Under genomsnitt";
  if (score < 45) return "Något under";
  if (score <= 55) return "Balanserad";
  if (score < 70) return "Något över";
  return "Över genomsnitt";
}

/**
 * Get color class for fairness score
 */
export function getFairnessColor(score: number): string {
  if (score < 30) return "text-blue-600";
  if (score < 45) return "text-blue-500";
  if (score <= 55) return "text-green-600";
  if (score < 70) return "text-amber-500";
  return "text-amber-600";
}

/**
 * Get background color class for fairness score bar
 */
export function getFairnessBarColor(score: number): string {
  if (score < 30) return "bg-blue-500";
  if (score < 45) return "bg-blue-400";
  if (score <= 55) return "bg-green-500";
  if (score < 70) return "bg-amber-400";
  return "bg-amber-500";
}

/**
 * Get trend icon name based on trend direction
 */
export function getTrendIcon(trend: "up" | "down" | "stable"): string {
  switch (trend) {
    case "up":
      return "TrendingUp";
    case "down":
      return "TrendingDown";
    default:
      return "Minus";
  }
}

/**
 * Get trend color class
 */
export function getTrendColor(trend: "up" | "down" | "stable"): string {
  switch (trend) {
    case "up":
      return "text-red-500"; // Up means more work (bad for fairness if over average)
    case "down":
      return "text-green-500";
    default:
      return "text-gray-400";
  }
}

/**
 * Format period label for display
 */
export function formatPeriodLabel(period: FairnessPeriod): string {
  switch (period) {
    case "week":
      return "Senaste veckan";
    case "month":
      return "Senaste månaden";
    case "quarter":
      return "Senaste kvartalet";
    case "year":
      return "Senaste året";
  }
}
