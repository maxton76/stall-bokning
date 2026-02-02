import type {
  ActivityTypeCategory,
  CreateActivityTypeData,
} from "@/types/activity";

/**
 * Standard activity types provided by the system
 * These are seeded automatically when a stable is created
 */

interface StandardActivityType {
  name: string;
  color: string;
  category: ActivityTypeCategory;
  roles: string[];
  icon: string;
  sortOrder: number;
}

/**
 * 16 standard activity types organized by category
 * Care: Healthcare and maintenance activities
 * Sport: Training and competition activities
 * Breeding: Reproduction-related activities
 */
export const STANDARD_ACTIVITY_TYPES: StandardActivityType[] = [
  // === Care Category (sortOrder 1-6) ===
  {
    name: "Dentist",
    color: "#22c55e", // green
    category: "Care",
    roles: ["dentist"],
    icon: "🦷",
    sortOrder: 1,
  },
  {
    name: "Deworm",
    color: "#a855f7", // purple
    category: "Care",
    roles: ["veterinarian", "stable-hand"],
    icon: "💊",
    sortOrder: 2,
  },
  {
    name: "Farrier",
    color: "#f97316", // orange
    category: "Care",
    roles: ["farrier"],
    icon: "🔨",
    sortOrder: 3,
  },
  {
    name: "Influenza",
    color: "#3b82f6", // blue
    category: "Care",
    roles: ["veterinarian"],
    icon: "💉",
    sortOrder: 4,
  },
  {
    name: "Vaccination",
    color: "#06b6d4", // cyan
    category: "Care",
    roles: ["veterinarian"],
    icon: "💉",
    sortOrder: 5,
  },
  {
    name: "Vet",
    color: "#ef4444", // red
    category: "Care",
    roles: ["veterinarian"],
    icon: "🏥",
    sortOrder: 6,
  },

  // === Sport Category (sortOrder 7-12) ===
  {
    name: "Client",
    color: "#eab308", // yellow
    category: "Sport",
    roles: ["rider", "instructor"],
    icon: "👤",
    sortOrder: 7,
  },
  {
    name: "Lesson",
    color: "#22c55e", // green
    category: "Sport",
    roles: ["instructor", "rider"],
    icon: "📚",
    sortOrder: 8,
  },
  {
    name: "Lunging",
    color: "#8b5cf6", // purple (violet)
    category: "Sport",
    roles: ["trainer", "rider"],
    icon: "🎯",
    sortOrder: 9,
  },
  {
    name: "Paddock",
    color: "#84cc16", // lime
    category: "Sport",
    roles: ["stable-hand"],
    icon: "🏞️",
    sortOrder: 10,
  },
  {
    name: "Riding",
    color: "#6366f1", // indigo
    category: "Sport",
    roles: ["rider"],
    icon: "🏇",
    sortOrder: 11,
  },
  {
    name: "Show",
    color: "#ec4899", // pink
    category: "Sport",
    roles: ["rider", "trainer"],
    icon: "🏆",
    sortOrder: 12,
  },

  // === Breeding Category (sortOrder 13-16) ===
  {
    name: "Foaling",
    color: "#f43f5e", // rose
    category: "Breeding",
    roles: ["veterinarian", "breeder"],
    icon: "🐴",
    sortOrder: 13,
  },
  {
    name: "Insemination",
    color: "#d946ef", // fuchsia
    category: "Breeding",
    roles: ["veterinarian", "breeder"],
    icon: "🧬",
    sortOrder: 14,
  },
  {
    name: "Mare Cycle Check",
    color: "#14b8a6", // teal
    category: "Breeding",
    roles: ["veterinarian", "breeder"],
    icon: "📅",
    sortOrder: 15,
  },
  {
    name: "Stallion Mount",
    color: "#0ea5e9", // sky
    category: "Breeding",
    roles: ["breeder", "handler"],
    icon: "🐎",
    sortOrder: 16,
  },
];

/**
 * Convert standard types to CreateActivityTypeData format
 * Used for seeding database with standard types
 */
export function getStandardTypesForSeeding(): CreateActivityTypeData[] {
  return STANDARD_ACTIVITY_TYPES.map((type) => ({
    name: type.name,
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
