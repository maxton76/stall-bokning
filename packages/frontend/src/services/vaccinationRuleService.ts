import { orderBy } from 'firebase/firestore'
import type { VaccinationRule } from '@/types/roles'
import { createCrudService } from './firestoreCrud'

// ============================================================================
// CRUD Service
// ============================================================================

/**
 * Vaccination Rule CRUD service using the standardized factory
 */
const vaccinationRuleCrud = createCrudService<VaccinationRule>({
  collectionName: 'vaccinationRules',
  timestampsEnabled: true,
  parentField: {
    field: 'stableId',
    required: true
  }
})

// ============================================================================
// Exported Operations
// ============================================================================

/**
 * Create a new vaccination rule
 * @param stableId - ID of the stable this rule belongs to
 * @param userId - ID of the user creating the rule
 * @param ruleData - Rule data (excluding auto-generated fields)
 * @returns Promise with the created rule ID
 */
export async function createVaccinationRule(
  stableId: string,
  userId: string,
  ruleData: Omit<VaccinationRule, 'id' | 'stableId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'lastModifiedBy'>
): Promise<string> {
  return vaccinationRuleCrud.create(userId, ruleData as any, stableId)
}

/**
 * Get a single vaccination rule by ID
 * @param ruleId - Rule ID
 * @returns Promise with rule data or null if not found
 */
export async function getVaccinationRule(ruleId: string): Promise<VaccinationRule | null> {
  return vaccinationRuleCrud.getById(ruleId)
}

/**
 * Update an existing vaccination rule
 * @param ruleId - Rule ID
 * @param userId - ID of user making the update
 * @param updates - Partial rule data to update
 * @returns Promise that resolves when update is complete
 */
export async function updateVaccinationRule(
  ruleId: string,
  userId: string,
  updates: Partial<Omit<VaccinationRule, 'id' | 'stableId' | 'createdAt' | 'createdBy'>>
): Promise<void> {
  return vaccinationRuleCrud.update(ruleId, userId, updates)
}

/**
 * Delete a vaccination rule
 * @param ruleId - Rule ID
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteVaccinationRule(ruleId: string): Promise<void> {
  return vaccinationRuleCrud.delete(ruleId)
}

/**
 * Get all vaccination rules for a stable
 * @param stableId - Stable ID
 * @returns Promise with array of vaccination rules
 */
export async function getStableVaccinationRules(stableId: string): Promise<VaccinationRule[]> {
  if (!vaccinationRuleCrud.getByParent) {
    throw new Error('getByParent not available')
  }
  return vaccinationRuleCrud.getByParent(stableId, [orderBy('createdAt', 'desc')])
}
