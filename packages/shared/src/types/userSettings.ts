/**
 * User Preferences - Stored in users/{userId}/settings/preferences
 *
 * Cross-device synchronized user settings including:
 * - Default selections (stable, organization)
 * - UI preferences (language)
 *
 * @path users/{userId}/settings/preferences
 */

export type SupportedLanguage = "sv" | "en";

export interface UserPreferences {
  /**
   * Default stable ID for pre-selection across the app
   * Must be a stable the user has access to
   */
  defaultStableId?: string;

  /**
   * Default organization ID for pre-selection
   * Must be an organization the user is a member of
   */
  defaultOrganizationId?: string;

  /**
   * UI language preference
   * Synced to Firestore, overrides localStorage
   * Fallback chain: Firestore → localStorage → browser detection → 'sv'
   */
  language: SupportedLanguage;

  /**
   * Last update timestamp
   */
  updatedAt: Date | string;
}

/**
 * Input type for updating user preferences
 * All fields optional for partial updates
 */
export interface UpdateUserPreferencesInput {
  defaultStableId?: string | null;
  defaultOrganizationId?: string | null;
  language?: SupportedLanguage;
}

/**
 * API response for user preferences
 */
export interface UserPreferencesResponse {
  preferences: UserPreferences;
}
