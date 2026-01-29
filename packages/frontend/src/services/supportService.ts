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
} from "@stall-bokning/shared";

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
