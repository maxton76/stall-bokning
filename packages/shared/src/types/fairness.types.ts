/**
 * Fairness types for the distribution system
 */

/**
 * Status filter for fairness distribution queries
 * - "all": Both completed and planned (assigned) routines
 * - "completed": Only completed routines (current behavior)
 * - "planned": Only pending/assigned routines that have a specific user assigned
 */
export type FairnessStatusFilter = "all" | "completed" | "planned";

/**
 * Scope for fairness distribution queries
 * - "stable": Only data from a single stable (default)
 * - "organization": Aggregate data across all stables in the organization
 */
export type FairnessScope = "stable" | "organization";

/**
 * Time period for fairness distribution
 */
export type FairnessPeriod = "week" | "month" | "quarter" | "year";

/**
 * Stable summary in organization scope
 */
export interface StableFairnessSummary {
  stableId: string;
  stableName: string;
  totalPoints: number;
  memberCount: number;
}

/**
 * Template breakdown for points distribution
 */
export interface TemplatePointsBreakdown {
  templateId: string;
  templateName: string;
  templateType: "morning" | "midday" | "evening" | "custom";
  templateColor?: string;
  totalPoints: number;
  instanceCount: number;
}

/**
 * Member fairness data
 */
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

  // Organization scope: which stables the member belongs to
  stables?: Array<{ stableId: string; stableName: string }>;
}

/**
 * Fairness distribution response
 */
export interface FairnessDistribution {
  stableId: string;
  stableName?: string;
  period: FairnessPeriod;
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

  // New fields for enhanced features
  scope?: FairnessScope;
  stables?: StableFairnessSummary[];
  templateBreakdown?: TemplatePointsBreakdown[];
}
