/**
 * Horse Constants
 * Consolidated from frontend/src/constants/horseConstants.ts
 *
 * Horse color options, usage categories, and gender options
 */

import type { HorseColor, HorseUsage } from "../types/domain.js";

/**
 * Horse color options with display labels
 */
export const HORSE_COLORS: Array<{ value: HorseColor; label: string }> = [
  { value: "black", label: "Black" },
  { value: "brown", label: "Brown" },
  { value: "bay_brown", label: "Bay brown" },
  { value: "dark_brown", label: "Dark brown" },
  { value: "chestnut", label: "Chestnut" },
  { value: "grey", label: "Grey" },
  { value: "strawberry", label: "Strawberry" },
  { value: "piebald", label: "Piebald" },
  { value: "skewbald", label: "Skewbald" },
  { value: "dun", label: "Dun" },
  { value: "cream", label: "Cream" },
  { value: "palomino", label: "Palomino" },
  { value: "appaloosa", label: "Appaloosa" },
];

/**
 * Horse usage options with display labels and icons
 */
export const HORSE_USAGE_OPTIONS: Array<{
  value: HorseUsage;
  label: string;
  icon: string;
  color: string;
}> = [
  { value: "care", label: "Care", icon: "🩷", color: "purple" },
  { value: "sport", label: "Sport", icon: "🏃", color: "green" },
  { value: "breeding", label: "Breeding", icon: "🧬", color: "amber" },
];

/**
 * Gender options
 */
export const HORSE_GENDERS = [
  { value: "stallion", label: "Stallion" },
  { value: "mare", label: "Mare" },
  { value: "gelding", label: "Gelding" },
] as const;
