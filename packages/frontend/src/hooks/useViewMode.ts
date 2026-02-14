/**
 * Custom hook for managing facility reservations view mode
 * Handles view mode state, persistence, and role-based access
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import type { ViewMode, ViewModePreferences } from "@/types/viewMode";
import type { OrganizationRole } from "@equiduty/shared";

const VIEW_MODE_STORAGE_KEY = "equiduty_facility_view_mode";
const VIEW_PREFERENCES_STORAGE_KEY = "equiduty_facility_view_preferences";

/**
 * Default view mode based on user role
 */
const getDefaultViewMode = (userRole?: OrganizationRole): ViewMode => {
  if (!userRole) return "customer";

  switch (userRole) {
    case "administrator":
      return "admin"; // Administrators default to admin view
    case "stable_manager":
      return "manager"; // Stable managers default to analytics
    case "groom":
    case "rider":
      return "operations"; // Staff default to operations
    default:
      return "customer"; // Guests default to customer view
  }
};

/**
 * Check if user has permission to access a view mode
 */
const canAccessViewMode = (
  viewMode: ViewMode,
  userRole?: OrganizationRole,
): boolean => {
  if (!userRole) return viewMode === "customer";

  switch (viewMode) {
    case "customer":
      return true; // All roles can access customer view

    case "operations":
      return ["administrator", "stable_manager", "groom", "rider"].includes(
        userRole,
      );

    case "manager":
      return ["administrator", "stable_manager"].includes(userRole);

    case "admin":
      return ["administrator"].includes(userRole);

    default:
      return false;
  }
};

interface UseViewModeOptions {
  /** User's role in the organization */
  userRole?: OrganizationRole;
  /** Callback when view mode changes */
  onViewModeChange?: (mode: ViewMode) => void;
}

interface UseViewModeReturn {
  /** Current view mode */
  viewMode: ViewMode;
  /** Function to change view mode */
  setViewMode: (mode: ViewMode) => void;
  /** Check if user can access a specific view mode */
  canAccess: (mode: ViewMode) => boolean;
  /** Get all available view modes for current user */
  availableViewModes: ViewMode[];
  /** View mode preferences */
  preferences: ViewModePreferences;
  /** Update view mode preferences */
  updatePreferences: (updates: Partial<ViewModePreferences>) => void;
  /** Reset to default view mode */
  resetToDefault: () => void;
}

/**
 * Hook for managing facility reservations view mode
 */
export function useViewMode(
  options: UseViewModeOptions = {},
): UseViewModeReturn {
  const { userRole, onViewModeChange } = options;

  // Load initial view mode from localStorage or default
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(
      VIEW_MODE_STORAGE_KEY,
    ) as ViewMode | null;

    // Validate stored mode against user permissions
    if (stored && canAccessViewMode(stored, userRole)) {
      return stored;
    }

    return getDefaultViewMode(userRole);
  });

  // Load preferences from localStorage
  const [preferences, setPreferences] = useState<ViewModePreferences>(() => {
    const stored = localStorage.getItem(VIEW_PREFERENCES_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return { lastViewMode: viewMode };
      }
    }
    return { lastViewMode: viewMode };
  });

  // Persist view mode to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);

      // Update preferences
      setPreferences((prev) => ({
        ...prev,
        lastViewMode: viewMode,
      }));
    } catch (error) {
      console.warn("Failed to persist view mode to localStorage:", error);
      // Continue without localStorage persistence
    }
  }, [viewMode]);

  // Persist preferences to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        VIEW_PREFERENCES_STORAGE_KEY,
        JSON.stringify(preferences),
      );
    } catch (error) {
      console.warn("Failed to persist preferences to localStorage:", error);
      // Continue without localStorage persistence
    }
  }, [preferences]);

  // Notify parent component of view mode changes
  useEffect(() => {
    onViewModeChange?.(viewMode);
  }, [viewMode, onViewModeChange]);

  // Get available view modes based on user role
  const availableViewModes = useMemo<ViewMode[]>(() => {
    const allModes: ViewMode[] = ["customer", "operations", "manager", "admin"];
    return allModes.filter((mode) => canAccessViewMode(mode, userRole));
  }, [userRole]);

  // Validate and set view mode
  const setViewMode = useCallback(
    (mode: ViewMode) => {
      if (!canAccessViewMode(mode, userRole)) {
        console.warn(`User role ${userRole} cannot access view mode ${mode}`);
        return;
      }
      setViewModeState(mode);
    },
    [userRole],
  );

  // Update preferences
  const updatePreferences = useCallback(
    (updates: Partial<ViewModePreferences>) => {
      setPreferences((prev) => ({
        ...prev,
        ...updates,
      }));
    },
    [],
  );

  // Reset to default view mode
  const resetToDefault = useCallback(() => {
    const defaultMode = getDefaultViewMode(userRole);
    setViewModeState(defaultMode);
  }, [userRole]);

  // Check if user can access a specific view mode
  const canAccess = useCallback(
    (mode: ViewMode) => canAccessViewMode(mode, userRole),
    [userRole],
  );

  return {
    viewMode,
    setViewMode,
    canAccess,
    availableViewModes,
    preferences,
    updatePreferences,
    resetToDefault,
  };
}
