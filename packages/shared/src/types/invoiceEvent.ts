import type { Timestamp } from "firebase/firestore";

/**
 * Invoice Status Event — Immutable audit trail
 * Records all state transitions for an invoice.
 * Stored in: invoices/{invoiceId}/statusEvents/{id}
 */

/**
 * Actions that can trigger a status event
 */
export type InvoiceEventAction =
  | "created"
  | "updated"
  | "sent"
  | "payment_recorded"
  | "fully_paid"
  | "marked_overdue"
  | "reminder_sent"
  | "cancelled"
  | "voided"
  | "credit_note_created"
  | "credit_note_received"
  | "email_sent"
  | "email_failed"
  | "payment_confirmation_sent"
  | "reminder_email_sent"
  | "dispute_raised"
  | "dispute_resolved"
  | "dispute_rejected";

/**
 * Immutable invoice status event
 */
export interface InvoiceStatusEvent {
  id: string;
  invoiceId: string;

  /** Previous status (null for creation) */
  fromStatus: string | null;
  /** New status */
  toStatus: string;
  /** Action that triggered this event */
  action: InvoiceEventAction;

  /** Who performed the action */
  performedBy: string;
  /** When the event occurred */
  timestamp: Timestamp;

  /** Optional metadata (e.g., payment amount, credit note ID, reminder number) */
  metadata?: Record<string, unknown>;
}
