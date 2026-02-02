import { Timestamp } from "firebase-admin/firestore";
import { db } from "./firebase.js";

/**
 * Log an immutable invoice status event to the audit trail.
 * Events are stored as subcollection documents under the invoice.
 * These records are append-only and should never be modified or deleted.
 */
export async function logInvoiceEvent(
  invoiceId: string,
  fromStatus: string | null,
  toStatus: string,
  action: string,
  performedBy: string,
  metadata?: Record<string, unknown>,
): Promise<string> {
  const eventData = {
    invoiceId,
    fromStatus,
    toStatus,
    action,
    performedBy,
    timestamp: Timestamp.now(),
    ...(metadata ? { metadata } : {}),
  };

  const docRef = await db
    .collection("invoices")
    .doc(invoiceId)
    .collection("statusEvents")
    .add(eventData);

  return docRef.id;
}

/**
 * Get all status events for an invoice, ordered by timestamp.
 */
export async function getInvoiceEvents(invoiceId: string): Promise<
  Array<{
    id: string;
    invoiceId: string;
    fromStatus: string | null;
    toStatus: string;
    action: string;
    performedBy: string;
    timestamp: any;
    metadata?: Record<string, unknown>;
  }>
> {
  const snapshot = await db
    .collection("invoices")
    .doc(invoiceId)
    .collection("statusEvents")
    .orderBy("timestamp", "asc")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as any;
}
