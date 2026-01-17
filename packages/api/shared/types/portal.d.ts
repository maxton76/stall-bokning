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
  userId: string;
  organizationId: string;
  role: PortalUserRole;
  canViewInvoices: boolean;
  canPayInvoices: boolean;
  canViewActivities: boolean;
  canViewHealthRecords: boolean;
  canCommunicate: boolean;
  notifyOnInvoice: boolean;
  notifyOnActivity: boolean;
  notifyOnHealthUpdate: boolean;
  notifyOnMessage: boolean;
  isActive: boolean;
  lastAccessAt?: Timestamp;
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
  stableId?: string;
  stableName?: string;
  stallNumber?: string;
  ownershipType: "owner" | "co_owner" | "leaser";
  ownershipStartDate?: Date;
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
  periodStart?: Date;
  periodEnd?: Date;
  itemCount: number;
  horsesIncluded: string[];
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
  horseId?: string;
  horseName?: string;
  stableId?: string;
  stableName?: string;
  assignedStaffNames?: string[];
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
  contactName: string;
  organizationName: string;
  lastMessageAt: Timestamp;
  lastMessagePreview: string;
  unreadCount: number;
  isClosed: boolean;
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
  senderType: "portal_user" | "staff";
  senderId: string;
  senderName: string;
  isRead: boolean;
  readAt?: Timestamp;
  attachments?: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
  createdAt: Timestamp;
}
/**
 * Portal dashboard data - aggregated view for horse owner
 */
export interface PortalDashboardData {
  contactName: string;
  organizationName: string;
  lastLogin?: Date;
  horseCount: number;
  unpaidInvoiceCount: number;
  totalAmountDue: number;
  currency: string;
  upcomingActivityCount: number;
  unreadMessageCount: number;
  recentInvoices: PortalInvoiceSummary[];
  upcomingActivities: PortalActivitySummary[];
  horses: PortalHorseSummary[];
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
  relatedEntityType?: "invoice" | "horse" | "activity" | "thread";
  relatedEntityId?: string;
  isDismissible: boolean;
  dismissedAt?: Timestamp;
  createdAt: Timestamp;
}
/**
 * Portal notification preferences
 */
export interface PortalNotificationPreferences {
  contactId: string;
  emailEnabled: boolean;
  emailOnInvoice: boolean;
  emailOnPaymentConfirmation: boolean;
  emailOnActivityReminder: boolean;
  emailOnHealthUpdate: boolean;
  emailOnMessage: boolean;
  pushEnabled: boolean;
  pushOnInvoice: boolean;
  pushOnMessage: boolean;
  smsEnabled: boolean;
  smsOnUrgent: boolean;
  invoiceReminderDaysBefore: number[];
  activityReminderHoursBefore: number[];
  updatedAt: Timestamp;
}
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
//# sourceMappingURL=portal.d.ts.map
