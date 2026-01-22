/**
 * Communication History Types
 *
 * Types for tracking communication with contacts including
 * emails, phone calls, meetings, and notes.
 */

import type { Timestamp } from "firebase/firestore";

// ============================================================================
// Communication Record Types
// ============================================================================

/**
 * Type of communication channel used
 */
export type CommunicationType =
  | "email"
  | "sms"
  | "phone"
  | "meeting"
  | "note"
  | "telegram"
  | "in_app";

/**
 * Direction of communication
 */
export type CommunicationDirection = "outbound" | "inbound";

/**
 * Status of the communication
 */
export type CommunicationStatus =
  | "draft"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "scheduled";

/**
 * Communication record representing an interaction with a contact
 */
export interface CommunicationRecord {
  id: string;
  organizationId: string;
  contactId: string;
  contactName: string;

  // Communication details
  type: CommunicationType;
  direction: CommunicationDirection;
  status: CommunicationStatus;

  // Content
  subject?: string;
  content: string;
  summary?: string; // Brief summary for list views

  // Attachments
  attachments?: CommunicationAttachment[];

  // Related entities
  relatedInvoiceId?: string;
  relatedHorseId?: string;
  relatedActivityId?: string;
  relatedNotificationId?: string;

  // Metadata
  channel?: string; // e.g., "sendgrid", "twilio", "telegram"
  externalId?: string; // ID from external service
  metadata?: Record<string, unknown>;

  // Timing
  scheduledAt?: Timestamp;
  occurredAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // User tracking
  createdBy: string;
  createdByName: string;
}

/**
 * Attachment included in communication
 */
export interface CommunicationAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
}

/**
 * Input for creating a new communication record
 */
export interface CreateCommunicationInput {
  contactId: string;
  type: CommunicationType;
  direction: CommunicationDirection;
  subject?: string;
  content: string;
  summary?: string;
  relatedInvoiceId?: string;
  relatedHorseId?: string;
  relatedActivityId?: string;
  occurredAt?: Date;
  scheduledAt?: Date;
  attachments?: Omit<CommunicationAttachment, "id">[];
  metadata?: Record<string, unknown>;
}

/**
 * Input for updating a communication record
 */
export interface UpdateCommunicationInput {
  subject?: string;
  content?: string;
  summary?: string;
  status?: CommunicationStatus;
  relatedInvoiceId?: string;
  relatedHorseId?: string;
  relatedActivityId?: string;
  occurredAt?: Date;
  scheduledAt?: Date;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Communication Templates
// ============================================================================

/**
 * Template for common communication types
 */
export interface CommunicationTemplate {
  id: string;
  organizationId: string;
  name: string;
  description?: string;

  // Template details
  type: CommunicationType;
  subject?: string;
  content: string;

  // Variables that can be replaced in template
  variables: string[];

  // Categorization
  category?: string;
  tags?: string[];

  // Usage tracking
  usageCount: number;
  lastUsedAt?: Timestamp;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

/**
 * Input for creating a communication template
 */
export interface CreateTemplateInput {
  name: string;
  description?: string;
  type: CommunicationType;
  subject?: string;
  content: string;
  variables?: string[];
  category?: string;
  tags?: string[];
}

// ============================================================================
// Communication Analytics
// ============================================================================

/**
 * Communication statistics for a contact
 */
export interface ContactCommunicationStats {
  contactId: string;
  totalCommunications: number;
  byType: Record<CommunicationType, number>;
  byDirection: Record<CommunicationDirection, number>;
  lastCommunication?: Timestamp;
  responseRate?: number; // For outbound, what % got responses
}

/**
 * Communication summary for dashboard/reports
 */
export interface CommunicationSummary {
  period: "day" | "week" | "month" | "year";
  startDate: Date;
  endDate: Date;

  // Totals
  totalCount: number;
  outboundCount: number;
  inboundCount: number;

  // By type
  byType: Record<CommunicationType, number>;

  // By status
  byStatus: Record<CommunicationStatus, number>;

  // Top contacts
  topContacts: {
    contactId: string;
    contactName: string;
    count: number;
  }[];
}

// ============================================================================
// Filter and Query Types
// ============================================================================

/**
 * Filters for querying communication records
 */
export interface CommunicationFilters {
  contactId?: string;
  type?: CommunicationType | CommunicationType[];
  direction?: CommunicationDirection;
  status?: CommunicationStatus | CommunicationStatus[];
  startDate?: Date;
  endDate?: Date;
  searchQuery?: string;
  relatedInvoiceId?: string;
  relatedHorseId?: string;
  createdBy?: string;
}

/**
 * Sort options for communication list
 */
export interface CommunicationSortOptions {
  field: "occurredAt" | "createdAt" | "contactName" | "type";
  direction: "asc" | "desc";
}

/**
 * Paginated communication response
 */
export interface PaginatedCommunications {
  items: CommunicationRecord[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Communication type display configuration
 */
export const COMMUNICATION_TYPE_CONFIG: Record<
  CommunicationType,
  {
    label: string;
    icon: string;
    color: string;
  }
> = {
  email: { label: "Email", icon: "Mail", color: "blue" },
  sms: { label: "SMS", icon: "MessageSquare", color: "green" },
  phone: { label: "Phone", icon: "Phone", color: "purple" },
  meeting: { label: "Meeting", icon: "Users", color: "orange" },
  note: { label: "Note", icon: "FileText", color: "gray" },
  telegram: { label: "Telegram", icon: "Send", color: "cyan" },
  in_app: { label: "In-app", icon: "Bell", color: "indigo" },
};

/**
 * Communication status display configuration
 */
export const COMMUNICATION_STATUS_CONFIG: Record<
  CommunicationStatus,
  {
    label: string;
    color: string;
  }
> = {
  draft: { label: "Draft", color: "gray" },
  sent: { label: "Sent", color: "blue" },
  delivered: { label: "Delivered", color: "green" },
  read: { label: "Read", color: "emerald" },
  failed: { label: "Failed", color: "red" },
  scheduled: { label: "Scheduled", color: "yellow" },
};
