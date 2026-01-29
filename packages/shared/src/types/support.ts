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
 * ZenDesk webhook payload for agent replies
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

/**
 * Support access check response
 */
export interface SupportAccessResponse {
  hasAccess: boolean;
  reason?: "no_paid_plan" | "no_organization";
}
