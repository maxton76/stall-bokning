/**
 * useUserPreferences Hook
 *
 * TanStack Query hook for managing user preferences including:
 * - Default stable/organization selections
 * - Language preference (synced with Firestore)
 *
 * @example
 * ```tsx
 * const { preferences, isLoading, updatePreferences } = useUserPreferences();
 *
 * // Update default stable
 * await updatePreferences({ defaultStableId: 'stable-123' });
 *
 * // Update language
 * await updatePreferences({ language: 'en' });
 * ```
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserPreferences,
  updateUserPreferences,
} from "@/services/userSettingsService";
import type {
  UserPreferences,
  UpdateUserPreferencesInput,
} from "@stall-bokning/shared";

// Query key for user preferences
export const USER_PREFERENCES_KEY = ["userPreferences"] as const;

/**
 * Hook for managing user preferences
 */
export function useUserPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query for fetching preferences
  const {
    data: preferences,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: USER_PREFERENCES_KEY,
    queryFn: getUserPreferences,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });

  // Mutation for updating preferences
  const mutation = useMutation({
    mutationFn: updateUserPreferences,
    onSuccess: (updatedPreferences) => {
      // Update cache with new data
      queryClient.setQueryData(USER_PREFERENCES_KEY, updatedPreferences);
    },
    onError: (error) => {
      console.error("Failed to update preferences:", error);
    },
  });

  /**
   * Update preferences with partial data
   * Returns a promise that resolves when update is complete
   */
  const updatePreferences = async (
    updates: UpdateUserPreferencesInput,
  ): Promise<UserPreferences> => {
    return mutation.mutateAsync(updates);
  };

  /**
   * Set default stable ID
   * @param stableId - Stable ID or null to clear
   */
  const setDefaultStable = async (
    stableId: string | null,
  ): Promise<UserPreferences> => {
    return updatePreferences({ defaultStableId: stableId });
  };

  /**
   * Set default organization ID
   * @param organizationId - Organization ID or null to clear
   */
  const setDefaultOrganization = async (
    organizationId: string | null,
  ): Promise<UserPreferences> => {
    return updatePreferences({ defaultOrganizationId: organizationId });
  };

  /**
   * Set language preference
   * @param language - Language code ('sv' or 'en')
   */
  const setLanguage = async (
    language: "sv" | "en",
  ): Promise<UserPreferences> => {
    return updatePreferences({ language });
  };

  return {
    preferences,
    isLoading,
    error,
    isUpdating: mutation.isPending,
    updatePreferences,
    setDefaultStable,
    setDefaultOrganization,
    setLanguage,
    refetch,
  };
}

/**
 * Hook for just reading the default stable ID
 * Lightweight hook for components that only need to read the default
 */
export function useDefaultStableId(): string | undefined {
  const { preferences, isLoading } = useUserPreferences();

  if (isLoading || !preferences) {
    return undefined;
  }

  return preferences.defaultStableId;
}

/**
 * Hook for just reading the default organization ID
 * Lightweight hook for components that only need to read the default
 */
export function useDefaultOrganizationId(): string | undefined {
  const { preferences, isLoading } = useUserPreferences();

  if (isLoading || !preferences) {
    return undefined;
  }

  return preferences.defaultOrganizationId;
}
