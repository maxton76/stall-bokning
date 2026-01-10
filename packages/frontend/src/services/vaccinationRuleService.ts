import type { VaccinationRule } from "@/types/roles";

// ============================================================================
// Type Guards & Helpers
// ============================================================================

/**
 * Check if a vaccination rule is a system-wide rule
 */
export function isSystemRule(rule: VaccinationRule): boolean {
  return rule.scope === "system" && rule.systemWide === true;
}

/**
 * Check if a vaccination rule is an organization-level rule
 */
export function isOrganizationRule(rule: VaccinationRule): boolean {
  return rule.scope === "organization" && !!rule.organizationId;
}

/**
 * Check if a vaccination rule is a user-level rule
 */
export function isUserRule(rule: VaccinationRule): boolean {
  return rule.scope === "user" && !!rule.userId;
}

/**
 * Validate that a vaccination rule has exactly one scope field set
 */
export function validateVaccinationRuleScope(rule: VaccinationRule): boolean {
  const scopeFields = [
    rule.systemWide === true,
    !!rule.organizationId,
    !!rule.userId,
  ];
  return scopeFields.filter(Boolean).length === 1;
}

// ============================================================================
// Permission Helpers
// ============================================================================

/**
 * Check if user can edit a vaccination rule
 * - System rules: No one can edit
 * - Organization rules: Org admins only
 * - User rules: Owner only
 */
export function canEditVaccinationRule(
  rule: VaccinationRule,
  userId: string,
  organizationId?: string,
  isOrgAdmin = false,
): boolean {
  if (isSystemRule(rule)) return false;
  if (isOrganizationRule(rule)) {
    return isOrgAdmin && rule.organizationId === organizationId;
  }
  if (isUserRule(rule)) {
    return rule.userId === userId;
  }
  return false;
}

/**
 * Check if user can delete a vaccination rule
 * Same logic as edit permissions
 */
export function canDeleteVaccinationRule(
  rule: VaccinationRule,
  userId: string,
  organizationId?: string,
  isOrgAdmin = false,
): boolean {
  return canEditVaccinationRule(rule, userId, organizationId, isOrgAdmin);
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get all system-wide vaccination rules (FEI, KNHS)
 */
export async function getSystemVaccinationRules(): Promise<VaccinationRule[]> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const response = await authFetchJSON<{ rules: VaccinationRule[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/vaccination-rules?scope=system`,
    { method: "GET" },
  );

  return response.rules;
}

/**
 * Get all organization-level vaccination rules
 */
export async function getOrganizationVaccinationRules(
  organizationId: string,
): Promise<VaccinationRule[]> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const response = await authFetchJSON<{ rules: VaccinationRule[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/vaccination-rules?scope=organization&organizationId=${organizationId}`,
    { method: "GET" },
  );

  return response.rules;
}

/**
 * Get all user-level vaccination rules
 */
export async function getUserVaccinationRules(
  userId: string,
): Promise<VaccinationRule[]> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const response = await authFetchJSON<{ rules: VaccinationRule[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/vaccination-rules?scope=user`,
    { method: "GET" },
  );

  return response.rules;
}

/**
 * Get ALL accessible vaccination rules (system + organization + user)
 * Parallel execution for optimal performance
 * Handles permission errors gracefully - if user doesn't have access to org rules, just skip them
 */
export async function getAllAvailableVaccinationRules(
  userId?: string,
  organizationId?: string,
): Promise<VaccinationRule[]> {
  // Run queries in parallel for performance, handle failures gracefully
  const results = await Promise.allSettled([
    getSystemVaccinationRules(),
    organizationId
      ? getOrganizationVaccinationRules(organizationId)
      : Promise.resolve([]),
    userId ? getUserVaccinationRules(userId) : Promise.resolve([]),
  ]);

  // Extract successful results, ignore failed ones (e.g., permission errors)
  const systemRules = results[0].status === "fulfilled" ? results[0].value : [];
  const orgRules = results[1].status === "fulfilled" ? results[1].value : [];
  const userRules = results[2].status === "fulfilled" ? results[2].value : [];

  // Combine: system rules first, then org rules, then user rules
  return [...systemRules, ...orgRules, ...userRules];
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getAllAvailableVaccinationRules instead
 */
export async function getAllVaccinationRules(
  _stableId?: string,
): Promise<VaccinationRule[]> {
  // For now, just return system rules
  // This will be updated once migration is complete
  return getSystemVaccinationRules();
}

/**
 * Get a single vaccination rule by ID
 */
export async function getVaccinationRule(
  ruleId: string,
): Promise<VaccinationRule | null> {
  try {
    const { authFetchJSON } = await import("@/utils/authFetch");

    const response = await authFetchJSON<VaccinationRule>(
      `${import.meta.env.VITE_API_URL}/api/v1/vaccination-rules/${ruleId}`,
      { method: "GET" },
    );

    return response;
  } catch (error) {
    return null;
  }
}

// ============================================================================
// CRUD Operations
// ============================================================================

type CreateRuleData = Omit<
  VaccinationRule,
  "id" | "createdAt" | "updatedAt" | "createdBy"
>;

/**
 * Create a new vaccination rule (organization or user scope only)
 * System rules cannot be created via this function
 */
export async function createVaccinationRule(
  scope: "organization" | "user",
  userId: string,
  ruleData: Omit<
    CreateRuleData,
    "scope" | "systemWide" | "organizationId" | "userId"
  >,
  scopeId: string,
): Promise<string> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const data: any = {
    scope,
    vaccineName: ruleData.name,
    intervalMonths: ruleData.periodMonths,
    alertDaysBefore: 30,
    isActive: true,
    description: ruleData.description,
  };

  // Set scope-specific fields
  if (scope === "organization") {
    data.organizationId = scopeId;
  }

  const response = await authFetchJSON<{ id: string }>(
    `${import.meta.env.VITE_API_URL}/api/v1/vaccination-rules`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

  return response.id;
}

/**
 * Update an existing vaccination rule
 * System rules cannot be updated
 */
export async function updateVaccinationRule(
  ruleId: string,
  _userId: string,
  updates: Partial<
    Omit<
      VaccinationRule,
      | "id"
      | "scope"
      | "systemWide"
      | "organizationId"
      | "userId"
      | "createdAt"
      | "createdBy"
    >
  >,
): Promise<void> {
  // Validate that the rule is not a system rule
  const rule = await getVaccinationRule(ruleId);
  if (!rule) {
    throw new Error("Vaccination rule not found");
  }

  if (isSystemRule(rule)) {
    throw new Error("Cannot update system vaccination rules");
  }

  const { authFetchJSON } = await import("@/utils/authFetch");

  const data: any = {};
  if (updates.name) data.vaccineName = updates.name;
  if (updates.periodMonths) data.intervalMonths = updates.periodMonths;
  if (updates.description !== undefined) data.description = updates.description;

  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/vaccination-rules/${ruleId}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  );
}

/**
 * Delete a vaccination rule
 * System rules cannot be deleted
 */
export async function deleteVaccinationRule(ruleId: string): Promise<void> {
  // Validate that the rule is not a system rule
  const rule = await getVaccinationRule(ruleId);
  if (!rule) {
    throw new Error("Vaccination rule not found");
  }

  if (isSystemRule(rule)) {
    throw new Error("Cannot delete system vaccination rules");
  }

  const { authFetchJSON } = await import("@/utils/authFetch");

  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/vaccination-rules/${ruleId}`,
    {
      method: "DELETE",
    },
  );
}
