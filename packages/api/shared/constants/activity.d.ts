/**
 * Activity Constants
 * Consolidated from frontend/src/constants/standardActivityTypes.ts
 *
 * Standard activity types and default color palette
 */
/**
 * Activity type category
 */
export type ActivityTypeCategory = "Sport" | "Care" | "Breeding";
/**
 * Standard activity type interface
 */
export interface StandardActivityType {
  name: string;
  color: string;
  category: ActivityTypeCategory;
  roles: string[];
  icon: string;
  sortOrder: number;
}
/**
 * Create activity type data (for seeding)
 */
export interface CreateActivityTypeData {
  name: string;
  color: string;
  category: ActivityTypeCategory;
  roles: string[];
  icon: string;
  isStandard: boolean;
  isActive: boolean;
  sortOrder: number;
}
/**
 * 16 standard activity types organized by category
 * Care: Healthcare and maintenance activities
 * Sport: Training and competition activities
 * Breeding: Reproduction-related activities
 */
export declare const STANDARD_ACTIVITY_TYPES: StandardActivityType[];
/**
 * Convert standard types to CreateActivityTypeData format
 * Used for seeding database with standard types
 */
export declare function getStandardTypesForSeeding(): CreateActivityTypeData[];
/**
 * Get standard type by name for migration purposes
 */
export declare function getStandardTypeByName(
  name: string,
): StandardActivityType | undefined;
/**
 * Default color palette for tasks/messages
 * 17 Tailwind CSS colors
 */
export declare const DEFAULT_COLORS: readonly [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
];
//# sourceMappingURL=activity.d.ts.map
