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
  | "approve" // Facility reservations
  | "reject" // Facility reservations
  | "assign" // Shift assignments
  | "unassign" // Shift assignments
  | "role_change"; // Member role updates

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
  | "vaccinationRule";

/**
 * Field-level change details
 */
export interface ChangeDetails {
  field: string; // Field name that changed
  oldValue?: unknown; // Previous value (undefined for new fields)
  newValue?: unknown; // New value (undefined for deleted fields)
  timestamp: Timestamp; // When the change occurred
}

/**
 * Shift assignment details
 */
export interface AssignmentDetails {
  shiftId: string;
  shiftDate: Timestamp;
  shiftType: string;
  assignmentType: "manual" | "auto"; // Manual by user or auto by system
  assignedTo?: string; // User ID assigned to shift
  assignedToName?: string; // Cached user name
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
  logId: string; // Unique identifier for the log entry

  // Who - Actor information
  userId?: string;
  userEmail?: string;
  userName?: string;

  // What - Action information
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  resourceName?: string;

  // Context - Organization/Stable
  organizationId?: string;
  stableId?: string;

  // Details - Type-specific data
  details?: {
    changes?: ChangeDetails[];
    assignment?: AssignmentDetails;
    statusChange?: ReservationStatusChange;
    roleChange?: RoleChangeDetails;
    [key: string]: unknown; // Allow additional custom fields
  };

  // Security & Compliance
  ipAddress?: string; // Not captured in Phase 1 (client-side)
  userAgent?: string;
  sessionId?: string;

  // Timestamps
  timestamp: Timestamp;
  createdAt?: Timestamp;
}

/**
 * Data for creating a new audit log entry
 */
export interface CreateAuditLogData {
  // Who
  userId?: string;
  userEmail?: string;
  userName?: string;

  // What
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  resourceName?: string;

  // Context
  organizationId?: string;
  stableId?: string;

  // Details
  details?: {
    changes?: ChangeDetails[];
    assignment?: AssignmentDetails;
    statusChange?: ReservationStatusChange;
    roleChange?: RoleChangeDetails;
    [key: string]: unknown;
  };

  // Security
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
