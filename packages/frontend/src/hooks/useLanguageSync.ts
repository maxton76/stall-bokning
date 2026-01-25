/**
 * useLanguageSync Hook
 *
 * Synchronizes language preference between i18n and Firestore.
 *
 * Behavior:
 * - On mount (after auth): fetches language preference from Firestore
 * - If Firestore has a language set, applies it to i18n
 * - When language changes via i18n, can optionally sync back to Firestore
 *
 * Fallback chain:
 * 1. Firestore user preferences (if authenticated)
 * 2. localStorage (i18nextLng)
 * 3. Browser detection
 * 4. Swedish ('sv') as default
 */

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPreferences } from "@/hooks/useUserPreferences";

/**
 * Hook to sync language preference with Firestore
 *
 * Should be called once near the app root, after AuthProvider
 *
 * @example
 * ```tsx
 * function App() {
 *   useLanguageSync();
 *   return <Routes />;
 * }
 * ```
 */
export function useLanguageSync() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const { preferences, isLoading, setLanguage } = useUserPreferences();
  const initialSyncDoneRef = useRef(false);
  const lastSyncedLanguageRef = useRef<string | null>(null);

  // Sync language from Firestore to i18n on mount/login
  useEffect(() => {
    // Wait until we have user and preferences
    if (!user || isLoading) {
      return;
    }

    // Only sync once per session (or when user changes)
    if (initialSyncDoneRef.current) {
      return;
    }

    if (preferences?.language) {
      const firestoreLanguage = preferences.language;
      const currentLanguage = i18n.language;

      // If Firestore has a different language, apply it
      if (firestoreLanguage !== currentLanguage) {
        console.debug(
          `Syncing language from Firestore: ${currentLanguage} -> ${firestoreLanguage}`,
        );
        i18n.changeLanguage(firestoreLanguage);
        lastSyncedLanguageRef.current = firestoreLanguage;
      } else {
        lastSyncedLanguageRef.current = currentLanguage;
      }
    }

    initialSyncDoneRef.current = true;
  }, [user, preferences, isLoading, i18n]);

  // Reset sync flag when user logs out
  useEffect(() => {
    if (!user) {
      initialSyncDoneRef.current = false;
      lastSyncedLanguageRef.current = null;
    }
  }, [user]);

  /**
   * Change language and sync to Firestore
   * Use this instead of i18n.changeLanguage() when you want to persist
   */
  const changeLanguageAndSync = async (language: "sv" | "en") => {
    // Change i18n language immediately for responsive UI
    await i18n.changeLanguage(language);

    // Sync to Firestore if user is authenticated
    if (user) {
      try {
        await setLanguage(language);
        lastSyncedLanguageRef.current = language;
      } catch (error) {
        console.error("Failed to sync language to Firestore:", error);
        // Language is already changed in i18n, just log the error
      }
    }
  };

  return {
    currentLanguage: i18n.language as "sv" | "en",
    changeLanguageAndSync,
    isLoading,
  };
}
