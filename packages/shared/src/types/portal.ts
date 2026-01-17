import type { Timestamp } from "firebase/firestore";

/**
 * Portal Types
 * Types for the horse owner self-service portal
 */

/**
 * Portal user role - distinct from staff roles
 */
export type PortalUserRole = "owner" | "co_owner" | "caretaker";

/**
 * Portal access configuration for a contact
 */
export interface PortalAccess {
  id: string;
  contactId: string;
  userId: string; // Firebase Auth UID
  organizationId: string;
  role: PortalUserRole;

  // Access control
  canViewInvoices: boolean;
  canPayInvoices: boolean;
  canViewActivities: boolean;
  canViewHealthRecords: boolean;
  canCommunicate: boolean;

  // Notification preferences for portal
  notifyOnInvoice: boolean;
  notifyOnActivity: boolean;
  notifyOnHealthUpdate: boolean;
  notifyOnMessage: boolean;

  // Status
  isActive: boolean;
  lastAccessAt?: Timestamp;

  // Metadata
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
}

/**
 * Portal session info - for tracking portal user activity
 */
export interface PortalSession {
  userId: string;
  contactId: string;
  organizationId: string;
  role: PortalUserRole;
  loginAt: Timestamp;
  lastActivityAt: Timestamp;
}

/**
 * Horse summary for portal display
 */
export interface PortalHorseSummary {
  id: string;
  name: string;
  registrationNumber?: string;
  breed?: string;
  color?: string;
  dateOfBirth?: Date;
  age?: number;
  gender: string;
  photoUrl?: string;

  // Location info
  stableId?: string;
  stableName?: string;
  stallNumber?: string;

  // Owner relationship
  ownershipType: "owner" | "co_owner" | "leaser";
  ownershipStartDate?: Date;

  // Quick stats
  upcomingActivities: number;
  pendingHealthItems: number;
  lastActivityDate?: Date;
}

/**
 * Invoice summary for portal display
 */
export interface PortalInvoiceSummary {
  id: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  status: string;
  statusDisplay: string;
  isOverdue: boolean;
  daysOverdue: number;

  // Quick reference
  periodStart?: Date;
  periodEnd?: Date;
  itemCount: number;
  horsesIncluded: string[]; // Horse names

  // Payment options
  canPayOnline: boolean;
  stripeInvoiceUrl?: string;
}

/**
 * Activity summary for portal display
 */
export interface PortalActivitySummary {
  id: string;
  title: string;
  description?: string;
  activityType: string;
  activityTypeName: string;
  scheduledDate: Date;
  scheduledTime?: string;
  endTime?: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";

  // Related entities
  horseId?: string;
  horseName?: string;
  stableId?: string;
  stableName?: string;

  // Staff assignment
  assignedStaffNames?: string[];

  // Progress
  completedAt?: Date;
  notes?: string;
}

/**
 * Communication thread for portal messaging
 */
export interface PortalThread {
  id: string;
  contactId: string;
  organizationId: string;
  subject: string;

  // Participants
  contactName: string;
  organizationName: string;

  // Status
  lastMessageAt: Timestamp;
  lastMessagePreview: string;
  unreadCount: number;
  isClosed: boolean;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Portal message in a thread
 */
export interface PortalMessage {
  id: string;
  threadId: string;
  content: string;

  // Sender
  senderType: "portal_user" | "staff";
  senderId: string;
  senderName: string;

  // Read tracking
  isRead: boolean;
  readAt?: Timestamp;

  // Attachments
  attachments?: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }[];

  // Metadata
  createdAt: Timestamp;
}

/**
 * Portal dashboard data - aggregated view for horse owner
 */
export interface PortalDashboardData {
  // User info
  contactName: string;
  organizationName: string;
  lastLogin?: Date;

  // Quick stats
  horseCount: number;
  unpaidInvoiceCount: number;
  totalAmountDue: number;
  currency: string;
  upcomingActivityCount: number;
  unreadMessageCount: number;

  // Recent items
  recentInvoices: PortalInvoiceSummary[];
  upcomingActivities: PortalActivitySummary[];
  horses: PortalHorseSummary[];

  // Alerts
  alerts: PortalAlert[];
}

/**
 * Portal alert for dashboard
 */
export interface PortalAlert {
  id: string;
  type:
    | "invoice_due"
    | "invoice_overdue"
    | "health_reminder"
    | "activity_upcoming"
    | "message";
  priority: "low" | "medium" | "high";
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;

  // Reference
  relatedEntityType?: "invoice" | "horse" | "activity" | "thread";
  relatedEntityId?: string;

  // Dismissal
  isDismissible: boolean;
  dismissedAt?: Timestamp;

  createdAt: Timestamp;
}

/**
 * Portal notification preferences
 */
export interface PortalNotificationPreferences {
  contactId: string;

  // Email notifications
  emailEnabled: boolean;
  emailOnInvoice: boolean;
  emailOnPaymentConfirmation: boolean;
  emailOnActivityReminder: boolean;
  emailOnHealthUpdate: boolean;
  emailOnMessage: boolean;

  // Push notifications (future)
  pushEnabled: boolean;
  pushOnInvoice: boolean;
  pushOnMessage: boolean;

  // SMS notifications (future)
  smsEnabled: boolean;
  smsOnUrgent: boolean;

  // Reminder timing
  invoiceReminderDaysBefore: number[];
  activityReminderHoursBefore: number[];

  updatedAt: Timestamp;
}

// ============================================================
// Create/Update DTOs
// ============================================================

export interface CreatePortalAccessData {
  contactId: string;
  role?: PortalUserRole;
  canViewInvoices?: boolean;
  canPayInvoices?: boolean;
  canViewActivities?: boolean;
  canViewHealthRecords?: boolean;
  canCommunicate?: boolean;
}

export interface UpdatePortalAccessData {
  role?: PortalUserRole;
  canViewInvoices?: boolean;
  canPayInvoices?: boolean;
  canViewActivities?: boolean;
  canViewHealthRecords?: boolean;
  canCommunicate?: boolean;
  isActive?: boolean;
}

export interface CreatePortalThreadData {
  subject: string;
  initialMessage: string;
}

export interface CreatePortalMessageData {
  content: string;
  attachmentIds?: string[];
}

export interface UpdatePortalNotificationPreferencesData {
  emailEnabled?: boolean;
  emailOnInvoice?: boolean;
  emailOnPaymentConfirmation?: boolean;
  emailOnActivityReminder?: boolean;
  emailOnHealthUpdate?: boolean;
  emailOnMessage?: boolean;
  pushEnabled?: boolean;
  pushOnInvoice?: boolean;
  pushOnMessage?: boolean;
  invoiceReminderDaysBefore?: number[];
  activityReminderHoursBefore?: number[];
}
