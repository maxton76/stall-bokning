/**
 * User Settings Service
 *
 * API service for managing user preferences including:
 * - Default stable/organization selections
 * - Language preference (synced with Firestore)
 */

import { apiClient } from "@/lib/apiClient";
import type {
  UserPreferences,
  UpdateUserPreferencesInput,
  UserPreferencesResponse,
} from "@stall-bokning/shared";

/**
 * Get user preferences
 * Returns default preferences if none are set
 */
export async function getUserPreferences(): Promise<UserPreferences> {
  const response = await apiClient.get<UserPreferencesResponse>(
    "/settings/preferences",
  );
  return response.preferences;
}

/**
 * Update user preferences (partial update)
 * @param updates - Partial preferences to update
 *                  Use null to clear a value (e.g., defaultStableId: null)
 */
export async function updateUserPreferences(
  updates: UpdateUserPreferencesInput,
): Promise<UserPreferences> {
  const response = await apiClient.patch<UserPreferencesResponse>(
    "/settings/preferences",
    updates,
  );
  return response.preferences;
}

/**
 * Set default stable
 * @param stableId - Stable ID to set as default, or null to clear
 */
export async function setDefaultStable(
  stableId: string | null,
): Promise<UserPreferences> {
  return updateUserPreferences({ defaultStableId: stableId });
}

/**
 * Set default organization
 * @param organizationId - Organization ID to set as default, or null to clear
 */
export async function setDefaultOrganization(
  organizationId: string | null,
): Promise<UserPreferences> {
  return updateUserPreferences({ defaultOrganizationId: organizationId });
}

/**
 * Set language preference
 * @param language - Language code ('sv' or 'en')
 */
export async function setLanguagePreference(
  language: "sv" | "en",
): Promise<UserPreferences> {
  return updateUserPreferences({ language });
}
