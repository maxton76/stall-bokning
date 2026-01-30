/**
 * Support Service
 *
 * Frontend service for ZenDesk support ticket management.
 */

import { apiClient } from "@/lib/apiClient";
import type {
  CreateSupportTicketInput,
  CreateSupportTicketResponse,
  ListSupportTicketsResponse,
  SupportAccessResponse,
  TicketConversationResponse,
  ReplyToTicketInput,
  ReplyToTicketResponse,
  UpdateTicketStatusInput,
  UpdateTicketStatusResponse,
} from "@equiduty/shared";

/**
 * Check if the current user has access to support
 * (requires paid subscription)
 */
export async function checkSupportAccess(): Promise<SupportAccessResponse> {
  return apiClient.get<SupportAccessResponse>("/support/access");
}

/**
 * Create a new support ticket
 */
export async function createSupportTicket(
  ticket: CreateSupportTicketInput,
): Promise<CreateSupportTicketResponse> {
  return apiClient.post<CreateSupportTicketResponse>(
    "/support/tickets",
    ticket,
  );
}

/**
 * List support tickets for the current user
 */
export async function listSupportTickets(): Promise<ListSupportTicketsResponse> {
  return apiClient.get<ListSupportTicketsResponse>("/support/tickets");
}

/**
 * Get conversation (comments) for a specific ticket
 */
export async function getTicketConversation(
  ticketId: number,
): Promise<TicketConversationResponse> {
  return apiClient.get<TicketConversationResponse>(
    `/support/tickets/${ticketId}/comments`,
  );
}

/**
 * Reply to a support ticket
 */
export async function replyToTicket(
  ticketId: number,
  input: ReplyToTicketInput,
): Promise<ReplyToTicketResponse> {
  return apiClient.post<ReplyToTicketResponse>(
    `/support/tickets/${ticketId}/reply`,
    input,
  );
}

/**
 * Update ticket status (close/reopen)
 */
export async function updateTicketStatus(
  ticketId: number,
  input: UpdateTicketStatusInput,
): Promise<UpdateTicketStatusResponse> {
  return apiClient.put<UpdateTicketStatusResponse>(
    `/support/tickets/${ticketId}/status`,
    input,
  );
}
