import type { OrganizationMember } from "@equiduty/shared";

/**
 * Build a Set of display names that appear more than once in the members list.
 * Used to decide which names need email disambiguation.
 */
export function getDuplicateNames(members: OrganizationMember[]): Set<string> {
  const counts = new Map<string, number>();
  for (const m of members) {
    const name = `${m.firstName} ${m.lastName}`.trim();
    if (name) counts.set(name, (counts.get(name) || 0) + 1);
  }
  return new Set(
    [...counts.entries()].filter(([, c]) => c > 1).map(([n]) => n),
  );
}

/**
 * Format a single member's display name.
 * Appends "(email)" when the name exists in the duplicateNames set.
 * Falls back to email if no first/last name.
 */
export function formatMemberDisplayName(
  member: Pick<OrganizationMember, "firstName" | "lastName" | "userEmail">,
  duplicateNames?: Set<string>,
): string {
  const fullName = `${member.firstName} ${member.lastName}`.trim();
  if (!fullName) return member.userEmail;
  if (duplicateNames?.has(fullName)) return `${fullName} (${member.userEmail})`;
  return fullName;
}
