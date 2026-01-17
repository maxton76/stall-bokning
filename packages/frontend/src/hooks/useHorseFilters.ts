import { useState, useMemo, useCallback } from "react";
import type { TFunction } from "i18next";
import type { Horse } from "@/types/roles";
import type { HorseFilters, FilterBadge } from "@shared/types/filters";
import { createDefaultFilters } from "@shared/types/filters";
import { toDate } from "@/utils/timestampUtils";

export interface UseHorseFiltersOptions {
  /** Array of horses to filter */
  horses: Horse[];

  /** Initial filter values (optional) */
  initialFilters?: Partial<HorseFilters>;

  /** Auto-set stableId from context (optional) */
  stableContext?: string;

  /** Translation function for localized labels (optional) */
  t?: TFunction;
}

export interface UseHorseFiltersReturn {
  /** Current filter state */
  filters: HorseFilters;

  /** Set all filters at once */
  setFilters: React.Dispatch<React.SetStateAction<HorseFilters>>;

  /** Filtered horses based on current filters */
  filteredHorses: Horse[];

  /** Number of active filters */
  activeFilterCount: number;

  /** Whether any filters are active */
  hasActiveFilters: boolean;

  /** Clear all filters */
  clearAllFilters: () => void;

  /** Clear a specific filter */
  clearFilter: (key: keyof HorseFilters) => void;

  /** Update a single filter */
  updateFilter: <K extends keyof HorseFilters>(
    key: K,
    value: HorseFilters[K],
  ) => void;

  /** Get active filter badges for UI display */
  getActiveFilterBadges: () => FilterBadge[];
}

/**
 * Enhanced hook for horse filtering with search, groups, and multi-gender support
 * Unified filtering logic for all pages
 */
export function useHorseFilters(
  options: UseHorseFiltersOptions,
): UseHorseFiltersReturn {
  const { horses, initialFilters, stableContext, t } = options;

  // Initialize filters with defaults + initial values + stable context
  const [filters, setFilters] = useState<HorseFilters>(() => ({
    ...createDefaultFilters(),
    ...initialFilters,
    ...(stableContext ? { stableId: stableContext } : {}),
  }));

  // Apply all filters (AND logic between filter types)
  const filteredHorses = useMemo(() => {
    return horses.filter((horse) => {
      // Search query filter (name, UELN, chip number, breed)
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesName = horse.name?.toLowerCase().includes(query);
        const matchesUeln = horse.ueln?.toLowerCase().includes(query);
        const matchesChip = horse.chipNumber?.toLowerCase().includes(query);
        const matchesBreed = horse.breed?.toLowerCase().includes(query);

        if (!matchesName && !matchesUeln && !matchesChip && !matchesBreed) {
          return false;
        }
      }

      // Stable filter
      if (filters.stableId && filters.stableId !== "all") {
        if (filters.stableId === "unassigned") {
          if (horse.currentStableId) return false;
        } else {
          if (horse.currentStableId !== filters.stableId) return false;
        }
      }

      // Gender filter (multi-select)
      if (filters.genders.length > 0) {
        if (!horse.gender || !filters.genders.includes(horse.gender)) {
          return false;
        }
      }

      // Age range filter
      if (filters.ageMin !== undefined || filters.ageMax !== undefined) {
        let age: number | undefined;

        // Try to use age field first
        if (horse.age !== undefined) {
          age = horse.age;
        } else if (horse.dateOfBirth) {
          // Calculate age from dateOfBirth
          const birthDate = toDate(horse.dateOfBirth);
          if (birthDate) {
            const today = new Date();
            age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (
              monthDiff < 0 ||
              (monthDiff === 0 && today.getDate() < birthDate.getDate())
            ) {
              age--;
            }
          }
        }

        if (age === undefined) return false;

        if (filters.ageMin !== undefined && age < filters.ageMin) return false;
        if (filters.ageMax !== undefined && age > filters.ageMax) return false;
      }

      // Usage filter (AND logic - horse must have ALL selected usage types)
      if (filters.usage.length > 0) {
        if (!horse.usage || horse.usage.length === 0) return false;

        const hasAllUsages = filters.usage.every((usage) =>
          horse.usage?.includes(usage),
        );
        if (!hasAllUsages) return false;
      }

      // Groups filter
      if (filters.groups.length > 0) {
        if (
          !horse.horseGroupId ||
          !filters.groups.includes(horse.horseGroupId)
        ) {
          return false;
        }
      }

      // Status filter
      if (filters.status && horse.status !== filters.status) {
        return false;
      }

      return true;
    });
  }, [horses, filters]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (filters.searchQuery) count++;
    if (filters.stableId && filters.stableId !== "all") count++;
    if (filters.genders.length > 0) count++;
    if (filters.ageMin !== undefined || filters.ageMax !== undefined) count++;
    if (filters.usage.length > 0) count++;
    if (filters.groups.length > 0) count++;
    if (filters.status) count++;

    return count;
  }, [filters]);

  const hasActiveFilters = activeFilterCount > 0;

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setFilters(createDefaultFilters());
  }, []);

  // Clear individual filter
  const clearFilter = useCallback((key: keyof HorseFilters) => {
    setFilters((prev) => {
      const updated = { ...prev };

      switch (key) {
        case "searchQuery":
          updated.searchQuery = "";
          break;
        case "stableId":
          updated.stableId = undefined;
          break;
        case "genders":
          updated.genders = [];
          break;
        case "ageMin":
          updated.ageMin = undefined;
          break;
        case "ageMax":
          updated.ageMax = undefined;
          break;
        case "usage":
          updated.usage = [];
          break;
        case "groups":
          updated.groups = [];
          break;
        case "status":
          updated.status = undefined;
          break;
      }

      return updated;
    });
  }, []);

  // Update individual filter
  const updateFilter = useCallback(
    <K extends keyof HorseFilters>(key: K, value: HorseFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // Generate filter badges for UI display
  const getActiveFilterBadges = useCallback((): FilterBadge[] => {
    const badges: FilterBadge[] = [];

    // Helper to get translated text or fallback
    const translate = (key: string, fallback: string) =>
      t ? t(key) : fallback;

    if (filters.searchQuery) {
      badges.push({
        key: "searchQuery",
        label: translate("horses:filters.search", "Search"),
        value: filters.searchQuery,
        onRemove: () => clearFilter("searchQuery"),
      });
    }

    if (filters.stableId && filters.stableId !== "all") {
      badges.push({
        key: "stableId",
        label: translate("horses:filters.stable", "Stable"),
        value:
          filters.stableId === "unassigned"
            ? translate("horses:filters.unassigned", "Unassigned")
            : translate("horses:badges.selected", "Selected"),
        onRemove: () => clearFilter("stableId"),
      });
    }

    if (filters.genders.length > 0) {
      badges.push({
        key: "genders",
        label: translate("horses:filters.gender", "Gender"),
        value: filters.genders
          .map((g) => translate(`horses:genders.${g}`, g))
          .join(", "),
        onRemove: () => clearFilter("genders"),
      });
    }

    if (filters.ageMin !== undefined || filters.ageMax !== undefined) {
      const min = filters.ageMin ?? "0";
      const max = filters.ageMax ?? "∞";
      badges.push({
        key: "age",
        label: translate("horses:filters.ageRange", "Age"),
        value: `${min}-${max}`,
        onRemove: () => {
          clearFilter("ageMin");
          clearFilter("ageMax");
        },
      });
    }

    if (filters.usage.length > 0) {
      badges.push({
        key: "usage",
        label: translate("horses:filters.usage", "Usage"),
        value: `${filters.usage.length} ${translate("horses:badges.selected", "selected")}`,
        onRemove: () => clearFilter("usage"),
      });
    }

    if (filters.groups.length > 0) {
      badges.push({
        key: "groups",
        label: translate("horses:filters.groups", "Groups"),
        value: `${filters.groups.length} ${translate("horses:badges.selected", "selected")}`,
        onRemove: () => clearFilter("groups"),
      });
    }

    if (filters.status) {
      badges.push({
        key: "status",
        label: translate("horses:filters.status", "Status"),
        value: translate(`horses:filters.${filters.status}`, filters.status),
        onRemove: () => clearFilter("status"),
      });
    }

    return badges;
  }, [filters, clearFilter, t]);

  return {
    filters,
    setFilters,
    filteredHorses,
    activeFilterCount,
    hasActiveFilters,
    clearAllFilters,
    clearFilter,
    updateFilter,
    getActiveFilterBadges,
  };
}
