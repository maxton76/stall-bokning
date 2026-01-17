/**
 * Recurrence Presets for Swedish Stables
 *
 * Based on research of typical Swedish stable operations:
 * - Helpension (full board): Staff handles all care
 * - Självskötare (DIY): Owner rotation system (groups of 4)
 * - Daily schedules: Morning feed (06-07), turnout (07-08), evening feed (17-18)
 * - Health care: Farrier every 4-6 weeks, vaccinations every 6 months
 */
import type { RecurringActivityCategory } from "../types/recurring.js";
/**
 * Recurrence preset with i18n support
 */
export interface RecurrencePreset {
  id: string;
  labelKey: string;
  descriptionKey: string;
  rrule: string;
  defaultTime?: string;
  category: RecurringActivityCategory;
  defaultDuration: number;
  defaultWeight: number;
  icon: string;
  color: string;
}
/**
 * Daily care presets (Daglig skötsel)
 */
export declare const DAILY_CARE_PRESETS: RecurrencePreset[];
/**
 * Weekly care presets (Veckovis skötsel)
 */
export declare const WEEKLY_CARE_PRESETS: RecurrencePreset[];
/**
 * Health care presets (Hälsovård)
 * Based on Swedish equine health care intervals
 */
export declare const HEALTH_CARE_PRESETS: RecurrencePreset[];
/**
 * All presets grouped by category
 */
export declare const ALL_RECURRENCE_PRESETS: RecurrencePreset[];
/**
 * Get preset by ID
 */
export declare function getPresetById(id: string): RecurrencePreset | undefined;
/**
 * Get presets by category
 */
export declare function getPresetsByCategory(
  category: RecurringActivityCategory,
): RecurrencePreset[];
/**
 * Task weight definitions based on Swedish stable research
 * Higher weight = more effort/less desirable
 */
export declare const TASK_WEIGHTS: {
  readonly mucking: {
    readonly weight: 4;
    readonly labelKey: "recurrence.weights.mucking";
    readonly descriptionKey: "recurrence.weights.muckingDesc";
  };
  readonly paddockPooPicking: {
    readonly weight: 3;
    readonly labelKey: "recurrence.weights.paddockPooPicking";
    readonly descriptionKey: "recurrence.weights.paddockPooPickingDesc";
  };
  readonly turnoutBringIn: {
    readonly weight: 2;
    readonly labelKey: "recurrence.weights.turnoutBringIn";
    readonly descriptionKey: "recurrence.weights.turnoutBringInDesc";
  };
  readonly waterBuckets: {
    readonly weight: 2;
    readonly labelKey: "recurrence.weights.waterBuckets";
    readonly descriptionKey: "recurrence.weights.waterBucketsDesc";
  };
  readonly feeding: {
    readonly weight: 1;
    readonly labelKey: "recurrence.weights.feeding";
    readonly descriptionKey: "recurrence.weights.feedingDesc";
  };
  readonly hayNets: {
    readonly weight: 1;
    readonly labelKey: "recurrence.weights.hayNets";
    readonly descriptionKey: "recurrence.weights.hayNetsDesc";
  };
  readonly healthCare: {
    readonly weight: 1;
    readonly labelKey: "recurrence.weights.healthCare";
    readonly descriptionKey: "recurrence.weights.healthCareDesc";
  };
};
/**
 * Holiday multiplier for weekend/holiday shifts
 * Applied to task weight for fairness calculations
 */
export declare const HOLIDAY_MULTIPLIER = 1.5;
/**
 * Default generation window (days ahead to materialize instances)
 */
export declare const DEFAULT_GENERATE_DAYS_AHEAD = 60;
/**
 * RRULE frequency options for UI dropdown
 */
export declare const RRULE_FREQUENCIES: readonly [
  {
    readonly value: "DAILY";
    readonly labelKey: "recurrence.frequency.daily";
  },
  {
    readonly value: "WEEKLY";
    readonly labelKey: "recurrence.frequency.weekly";
  },
  {
    readonly value: "MONTHLY";
    readonly labelKey: "recurrence.frequency.monthly";
  },
  {
    readonly value: "YEARLY";
    readonly labelKey: "recurrence.frequency.yearly";
  },
];
/**
 * Days of week for RRULE BYDAY
 */
export declare const RRULE_DAYS: readonly [
  {
    readonly value: "MO";
    readonly labelKey: "common:days.monday";
  },
  {
    readonly value: "TU";
    readonly labelKey: "common:days.tuesday";
  },
  {
    readonly value: "WE";
    readonly labelKey: "common:days.wednesday";
  },
  {
    readonly value: "TH";
    readonly labelKey: "common:days.thursday";
  },
  {
    readonly value: "FR";
    readonly labelKey: "common:days.friday";
  },
  {
    readonly value: "SA";
    readonly labelKey: "common:days.saturday";
  },
  {
    readonly value: "SU";
    readonly labelKey: "common:days.sunday";
  },
];
/**
 * Category options with i18n keys
 */
export declare const RECURRING_ACTIVITY_CATEGORIES: readonly [
  {
    readonly value: "feeding";
    readonly labelKey: "recurrence.categories.feeding";
    readonly icon: "🍽️";
  },
  {
    readonly value: "mucking";
    readonly labelKey: "recurrence.categories.mucking";
    readonly icon: "🧹";
  },
  {
    readonly value: "turnout";
    readonly labelKey: "recurrence.categories.turnout";
    readonly icon: "🏞️";
  },
  {
    readonly value: "bring-in";
    readonly labelKey: "recurrence.categories.bringIn";
    readonly icon: "🐴";
  },
  {
    readonly value: "health";
    readonly labelKey: "recurrence.categories.health";
    readonly icon: "💉";
  },
  {
    readonly value: "grooming";
    readonly labelKey: "recurrence.categories.grooming";
    readonly icon: "✨";
  },
  {
    readonly value: "cleaning";
    readonly labelKey: "recurrence.categories.cleaning";
    readonly icon: "🧼";
  },
  {
    readonly value: "water";
    readonly labelKey: "recurrence.categories.water";
    readonly icon: "💧";
  },
  {
    readonly value: "hay";
    readonly labelKey: "recurrence.categories.hay";
    readonly icon: "🌾";
  },
  {
    readonly value: "other";
    readonly labelKey: "recurrence.categories.other";
    readonly icon: "📋";
  },
];
//# sourceMappingURL=recurrence-presets.d.ts.map
