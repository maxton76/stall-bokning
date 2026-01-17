import i18n from "@/i18n";

/**
 * Normalize activity type name to translation key
 * Examples:
 *   "Dentist" -> "dentist"
 *   "Mare Cycle Check" -> "mareCycleCheck"
 *   "Vaccination" -> "vaccination"
 */
function normalizeActivityKey(name: string): string {
  return name
    .split(/\s+/)
    .map((word, i) =>
      i === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join("");
}

/**
 * Translate activity type name (e.g., "Dentist" → "Tandvård")
 * Falls back to the original name if no translation is found.
 */
export function translateActivityType(name: string): string {
  const key = normalizeActivityKey(name);
  const translation = i18n.t(`constants:activityTypes.${key}`, {
    defaultValue: "",
  });
  return translation || name;
}

/**
 * Normalize role name to translation key
 * Examples:
 *   "stable-hand" -> "stablehand"
 *   "veterinarian" -> "veterinarian"
 */
function normalizeRoleKey(role: string): string {
  return role.toLowerCase().replace(/-/g, "");
}

/**
 * Translate role name (e.g., "veterinarian" → "Veterinär")
 * Falls back to the original role name if no translation is found.
 */
export function translateRole(role: string): string {
  const key = normalizeRoleKey(role);
  const translation = i18n.t(`constants:activityRoles.${key}`, {
    defaultValue: "",
  });
  return translation || role;
}

/**
 * Translate array of roles to comma-separated string
 * Returns "-" if the array is empty.
 */
export function translateRoles(roles: string[]): string {
  if (!roles || roles.length === 0) return "-";
  return roles.map(translateRole).join(", ");
}
