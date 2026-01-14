import type { HorseColor } from "@/types/roles";

/**
 * Horse Color Utilities
 * Maps horse color enum values to CSS color values for UI display
 */

/**
 * Color palette for horse colors
 * Provides Tailwind-compatible color values for avatar backgrounds
 */
const HORSE_COLOR_MAP: Record<
  HorseColor,
  { bg: string; text: string; name: string }
> = {
  black: {
    bg: "bg-gray-900",
    text: "text-white",
    name: "Black",
  },
  brown: {
    bg: "bg-amber-800",
    text: "text-white",
    name: "Brown",
  },
  bay_brown: {
    bg: "bg-amber-900",
    text: "text-white",
    name: "Bay Brown",
  },
  dark_brown: {
    bg: "bg-stone-800",
    text: "text-white",
    name: "Dark Brown",
  },
  chestnut: {
    bg: "bg-orange-700",
    text: "text-white",
    name: "Chestnut",
  },
  grey: {
    bg: "bg-gray-400",
    text: "text-gray-900",
    name: "Grey",
  },
  strawberry: {
    bg: "bg-rose-300",
    text: "text-gray-900",
    name: "Strawberry",
  },
  piebald: {
    bg: "bg-gradient-to-br from-gray-900 to-white",
    text: "text-gray-900",
    name: "Piebald",
  },
  skewbald: {
    bg: "bg-gradient-to-br from-amber-800 to-white",
    text: "text-gray-900",
    name: "Skewbald",
  },
  dun: {
    bg: "bg-yellow-600",
    text: "text-white",
    name: "Dun",
  },
  cream: {
    bg: "bg-amber-100",
    text: "text-gray-900",
    name: "Cream",
  },
  palomino: {
    bg: "bg-yellow-300",
    text: "text-gray-900",
    name: "Palomino",
  },
  appaloosa: {
    bg: "bg-gradient-to-br from-gray-100 via-gray-300 to-gray-500",
    text: "text-gray-900",
    name: "Appaloosa",
  },
};

/**
 * Get Tailwind CSS classes for a horse color
 *
 * @param color - The horse color
 * @returns Object with background and text color CSS classes
 *
 * @example
 * ```tsx
 * const { bg, text } = getHorseColorClasses('chestnut')
 * return <div className={`${bg} ${text}`}>...</div>
 * ```
 */
export function getHorseColorClasses(color: HorseColor) {
  return HORSE_COLOR_MAP[color] || HORSE_COLOR_MAP.grey;
}

/**
 * Get display name for a horse color
 *
 * @param color - The horse color
 * @returns Human-readable color name
 *
 * @example
 * ```tsx
 * getHorseColorName('bay_brown') // "Bay Brown"
 * ```
 */
export function getHorseColorName(color: HorseColor): string {
  return HORSE_COLOR_MAP[color]?.name || "Unknown";
}

/**
 * Get initials from horse name
 *
 * @param name - The horse name
 * @returns First letter of name (uppercase)
 *
 * @example
 * ```tsx
 * getHorseInitial('Flash gordon') // "F"
 * getHorseInitial('') // "?"
 * ```
 */
export function getHorseInitial(name: string): string {
  if (!name || name.trim().length === 0) {
    return "?";
  }
  return name.trim()[0]!.toUpperCase();
}
