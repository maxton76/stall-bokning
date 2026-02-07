import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";

// List of supported namespaces
export const namespaces = [
  "common",
  "auth",
  "horses",
  "activities",
  "facilities",
  "feeding",
  "validation",
  "constants",
  "organizations",
  "settings",
  "stables",
  "recurrence",
  "notifications",
  "contacts",
  "invoices",
  "availability",
  "inventory",
  "errors",
  "invites",
  "location",
  "schedules",
  "landing",
  "routines",
  "support",
  "featureRequests",
  "onboarding",
] as const;

export type Namespace = (typeof namespaces)[number];

// Supported languages
export const supportedLanguages = ["en", "sv"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const languageNames: Record<SupportedLanguage, string> = {
  en: "English",
  sv: "Svenska",
};

export const languageFlags: Record<SupportedLanguage, string> = {
  en: "🇬🇧",
  sv: "🇸🇪",
};

// Cache-busting version - update this when translations change
const TRANSLATIONS_VERSION = "2026.02.07.1";

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "sv", // Swedish as default
    supportedLngs: supportedLanguages,
    defaultNS: "common",
    ns: namespaces,

    backend: {
      loadPath: `/locales/{{lng}}/{{ns}}.json?v=${TRANSLATIONS_VERSION}`,
    },

    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    react: {
      useSuspense: true,
    },

    // Debug mode in development
    debug: import.meta.env.DEV && import.meta.env.VITE_I18N_DEBUG === "true",
  });

export default i18n;
