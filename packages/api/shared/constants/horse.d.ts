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
export declare const HORSE_COLORS: Array<{
  value: HorseColor;
  label: string;
}>;
/**
 * Horse usage options with display labels and icons
 */
export declare const HORSE_USAGE_OPTIONS: Array<{
  value: HorseUsage;
  label: string;
  icon: string;
  color: string;
}>;
/**
 * Gender options
 */
export declare const HORSE_GENDERS: readonly [
  {
    readonly value: "stallion";
    readonly label: "Stallion";
  },
  {
    readonly value: "mare";
    readonly label: "Mare";
  },
  {
    readonly value: "gelding";
    readonly label: "Gelding";
  },
];
//# sourceMappingURL=horse.d.ts.map
