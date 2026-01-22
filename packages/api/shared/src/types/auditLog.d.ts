import { Timestamp } from "firebase/firestore";
/**
 * Audit action types
 */
export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "read"
  | "export"
  | "login"
  | "approve"
  | "reject"
  | "assign"
  | "unassign"
  | "role_change";
/**
 * Resource types that can be audited
 */
export type AuditResource =
  | "user"
  | "stable"
  | "shift"
  | "schedule"
  | "subscription"
  | "data"
  | "organization"
  | "organizationMember"
  | "facilityReservation"
  | "horse"
  | "horseGroup"
  | "activity"
  | "vaccinationRule"
  | "horseFeeding"
  | "feedType"
  | "feedingTime";
/**
 * Field-level change details
 */
export interface ChangeDetails {
  field: string;
  oldValue?: unknown;
  newValue?: unknown;
  timestamp: Timestamp;
}
/**
 * Shift assignment details
 */
export interface AssignmentDetails {
  shiftId: string;
  shiftDate: Timestamp;
  shiftType: string;
  assignmentType: "manual" | "auto";
  assignedTo?: string;
  assignedToName?: string;
}
/**
 * Facility reservation status change details
 */
export interface ReservationStatusChange {
  reservationId: string;
  facilityId: string;
  facilityName?: string;
  previousStatus: "pending" | "approved" | "rejected";
  newStatus: "pending" | "approved" | "rejected";
  reviewerId: string;
  reviewerName?: string;
  reviewerEmail?: string;
  reviewNotes?: string;
}
/**
 * Member role change details
 */
export interface RoleChangeDetails {
  memberId: string;
  memberEmail?: string;
  memberName?: string;
  organizationId: string;
  organizationName?: string;
  previousRoles: string[];
  newRoles: string[];
  addedRoles: string[];
  removedRoles: string[];
}
/**
 * Audit log entry
 */
export interface AuditLog {
  id?: string;
  logId: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  resourceName?: string;
  organizationId?: string;
  stableId?: string;
  details?: {
    changes?: ChangeDetails[];
    assignment?: AssignmentDetails;
    statusChange?: ReservationStatusChange;
    roleChange?: RoleChangeDetails;
    [key: string]: unknown;
  };
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  timestamp: Timestamp;
  createdAt?: Timestamp;
}
/**
 * Data for creating a new audit log entry
 */
export interface CreateAuditLogData {
  userId?: string;
  userEmail?: string;
  userName?: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  resourceName?: string;
  organizationId?: string;
  stableId?: string;
  details?: {
    changes?: ChangeDetails[];
    assignment?: AssignmentDetails;
    statusChange?: ReservationStatusChange;
    roleChange?: RoleChangeDetails;
    [key: string]: unknown;
  };
  userAgent?: string;
  sessionId?: string;
}
/**
 * Filters for querying audit logs
 */
export interface AuditLogFilter {
  userId?: string;
  resource?: AuditResource;
  resourceId?: string;
  action?: AuditAction;
  organizationId?: string;
  stableId?: string;
  startDate?: Timestamp;
  endDate?: Timestamp;
  limit?: number;
}
/**
 * Display-friendly audit log with formatted dates
 */
export interface AuditLogDisplay extends Omit<
  AuditLog,
  "timestamp" | "createdAt"
> {
  timestamp: Date;
  createdAt?: Date;
}
