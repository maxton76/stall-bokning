import { Timestamp } from "firebase/firestore";
import { authFetchJSON } from "@/utils/authFetch";
import { logger } from "@/utils/logger";
import type {
  AuditLog,
  CreateAuditLogData,
  AuditLogFilter,
  ChangeDetails,
  RoleChangeDetails,
  ReservationStatusChange,
  AssignmentDetails,
} from "@shared/types/auditLog";

// ============================================================================
// API-First Service - All writes go through the API
// ============================================================================

const API_BASE = `${import.meta.env.VITE_API_URL}/api/v1/audit-logs`;

// ============================================================================
// Create Operations
// ============================================================================

/**
 * Create a new audit log entry via API
 * @param logData - Audit log data
 * @returns Promise with created log ID
 */
export async function createAuditLog(
  logData: CreateAuditLogData,
): Promise<string> {
  const response = await authFetchJSON<{ id: string; logId: string }>(
    API_BASE,
    {
      method: "POST",
      body: JSON.stringify({
        action: logData.action,
        resource: logData.resource,
        resourceId: logData.resourceId,
        resourceName: logData.resourceName,
        organizationId: logData.organizationId,
        stableId: logData.stableId,
        details: logData.details,
        userEmail: logData.userEmail,
        userName: logData.userName,
      }),
    },
  );
  return response.id;
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
  roleChange: Omit<
    RoleChangeDetails,
    "memberId" | "memberEmail" | "organizationId" | "organizationName"
  >,
  userId: string,
): Promise<string> {
  const roleChangeDetails: RoleChangeDetails = {
    memberId,
    memberEmail,
    organizationId,
    organizationName,
    ...roleChange,
  };

  return createAuditLog({
    userId,
    action: "role_change",
    resource: "organizationMember",
    resourceId: memberId,
    resourceName: memberEmail,
    organizationId,
    details: {
      roleChange: roleChangeDetails,
    },
  });
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
  previousStatus: "pending" | "approved" | "rejected",
  newStatus: "pending" | "approved" | "rejected",
  reviewerId: string,
  reviewerName: string,
  reviewerEmail: string,
  reviewNotes: string | undefined,
  organizationId?: string,
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
    reviewNotes,
  };

  const action =
    newStatus === "approved"
      ? "approve"
      : newStatus === "rejected"
        ? "reject"
        : "update";

  return createAuditLog({
    userId: reviewerId,
    userEmail: reviewerEmail,
    userName: reviewerName,
    action,
    resource: "facilityReservation",
    resourceId: reservationId,
    resourceName: facilityName,
    organizationId,
    details: {
      statusChange,
    },
  });
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
  assignmentType: "manual" | "auto",
  assignedTo: string,
  assignedToName: string,
  userId: string,
  stableId?: string,
): Promise<string> {
  const assignment: AssignmentDetails = {
    shiftId,
    shiftDate,
    shiftType,
    assignmentType,
    assignedTo,
    assignedToName,
  };

  return createAuditLog({
    userId,
    action: "assign",
    resource: "shift",
    resourceId: shiftId,
    resourceName: shiftType,
    stableId,
    details: {
      assignment,
    },
  });
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
  userId: string,
): Promise<string> {
  return createAuditLog({
    userId,
    action: "update",
    resource: "horse",
    resourceId: horseId,
    resourceName: horseName,
    stableId,
    details: {
      changes,
    },
  });
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Query audit logs with filters via API
 * @param filters - Filter criteria
 * @returns Promise with array of audit logs
 */
export async function queryAuditLogs(
  filters: AuditLogFilter,
): Promise<AuditLog[]> {
  // Build query params
  const params = new URLSearchParams();
  if (filters.limit) params.set("limit", filters.limit.toString());
  if (filters.resource) params.set("resource", filters.resource);
  if (filters.action) params.set("action", filters.action);

  // Determine which endpoint to use based on filters
  if (filters.organizationId) {
    const response = await authFetchJSON<{ auditLogs: AuditLog[] }>(
      `${API_BASE}/organization/${filters.organizationId}?${params.toString()}`,
    );
    return response.auditLogs;
  }

  if (filters.userId) {
    const response = await authFetchJSON<{ auditLogs: AuditLog[] }>(
      `${API_BASE}/user/${filters.userId}?${params.toString()}`,
    );
    return response.auditLogs;
  }

  if (filters.resource && filters.resourceId) {
    const response = await authFetchJSON<{ auditLogs: AuditLog[] }>(
      `${API_BASE}/resource/${filters.resource}/${filters.resourceId}?${params.toString()}`,
    );
    return response.auditLogs;
  }

  // Default: return empty array if no valid filter combination
  logger.warn("queryAuditLogs: No valid filter combination provided");
  return [];
}

/**
 * Get audit logs for a specific resource via API
 * @param resource - Resource type
 * @param resourceId - Resource ID
 * @param limit - Optional limit (default 50)
 * @returns Promise with array of audit logs
 */
export async function getResourceAuditLogs(
  resource: string,
  resourceId: string,
  limit = 50,
): Promise<AuditLog[]> {
  return queryAuditLogs({ resource: resource as any, resourceId, limit });
}

/**
 * Get audit logs for an organization via API
 * @param organizationId - Organization ID
 * @param limit - Optional limit (default 100)
 * @returns Promise with array of audit logs
 */
export async function getOrganizationAuditLogs(
  organizationId: string,
  limit = 100,
): Promise<AuditLog[]> {
  return queryAuditLogs({ organizationId, limit });
}

/**
 * Get audit logs for a user via API
 * @param userId - User ID
 * @param limit - Optional limit (default 50)
 * @returns Promise with array of audit logs
 */
export async function getUserAuditLogs(
  userId: string,
  limit = 50,
): Promise<AuditLog[]> {
  return queryAuditLogs({ userId, limit });
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
  fieldsToTrack?: string[],
): ChangeDetails[] {
  const changes: ChangeDetails[] = [];
  const timestamp = Timestamp.now();

  // Determine which fields to check
  const fieldsToCheck = fieldsToTrack || [
    ...Object.keys(oldObj),
    ...Object.keys(newObj),
  ];

  // Remove duplicates
  const uniqueFields = [...new Set(fieldsToCheck)];

  for (const field of uniqueFields) {
    const oldValue = oldObj[field];
    const newValue = newObj[field];

    // Skip if values are the same
    if (oldValue === newValue) continue;

    // Skip metadata fields
    if (
      ["updatedAt", "lastModifiedBy", "createdAt", "createdBy"].includes(field)
    ) {
      continue;
    }

    // Sanitize sensitive data
    if (
      ["password", "token", "apiKey", "secret"].some((s) =>
        field.toLowerCase().includes(s),
      )
    ) {
      continue;
    }

    changes.push({
      field,
      oldValue,
      newValue,
      timestamp,
    });
  }

  return changes;
}

/**
 * Non-blocking audit log creation wrapper
 * Use this to ensure audit logging never breaks main operations
 * @param logFunction - Async function that creates an audit log
 * @returns Promise that resolves immediately but logs errors
 */
export async function safeAuditLog(
  logFunction: () => Promise<string>,
): Promise<void> {
  logFunction().catch((err) => {
    logger.error("Audit log failed:", err);
    // In production, you might want to send this to a monitoring service
  });
}
