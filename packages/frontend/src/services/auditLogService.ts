import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type {
  AuditLog,
  CreateAuditLogData,
  AuditLogFilter,
  ChangeDetails,
  RoleChangeDetails,
  ReservationStatusChange,
  AssignmentDetails
} from '@shared/types/auditLog'
import { mapDocsToObjects } from '@/utils/firestoreHelpers'

// ============================================================================
// Create Operations
// ============================================================================

/**
 * Create a new audit log entry
 * @param logData - Audit log data
 * @returns Promise with created log ID
 */
export async function createAuditLog(logData: CreateAuditLogData): Promise<string> {
  const auditLogRef = collection(db, 'auditLogs')

  // Generate unique log ID
  const logId = `${logData.resource}_${logData.action}_${Date.now()}`

  const entryData: Omit<AuditLog, 'id'> = {
    logId,
    userId: logData.userId,
    userEmail: logData.userEmail,
    userName: logData.userName,
    action: logData.action,
    resource: logData.resource,
    resourceId: logData.resourceId,
    resourceName: logData.resourceName,
    organizationId: logData.organizationId,
    stableId: logData.stableId,
    details: logData.details,
    userAgent: logData.userAgent,
    sessionId: logData.sessionId,
    timestamp: Timestamp.now(),
    createdAt: Timestamp.now()
  }

  const docRef = await addDoc(auditLogRef, entryData)
  return docRef.id
}

/**
 * Log a role change for an organization member
 * @param memberId - Member ID
 * @param memberEmail - Member email
 * @param organizationId - Organization ID
 * @param organizationName - Organization name
 * @param roleChange - Role change details
 * @param userId - User making the change
 * @returns Promise with created log ID
 */
export async function logRoleChange(
  memberId: string,
  memberEmail: string,
  organizationId: string,
  organizationName: string,
  roleChange: Omit<RoleChangeDetails, 'memberId' | 'memberEmail' | 'organizationId' | 'organizationName'>,
  userId: string
): Promise<string> {
  const roleChangeDetails: RoleChangeDetails = {
    memberId,
    memberEmail,
    organizationId,
    organizationName,
    ...roleChange
  }

  return createAuditLog({
    userId,
    action: 'role_change',
    resource: 'organizationMember',
    resourceId: memberId,
    resourceName: memberEmail,
    organizationId,
    details: {
      roleChange: roleChangeDetails
    }
  })
}

/**
 * Log a facility reservation status change (approval/rejection)
 * @param reservationId - Reservation ID
 * @param facilityId - Facility ID
 * @param facilityName - Facility name
 * @param previousStatus - Previous status
 * @param newStatus - New status
 * @param reviewerId - User who reviewed
 * @param reviewerName - Reviewer name
 * @param reviewerEmail - Reviewer email
 * @param reviewNotes - Optional review notes
 * @param organizationId - Organization ID
 * @returns Promise with created log ID
 */
export async function logReservationStatusChange(
  reservationId: string,
  facilityId: string,
  facilityName: string,
  previousStatus: 'pending' | 'approved' | 'rejected',
  newStatus: 'pending' | 'approved' | 'rejected',
  reviewerId: string,
  reviewerName: string,
  reviewerEmail: string,
  reviewNotes: string | undefined,
  organizationId?: string
): Promise<string> {
  const statusChange: ReservationStatusChange = {
    reservationId,
    facilityId,
    facilityName,
    previousStatus,
    newStatus,
    reviewerId,
    reviewerName,
    reviewerEmail,
    reviewNotes
  }

  const action = newStatus === 'approved' ? 'approve' : newStatus === 'rejected' ? 'reject' : 'update'

  return createAuditLog({
    userId: reviewerId,
    userEmail: reviewerEmail,
    userName: reviewerName,
    action,
    resource: 'facilityReservation',
    resourceId: reservationId,
    resourceName: facilityName,
    organizationId,
    details: {
      statusChange
    }
  })
}

/**
 * Log a shift assignment change
 * @param shiftId - Shift ID
 * @param shiftDate - Shift date
 * @param shiftType - Shift type
 * @param assignmentType - Manual or auto assignment
 * @param assignedTo - User assigned to shift
 * @param assignedToName - Assigned user name
 * @param userId - User making the assignment
 * @param stableId - Stable ID
 * @returns Promise with created log ID
 */
export async function logShiftAssignment(
  shiftId: string,
  shiftDate: Timestamp,
  shiftType: string,
  assignmentType: 'manual' | 'auto',
  assignedTo: string,
  assignedToName: string,
  userId: string,
  stableId?: string
): Promise<string> {
  const assignment: AssignmentDetails = {
    shiftId,
    shiftDate,
    shiftType,
    assignmentType,
    assignedTo,
    assignedToName
  }

  return createAuditLog({
    userId,
    action: 'assign',
    resource: 'shift',
    resourceId: shiftId,
    resourceName: shiftType,
    stableId,
    details: {
      assignment
    }
  })
}

/**
 * Log horse data updates
 * @param horseId - Horse ID
 * @param horseName - Horse name
 * @param stableId - Stable ID (if assigned)
 * @param changes - Array of field changes
 * @param userId - User making the change
 * @returns Promise with created log ID
 */
export async function logHorseUpdate(
  horseId: string,
  horseName: string,
  stableId: string | undefined,
  changes: ChangeDetails[],
  userId: string
): Promise<string> {
  return createAuditLog({
    userId,
    action: 'update',
    resource: 'horse',
    resourceId: horseId,
    resourceName: horseName,
    stableId,
    details: {
      changes
    }
  })
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Query audit logs with filters
 * @param filters - Filter criteria
 * @returns Promise with array of audit logs
 */
export async function queryAuditLogs(filters: AuditLogFilter): Promise<AuditLog[]> {
  const auditLogRef = collection(db, 'auditLogs')
  const constraints = []

  // Build query constraints
  if (filters.userId) {
    constraints.push(where('userId', '==', filters.userId))
  }
  if (filters.resource) {
    constraints.push(where('resource', '==', filters.resource))
  }
  if (filters.resourceId) {
    constraints.push(where('resourceId', '==', filters.resourceId))
  }
  if (filters.action) {
    constraints.push(where('action', '==', filters.action))
  }
  if (filters.organizationId) {
    constraints.push(where('organizationId', '==', filters.organizationId))
  }
  if (filters.stableId) {
    constraints.push(where('stableId', '==', filters.stableId))
  }
  if (filters.startDate) {
    constraints.push(where('timestamp', '>=', filters.startDate))
  }
  if (filters.endDate) {
    constraints.push(where('timestamp', '<=', filters.endDate))
  }

  // Add ordering and limit
  constraints.push(orderBy('timestamp', 'desc'))
  if (filters.limit) {
    constraints.push(firestoreLimit(filters.limit))
  }

  const q = query(auditLogRef, ...constraints)
  const snapshot = await getDocs(q)
  return mapDocsToObjects<AuditLog>(snapshot)
}

/**
 * Get audit logs for a specific resource
 * @param resource - Resource type
 * @param resourceId - Resource ID
 * @param limit - Optional limit (default 50)
 * @returns Promise with array of audit logs
 */
export async function getResourceAuditLogs(
  resource: string,
  resourceId: string,
  limit = 50
): Promise<AuditLog[]> {
  return queryAuditLogs({ resource: resource as any, resourceId, limit })
}

/**
 * Get audit logs for an organization
 * @param organizationId - Organization ID
 * @param limit - Optional limit (default 100)
 * @returns Promise with array of audit logs
 */
export async function getOrganizationAuditLogs(
  organizationId: string,
  limit = 100
): Promise<AuditLog[]> {
  return queryAuditLogs({ organizationId, limit })
}

/**
 * Get audit logs for a user
 * @param userId - User ID
 * @param limit - Optional limit (default 50)
 * @returns Promise with array of audit logs
 */
export async function getUserAuditLogs(userId: string, limit = 50): Promise<AuditLog[]> {
  return queryAuditLogs({ userId, limit })
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate field-level changes between two objects
 * @param oldObj - Original object
 * @param newObj - Updated object
 * @param fieldsToTrack - Optional array of fields to track (tracks all if not specified)
 * @returns Array of change details
 */
export function calculateChanges(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  fieldsToTrack?: string[]
): ChangeDetails[] {
  const changes: ChangeDetails[] = []
  const timestamp = Timestamp.now()

  // Determine which fields to check
  const fieldsToCheck = fieldsToTrack || [
    ...Object.keys(oldObj),
    ...Object.keys(newObj)
  ]

  // Remove duplicates
  const uniqueFields = [...new Set(fieldsToCheck)]

  for (const field of uniqueFields) {
    const oldValue = oldObj[field]
    const newValue = newObj[field]

    // Skip if values are the same
    if (oldValue === newValue) continue

    // Skip metadata fields
    if (['updatedAt', 'lastModifiedBy', 'createdAt', 'createdBy'].includes(field)) {
      continue
    }

    // Sanitize sensitive data
    if (['password', 'token', 'apiKey', 'secret'].some(s => field.toLowerCase().includes(s))) {
      continue
    }

    changes.push({
      field,
      oldValue,
      newValue,
      timestamp
    })
  }

  return changes
}

/**
 * Non-blocking audit log creation wrapper
 * Use this to ensure audit logging never breaks main operations
 * @param logFunction - Async function that creates an audit log
 * @returns Promise that resolves immediately but logs errors
 */
export async function safeAuditLog(logFunction: () => Promise<string>): Promise<void> {
  logFunction().catch(err => {
    console.error('Audit log failed:', err)
    // In production, you might want to send this to a monitoring service
  })
}
