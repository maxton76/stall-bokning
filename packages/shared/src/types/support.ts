/**
 * Support ticket types for ZenDesk integration
 */

/**
 * Support ticket categories
 */
export type SupportTicketCategory =
  | "booking"
  | "billing"
  | "technical"
  | "other";

/**
 * Support ticket status from ZenDesk
 */
export type SupportTicketStatus =
  | "new"
  | "open"
  | "pending"
  | "hold"
  | "solved"
  | "closed";

/**
 * Input for creating a support ticket
 */
export interface CreateSupportTicketInput {
  subject: string;
  message: string;
  category: SupportTicketCategory;
}

/**
 * Response from creating a support ticket
 */
export interface CreateSupportTicketResponse {
  ticketId: number;
  status: string;
  message: string;
}

/**
 * Support ticket summary for listing
 */
export interface SupportTicketSummary {
  id: number;
  subject: string;
  status: SupportTicketStatus;
  category: SupportTicketCategory;
  createdAt: string;
  updatedAt: string;
}

/**
 * List of support tickets response
 */
export interface ListSupportTicketsResponse {
  tickets: SupportTicketSummary[];
  count: number;
}

/**
 * ZenDesk webhook payload for agent replies (custom format - deprecated)
 * @deprecated Use ZendeskNativeWebhookPayload for native Zendesk webhook format
 */
export interface ZendeskWebhookPayload {
  event: "agent_reply";
  ticket_id: string;
  ticket_subject: string;
  requester_email: string;
  requester_name: string;
  latest_comment: string;
  agent_name: string;
  custom_user_id?: string;
  custom_org_id?: string;
}

// ============================================================================
// Native Zendesk Webhook Types
// ============================================================================

/**
 * Native Zendesk webhook comment author
 */
export interface ZendeskWebhookAuthor {
  id: string;
  is_staff: boolean;
  name: string;
}

/**
 * Native Zendesk webhook comment
 */
export interface ZendeskWebhookComment {
  author: ZendeskWebhookAuthor;
  body: string;
  id: string;
  is_public: boolean;
}

/**
 * Native Zendesk webhook event
 */
export interface ZendeskWebhookEvent {
  comment: ZendeskWebhookComment;
  meta?: {
    sequence?: { id: string; position: number };
  };
}

/**
 * Native Zendesk webhook detail (ticket info)
 */
export interface ZendeskWebhookDetail {
  id: string;
  subject: string;
  status: string;
  requester_id: string;
  assignee_id?: string;
  group_id?: string;
}

/**
 * Native Zendesk webhook payload
 * This is the format Zendesk sends when using native webhook events
 */
export interface ZendeskNativeWebhookPayload {
  account_id: number;
  id: string;
  type: string; // e.g., "zen:event-type:ticket.comment_added"
  subject: string; // e.g., "zen:ticket:342757"
  time: string;
  zendesk_event_version: string;
  detail: ZendeskWebhookDetail;
  event: ZendeskWebhookEvent;
}

/**
 * Support access check response
 */
export interface SupportAccessResponse {
  hasAccess: boolean;
  reason?: "no_paid_plan" | "no_organization";
}

// ============================================================================
// Ticket Conversation Types
// ============================================================================

/**
 * A single comment in a ticket conversation
 */
export interface SupportTicketComment {
  id: number;
  body: string;
  authorName: string;
  isStaff: boolean;
  isPublic: boolean;
  createdAt: string;
}

/**
 * Response for GET /support/tickets/:ticketId/comments
 */
export interface TicketConversationResponse {
  ticketId: number;
  subject: string;
  status: SupportTicketStatus;
  comments: SupportTicketComment[];
}

/**
 * Input for POST /support/tickets/:ticketId/reply
 */
export interface ReplyToTicketInput {
  message: string;
}

/**
 * Response for POST /support/tickets/:ticketId/reply
 */
export interface ReplyToTicketResponse {
  success: boolean;
}

/**
 * Input for PUT /support/tickets/:ticketId/status
 */
export interface UpdateTicketStatusInput {
  status: "solved" | "open";
}

/**
 * Response for PUT /support/tickets/:ticketId/status
 */
export interface UpdateTicketStatusResponse {
  success: boolean;
}
