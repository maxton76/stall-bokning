/**
 * Calendar Component Constants
 * Centralized configuration values for the custom facility booking calendar
 */

export const CALENDAR_DEFAULTS = {
  /** Minutes per time slot (default: 30-minute intervals, M365-style) */
  SLOT_DURATION_MINUTES: 30,

  /** Earliest time shown on calendar (HH:mm format) */
  SLOT_MIN_TIME: "06:00",

  /** Latest time shown on calendar (HH:mm format) */
  SLOT_MAX_TIME: "22:00",

  /** Row height for virtualized resource rows (pixels) */
  VIRTUALIZER_ROW_HEIGHT: 80,

  /** Number of extra rows to render outside viewport */
  VIRTUALIZER_OVERSCAN: 2,

  /** Pixels of drag movement required before drag starts */
  DRAG_ACTIVATION_DISTANCE: 8,

  /** Screen width threshold for mobile view (pixels) */
  MOBILE_BREAKPOINT: 768,

  /** Minimum number of facilities before enabling virtualization */
  VIRTUALIZATION_THRESHOLD: 10,
} as const;

export const GRID_DIMENSIONS = {
  /** Width of the facility name column (pixels) */
  RESOURCE_COLUMN_WIDTH: 200,

  /** Minimum width for each time slot (pixels) */
  MIN_SLOT_WIDTH: 60,

  /** Padding between row elements (pixels) */
  ROW_PADDING: 4,
} as const;

/**
 * Status colors for facility reservations
 * Using Tailwind palette with WCAG AA contrast (4.5:1 minimum)
 */
export const STATUS_COLORS = {
  pending: {
    bg: "bg-amber-500",
    border: "border-amber-600",
    text: "text-white",
  },
  confirmed: {
    bg: "bg-emerald-500",
    border: "border-emerald-600",
    text: "text-white",
  },
  cancelled: {
    bg: "bg-gray-500",
    border: "border-gray-600",
    text: "text-white",
  },
  completed: {
    bg: "bg-blue-500",
    border: "border-blue-600",
    text: "text-white",
  },
  no_show: {
    bg: "bg-red-500",
    border: "border-red-600",
    text: "text-white",
  },
  rejected: {
    bg: "bg-rose-500",
    border: "border-rose-600",
    text: "text-white",
  },
} as const;
