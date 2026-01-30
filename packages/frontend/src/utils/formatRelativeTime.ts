import type { TFunction } from "i18next";

/**
 * Converts a date value (Firestore Timestamp, serialized `_seconds`, ISO string,
 * or epoch ms) into a short, human-readable relative time string.
 *
 * Pass the `t` function from react-i18next so the output is localised.
 */
export function formatRelativeTime(dateValue: unknown, t: TFunction): string {
  if (!dateValue) return "";

  let date: Date;
  if (
    typeof dateValue === "object" &&
    dateValue !== null &&
    "toDate" in dateValue &&
    typeof (dateValue as { toDate: () => Date }).toDate === "function"
  ) {
    date = (dateValue as { toDate: () => Date }).toDate();
  } else if (
    typeof dateValue === "object" &&
    dateValue !== null &&
    "_seconds" in dateValue
  ) {
    date = new Date((dateValue as { _seconds: number })._seconds * 1000);
  } else {
    date = new Date(dateValue as string | number);
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) return t("featureRequests:time.justNow");
  if (diffMinutes < 60)
    return t("featureRequests:time.minutesAgo", { count: diffMinutes });
  if (diffHours < 24)
    return t("featureRequests:time.hoursAgo", { count: diffHours });
  if (diffDays < 30)
    return t("featureRequests:time.daysAgo", { count: diffDays });
  return date.toLocaleDateString();
}
