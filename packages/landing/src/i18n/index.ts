import sv from "./sv.json";
import en from "./en.json";

const translations: Record<string, Record<string, unknown>> = { sv, en };

/**
 * Get a nested value from an object using dot-notation key.
 * e.g. get(obj, "hero.title") => obj.hero.title
 */
function get(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (
      acc &&
      typeof acc === "object" &&
      key in (acc as Record<string, unknown>)
    ) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Create a translation function for the given locale.
 */
export function useTranslations(lang: string) {
  const dict = translations[lang] ?? translations["sv"];

  function t(key: string): string {
    const value = get(dict, key);
    if (typeof value === "string") return value;
    return key;
  }

  function tArray(key: string): string[] {
    const value = get(dict, key);
    if (Array.isArray(value)) return value as string[];
    return [];
  }

  return { t, tArray };
}

export const defaultLang = "sv";
export const supportedLangs = ["sv", "en"] as const;
