/**
 * Communication History Types
 *
 * Types for tracking communication with contacts including
 * emails, phone calls, meetings, and notes.
 */
import type { Timestamp } from "firebase/firestore";
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
  type: CommunicationType;
  direction: CommunicationDirection;
  status: CommunicationStatus;
  subject?: string;
  content: string;
  summary?: string;
  attachments?: CommunicationAttachment[];
  relatedInvoiceId?: string;
  relatedHorseId?: string;
  relatedActivityId?: string;
  relatedNotificationId?: string;
  channel?: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
  scheduledAt?: Timestamp;
  occurredAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
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
/**
 * Template for common communication types
 */
export interface CommunicationTemplate {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  type: CommunicationType;
  subject?: string;
  content: string;
  variables: string[];
  category?: string;
  tags?: string[];
  usageCount: number;
  lastUsedAt?: Timestamp;
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
/**
 * Communication statistics for a contact
 */
export interface ContactCommunicationStats {
  contactId: string;
  totalCommunications: number;
  byType: Record<CommunicationType, number>;
  byDirection: Record<CommunicationDirection, number>;
  lastCommunication?: Timestamp;
  responseRate?: number;
}
/**
 * Communication summary for dashboard/reports
 */
export interface CommunicationSummary {
  period: "day" | "week" | "month" | "year";
  startDate: Date;
  endDate: Date;
  totalCount: number;
  outboundCount: number;
  inboundCount: number;
  byType: Record<CommunicationType, number>;
  byStatus: Record<CommunicationStatus, number>;
  topContacts: {
    contactId: string;
    contactName: string;
    count: number;
  }[];
}
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
/**
 * Communication type display configuration
 */
export declare const COMMUNICATION_TYPE_CONFIG: Record<
  CommunicationType,
  {
    label: string;
    icon: string;
    color: string;
  }
>;
/**
 * Communication status display configuration
 */
export declare const COMMUNICATION_STATUS_CONFIG: Record<
  CommunicationStatus,
  {
    label: string;
    color: string;
  }
>;
//# sourceMappingURL=communication.d.ts.map
