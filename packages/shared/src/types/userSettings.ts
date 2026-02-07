/**
 * User Preferences - Stored in users/{userId}/settings/preferences
 *
 * Cross-device synchronized user settings including:
 * - Default selections (stable, organization)
 * - UI preferences (language, timezone)
 * - Notification preferences
 *
 * @path users/{userId}/settings/preferences
 */

export type SupportedLanguage = "sv" | "en";

export interface UserNotificationPreferences {
  /** Email notifications enabled (default: true) */
  email: boolean;
  /** Push notifications enabled (default: false) */
  push: boolean;
  /** Routine-related notifications (default: true) */
  routines: boolean;
  /** Feeding-related notifications (default: true) */
  feeding: boolean;
  /** Activity-related notifications (default: true) */
  activities: boolean;
}

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
   * IANA timezone identifier (default: 'Europe/Stockholm')
   */
  timezone: string;

  /**
   * Notification preferences synced across devices
   */
  notifications: UserNotificationPreferences;

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
  timezone?: string;
  notifications?: Partial<UserNotificationPreferences>;
}

/**
 * API response for user preferences
 */
export interface UserPreferencesResponse {
  preferences: UserPreferences;
}
