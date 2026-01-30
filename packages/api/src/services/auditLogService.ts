import { db } from "../utils/firebase.js";
import { Timestamp } from "firebase-admin/firestore";
import type {
  AuditLog,
  ChangeDetails,
  AuditAction,
  AuditResource,
} from "@equiduty/shared/types/auditLog";

/**
 * Data required to create an audit log entry
 */
export interface CreateAuditLogData {
  userId: string;
  userEmail?: string;
  userName?: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId: string;
  resourceName?: string;
  stableId?: string;
  organizationId?: string;
  details?: {
    changes?: ChangeDetails[];
    [key: string]: unknown;
  };
}

/**
 * Creates an audit log entry in Firestore
 * If userName is not provided, fetches it from the users collection
 *
 * @param data - Audit log data
 * @returns Document ID of the created audit log
 */
export async function createAuditLog(
  data: CreateAuditLogData,
): Promise<string> {
  const now = Timestamp.now();

  // If userName is missing, fetch from users collection
  let userName = data.userName;
  if (!userName && data.userId) {
    try {
      const userDoc = await db.collection("users").doc(data.userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData?.firstName || userData?.lastName) {
          userName =
            `${userData.firstName || ""} ${userData.lastName || ""}`.trim();
        }
      }
    } catch (error) {
      console.error("Failed to fetch user name for audit log:", error);
      // Continue without userName - will show email or "Unknown user"
    }
  }

  const logData: Omit<AuditLog, "id"> = {
    logId: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: data.userId,
    userEmail: data.userEmail,
    userName: userName,
    action: data.action,
    resource: data.resource,
    resourceId: data.resourceId,
    resourceName: data.resourceName,
    stableId: data.stableId,
    organizationId: data.organizationId,
    details: data.details,
    timestamp: now as any,
    createdAt: now as any,
  };

  const docRef = await db.collection("auditLogs").add(logData);
  return docRef.id;
}

/**
 * Calculates field-level changes between two objects
 *
 * @param oldObj - Original object state
 * @param newObj - New object state
 * @param fieldsToTrack - Optional array of specific fields to track (if not provided, tracks all fields)
 * @returns Array of change details
 */
export function calculateChanges(
  oldObj: Record<string, any>,
  newObj: Record<string, any>,
  fieldsToTrack?: string[],
): ChangeDetails[] {
  const changes: ChangeDetails[] = [];
  const timestamp = Timestamp.now() as any;

  // Determine which fields to check
  const fieldsToCheck = fieldsToTrack || [
    ...new Set([...Object.keys(oldObj), ...Object.keys(newObj)]),
  ];

  for (const field of fieldsToCheck) {
    // Skip metadata fields that are always updated
    if (["updatedAt", "updatedBy", "createdAt", "createdBy"].includes(field)) {
      continue;
    }

    const oldValue = oldObj[field];
    const newValue = newObj[field];

    // Skip if values are the same
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
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
 * Formats a change for display purposes
 *
 * @param change - Change details
 * @returns Formatted string representation
 */
export function formatChange(change: ChangeDetails): string {
  const oldVal =
    change.oldValue !== undefined && change.oldValue !== null
      ? String(change.oldValue)
      : "(empty)";
  const newVal =
    change.newValue !== undefined && change.newValue !== null
      ? String(change.newValue)
      : "(empty)";

  return `${change.field}: ${oldVal} → ${newVal}`;
}

/**
 * Validates that required fields are present for audit logging
 *
 * @param data - Data to validate
 * @throws Error if required fields are missing
 */
export function validateAuditLogData(data: Partial<CreateAuditLogData>): void {
  if (!data.userId) {
    throw new Error("userId is required for audit logging");
  }
  if (!data.action) {
    throw new Error("action is required for audit logging");
  }
  if (!data.resource) {
    throw new Error("resource is required for audit logging");
  }
  if (!data.resourceId) {
    throw new Error("resourceId is required for audit logging");
  }
}
