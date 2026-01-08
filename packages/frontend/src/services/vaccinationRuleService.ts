import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { VaccinationRule } from '@/types/roles'

// ============================================================================
// Type Guards & Helpers
// ============================================================================

/**
 * Check if a vaccination rule is a system-wide rule
 */
export function isSystemRule(rule: VaccinationRule): boolean {
  return rule.scope === 'system' && rule.systemWide === true
}

/**
 * Check if a vaccination rule is an organization-level rule
 */
export function isOrganizationRule(rule: VaccinationRule): boolean {
  return rule.scope === 'organization' && !!rule.organizationId
}

/**
 * Check if a vaccination rule is a user-level rule
 */
export function isUserRule(rule: VaccinationRule): boolean {
  return rule.scope === 'user' && !!rule.userId
}

/**
 * Validate that a vaccination rule has exactly one scope field set
 */
export function validateVaccinationRuleScope(rule: VaccinationRule): boolean {
  const scopeFields = [
    rule.systemWide === true,
    !!rule.organizationId,
    !!rule.userId
  ]
  return scopeFields.filter(Boolean).length === 1
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
  isOrgAdmin = false
): boolean {
  if (isSystemRule(rule)) return false
  if (isOrganizationRule(rule)) {
    return isOrgAdmin && rule.organizationId === organizationId
  }
  if (isUserRule(rule)) {
    return rule.userId === userId
  }
  return false
}

/**
 * Check if user can delete a vaccination rule
 * Same logic as edit permissions
 */
export function canDeleteVaccinationRule(
  rule: VaccinationRule,
  userId: string,
  organizationId?: string,
  isOrgAdmin = false
): boolean {
  return canEditVaccinationRule(rule, userId, organizationId, isOrgAdmin)
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get all system-wide vaccination rules (FEI, KNHS)
 */
export async function getSystemVaccinationRules(): Promise<VaccinationRule[]> {
  const q = query(
    collection(db, 'vaccinationRules'),
    where('scope', '==', 'system'),
    where('systemWide', '==', true),
    orderBy('createdAt', 'desc')
  )

  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VaccinationRule))
}

/**
 * Get all organization-level vaccination rules
 */
export async function getOrganizationVaccinationRules(organizationId: string): Promise<VaccinationRule[]> {
  const q = query(
    collection(db, 'vaccinationRules'),
    where('scope', '==', 'organization'),
    where('organizationId', '==', organizationId),
    orderBy('createdAt', 'desc')
  )

  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VaccinationRule))
}

/**
 * Get all user-level vaccination rules
 */
export async function getUserVaccinationRules(userId: string): Promise<VaccinationRule[]> {
  const q = query(
    collection(db, 'vaccinationRules'),
    where('scope', '==', 'user'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  )

  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VaccinationRule))
}

/**
 * Get ALL accessible vaccination rules (system + organization + user)
 * Parallel execution for optimal performance
 */
export async function getAllAvailableVaccinationRules(
  userId?: string,
  organizationId?: string
): Promise<VaccinationRule[]> {
  // Run queries in parallel for performance
  const [systemRules, orgRules, userRules] = await Promise.all([
    getSystemVaccinationRules(),
    organizationId ? getOrganizationVaccinationRules(organizationId) : Promise.resolve([]),
    userId ? getUserVaccinationRules(userId) : Promise.resolve([])
  ])

  // Combine: system rules first, then org rules, then user rules
  return [...systemRules, ...orgRules, ...userRules]
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getAllAvailableVaccinationRules instead
 */
export async function getAllVaccinationRules(_stableId?: string): Promise<VaccinationRule[]> {
  // For now, just return system rules
  // This will be updated once migration is complete
  return getSystemVaccinationRules()
}

/**
 * Get a single vaccination rule by ID
 */
export async function getVaccinationRule(ruleId: string): Promise<VaccinationRule | null> {
  const docRef = doc(db, 'vaccinationRules', ruleId)
  const docSnap = await getDoc(docRef)

  if (!docSnap.exists()) {
    return null
  }

  return { id: docSnap.id, ...docSnap.data() } as VaccinationRule
}

// ============================================================================
// CRUD Operations
// ============================================================================

type CreateRuleData = Omit<VaccinationRule, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>

/**
 * Create a new vaccination rule (organization or user scope only)
 * System rules cannot be created via this function
 */
export async function createVaccinationRule(
  scope: 'organization' | 'user',
  userId: string,
  ruleData: Omit<CreateRuleData, 'scope' | 'systemWide' | 'organizationId' | 'userId'>,
  scopeId: string
): Promise<string> {
  const now = Timestamp.now()

  const data: Partial<VaccinationRule> = {
    scope,
    name: ruleData.name,
    description: ruleData.description,
    periodMonths: ruleData.periodMonths,
    periodDays: ruleData.periodDays,
    daysNotCompeting: ruleData.daysNotCompeting,
    createdAt: now,
    updatedAt: now,
    createdBy: userId
  }

  // Set scope-specific fields
  if (scope === 'organization') {
    data.organizationId = scopeId
  } else if (scope === 'user') {
    data.userId = scopeId
  }

  const docRef = await addDoc(collection(db, 'vaccinationRules'), data)
  return docRef.id
}

/**
 * Update an existing vaccination rule
 * System rules cannot be updated
 */
export async function updateVaccinationRule(
  ruleId: string,
  _userId: string,
  updates: Partial<Omit<VaccinationRule, 'id' | 'scope' | 'systemWide' | 'organizationId' | 'userId' | 'createdAt' | 'createdBy'>>
): Promise<void> {
  // Validate that the rule is not a system rule
  const rule = await getVaccinationRule(ruleId)
  if (!rule) {
    throw new Error('Vaccination rule not found')
  }

  if (isSystemRule(rule)) {
    throw new Error('Cannot update system vaccination rules')
  }

  const docRef = doc(db, 'vaccinationRules', ruleId)
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now()
  })
}

/**
 * Delete a vaccination rule
 * System rules cannot be deleted
 */
export async function deleteVaccinationRule(ruleId: string): Promise<void> {
  // Validate that the rule is not a system rule
  const rule = await getVaccinationRule(ruleId)
  if (!rule) {
    throw new Error('Vaccination rule not found')
  }

  if (isSystemRule(rule)) {
    throw new Error('Cannot delete system vaccination rules')
  }

  const docRef = doc(db, 'vaccinationRules', ruleId)
  await deleteDoc(docRef)
}
