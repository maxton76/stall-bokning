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
  key: string; // Translation key for i18n lookup (maps to constants:activityTypes.{key})
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
  key?: string; // Translation key for i18n lookup (only for standard types)
  color: string;
  category: ActivityTypeCategory;
  roles: string[];
  icon: string;
  isStandard: boolean;
  isActive: boolean;
  sortOrder: number;
}

/**
 * 14 standard activity types organized by category
 * Care: Healthcare and maintenance activities
 * Sport: Training and competition activities
 * Breeding: Reproduction-related activities
 */
export const STANDARD_ACTIVITY_TYPES: StandardActivityType[] = [
  // === Care Category (sortOrder 1-4) ===
  {
    name: "Dentist",
    key: "dentist",
    color: "#22c55e", // green
    category: "Care",
    roles: ["dentist"],
    icon: "🦷",
    sortOrder: 1,
  },
  {
    name: "Farrier",
    key: "farrier",
    color: "#f97316", // orange
    category: "Care",
    roles: ["farrier"],
    icon: "🔨",
    sortOrder: 2,
  },
  {
    name: "Vaccination",
    key: "vaccination",
    color: "#06b6d4", // cyan
    category: "Care",
    roles: ["veterinarian"],
    icon: "💉",
    sortOrder: 3,
  },
  {
    name: "Vet",
    key: "vet",
    color: "#ef4444", // red
    category: "Care",
    roles: ["veterinarian"],
    icon: "🏥",
    sortOrder: 4,
  },

  // === Sport Category (sortOrder 5-10) ===
  {
    name: "Client",
    key: "client",
    color: "#eab308", // yellow
    category: "Sport",
    roles: ["rider", "instructor"],
    icon: "👤",
    sortOrder: 5,
  },
  {
    name: "Lesson",
    key: "lesson",
    color: "#22c55e", // green
    category: "Sport",
    roles: ["instructor", "rider"],
    icon: "📚",
    sortOrder: 6,
  },
  {
    name: "Lunging",
    key: "lunging",
    color: "#8b5cf6", // purple (violet)
    category: "Sport",
    roles: ["trainer", "rider"],
    icon: "🎯",
    sortOrder: 7,
  },
  {
    name: "Paddock",
    key: "paddock",
    color: "#84cc16", // lime
    category: "Sport",
    roles: ["stable-hand"],
    icon: "🏞️",
    sortOrder: 8,
  },
  {
    name: "Riding",
    key: "riding",
    color: "#6366f1", // indigo
    category: "Sport",
    roles: ["rider"],
    icon: "🏇",
    sortOrder: 9,
  },
  {
    name: "Show",
    key: "show",
    color: "#ec4899", // pink
    category: "Sport",
    roles: ["rider", "trainer"],
    icon: "🏆",
    sortOrder: 10,
  },

  // === Breeding Category (sortOrder 11-14) ===
  {
    name: "Foaling",
    key: "foaling",
    color: "#f43f5e", // rose
    category: "Breeding",
    roles: ["veterinarian", "breeder"],
    icon: "🐴",
    sortOrder: 11,
  },
  {
    name: "Insemination",
    key: "insemination",
    color: "#d946ef", // fuchsia
    category: "Breeding",
    roles: ["veterinarian", "breeder"],
    icon: "🧬",
    sortOrder: 12,
  },
  {
    name: "Mare Cycle Check",
    key: "mareCycleCheck",
    color: "#14b8a6", // teal
    category: "Breeding",
    roles: ["veterinarian", "breeder"],
    icon: "📅",
    sortOrder: 13,
  },
  {
    name: "Stallion Mount",
    key: "stallionMount",
    color: "#0ea5e9", // sky
    category: "Breeding",
    roles: ["breeder", "handler"],
    icon: "🐎",
    sortOrder: 14,
  },
];

/**
 * Convert standard types to CreateActivityTypeData format
 * Used for seeding database with standard types
 */
export function getStandardTypesForSeeding(): CreateActivityTypeData[] {
  return STANDARD_ACTIVITY_TYPES.map((type) => ({
    name: type.name,
    key: type.key,
    color: type.color,
    category: type.category,
    roles: type.roles,
    icon: type.icon,
    isStandard: true,
    isActive: true,
    sortOrder: type.sortOrder,
  }));
}

/**
 * Get standard type by name for migration purposes
 */
export function getStandardTypeByName(
  name: string,
): StandardActivityType | undefined {
  return STANDARD_ACTIVITY_TYPES.find(
    (type) => type.name.toLowerCase() === name.toLowerCase(),
  );
}

/**
 * Get standard type by translation key
 */
export function getStandardTypeByKey(
  key: string,
): StandardActivityType | undefined {
  return STANDARD_ACTIVITY_TYPES.find((type) => type.key === key);
}

/**
 * Default color palette for tasks/messages
 * 17 Tailwind CSS colors
 */
export const DEFAULT_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#f43f5e", // rose
] as const;
