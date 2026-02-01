import { useOrganization } from "@/contexts/OrganizationContext";

/**
 * Hook that requires an organization to be selected.
 * Returns the organizationId as a non-null string when available,
 * or null when no organization is selected.
 *
 * Pages should check the return value and render a fallback when null.
 *
 * @example
 * ```tsx
 * const orgId = useRequireOrganization();
 * if (!orgId) return <NoOrganizationSelected />;
 * // orgId is guaranteed to be a string from here
 * ```
 */
export function useRequireOrganization(): string | null {
  const { currentOrganizationId } = useOrganization();
  return currentOrganizationId;
}
