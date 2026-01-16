import type { FacilityType } from "@/types/facility";

/**
 * Human-readable labels for facility types.
 * Used across reservation pages, facility management, and calendar views.
 */
export const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  transport: "Transport",
  water_treadmill: "Water treadmill",
  indoor_arena: "Indoor arena",
  outdoor_arena: "Outdoor arena",
  galloping_track: "Galloping track",
  lunging_ring: "Lunging ring",
  paddock: "Paddock",
  solarium: "Solarium",
  jumping_yard: "Jumping yard",
  treadmill: "Treadmill",
  vibration_plate: "Vibration plate",
  pasture: "Pasture",
  walker: "Walker",
  other: "Other",
};

/**
 * Reservation status configuration with labels and badge variants.
 * Provides consistent styling and labeling across all reservation views.
 */
export const RESERVATION_STATUS = {
  pending: { label: "Pending", variant: "secondary" as const },
  confirmed: { label: "Confirmed", variant: "default" as const },
  rejected: { label: "Rejected", variant: "destructive" as const },
  cancelled: { label: "Cancelled", variant: "outline" as const },
  completed: { label: "Completed", variant: "outline" as const },
  no_show: { label: "No Show", variant: "destructive" as const },
} as const;

export type ReservationStatus = keyof typeof RESERVATION_STATUS;

/**
 * Badge variant mapping for reservation statuses.
 * For components using variant-only styling.
 */
export const STATUS_BADGE_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = Object.fromEntries(
  Object.entries(RESERVATION_STATUS).map(([key, value]) => [
    key,
    value.variant,
  ]),
) as Record<string, "default" | "secondary" | "destructive" | "outline">;

/**
 * Status labels for display.
 */
export const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(RESERVATION_STATUS).map(([key, value]) => [key, value.label]),
) as Record<string, string>;

/**
 * CSS class colors for status badges (for custom styling).
 * Used in components that need Tailwind color classes instead of badge variants.
 */
export const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
  completed: "bg-blue-100 text-blue-800",
  no_show: "bg-red-100 text-red-800",
};
