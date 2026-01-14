import type { HorseUsage } from "./domain.js";

/**
 * Unified horse filtering interface
 * Supports all filter types across MyHorsesPage, ActivitiesCarePage, and future pages
 */
export interface HorseFilters {
  /** Search query across name, UELN, chip number, breed */
  searchQuery: string;

  /** Stable filter: 'all', 'unassigned', or specific stable ID */
  stableId?: string;

  /** Gender filter - array for multi-select support */
  genders: Array<"gelding" | "stallion" | "mare">;

  /** Age range minimum */
  ageMin?: number;

  /** Age range maximum */
  ageMax?: number;

  /** Usage types - sport, care, breeding (AND logic: horse must have ALL selected) */
  usage: HorseUsage[];

  /** Horse group IDs */
  groups: string[];

  /** Horse status filter */
  status?: "active" | "inactive";
}

/**
 * Configuration for which filters to display in the UI
 * Allows pages to customize which filters are relevant for their context
 */
export interface FilterConfig {
  /** Show search input */
  showSearch?: boolean;

  /** Show stable dropdown */
  showStable?: boolean;

  /** Show gender checkboxes */
  showGender?: boolean;

  /** Show age range inputs */
  showAge?: boolean;

  /** Show usage checkboxes */
  showUsage?: boolean;

  /** Show horse groups checkboxes */
  showGroups?: boolean;

  /** Show status dropdown */
  showStatus?: boolean;

  /** Auto-set stableId from context (when stable is pre-selected) */
  useStableContext?: boolean;
}

/**
 * Filter badge data for active filter display
 */
export interface FilterBadge {
  /** Unique key for the badge */
  key: string;

  /** Display label (e.g., "Gender", "Age") */
  label: string;

  /** Display value (e.g., "Gelding, Mare", "5-10") */
  value: string;

  /** Callback to remove this filter */
  onRemove: () => void;
}

/**
 * Create default empty filters state
 * Used for initializing filters and clearing all filters
 */
export const createDefaultFilters = (): HorseFilters => ({
  searchQuery: "",
  genders: [],
  usage: [],
  groups: [],
});
