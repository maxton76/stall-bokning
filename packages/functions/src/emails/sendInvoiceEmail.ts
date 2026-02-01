/**
 * Invoice Email Orchestrator
 *
 * Renders the appropriate invoice email template and delivers it via the
 * existing sendEmail infrastructure (SMTP / SendGrid with auto-fallback).
 *
 * After a successful send the invoice document is updated with delivery
 * metadata and an immutable audit event is appended to the statusEvents
 * sub-collection.
 */

import { logger } from "firebase-functions";
import { db, Timestamp } from "../lib/firebase.js";
import { sendEmail } from "../notifications/sendEmail.js";
import {
  invoiceEmailTemplate,
  paymentConfirmationTemplate,
  paymentFailureTemplate,
  reminderEmailTemplate,
  creditNoteEmailTemplate,
} from "./invoiceEmailTemplates.js";
import { formatErrorMessage } from "@equiduty/shared";
import type { InvoiceEventAction } from "@equiduty/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InvoiceEmailType =
  | "invoice"
  | "payment_confirmation"
  | "payment_failure"
  | "reminder"
  | "credit_note";

export interface SendInvoiceEmailParams {
  invoiceId: string;
  emailType: InvoiceEmailType;
  locale?: "sv" | "en";
  /** Extra data merged into template context (e.g. receiptUrl, errorMessage) */
  additionalData?: Record<string, unknown>;
}

export interface SendInvoiceEmailResult {
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map email type to the audit action written to the statusEvents sub-collection.
 */
function emailTypeToAction(emailType: InvoiceEmailType): InvoiceEventAction {
  switch (emailType) {
    case "invoice":
      return "email_sent";
    case "payment_confirmation":
      return "payment_confirmation_sent";
    case "payment_failure":
      return "email_sent";
    case "reminder":
      return "reminder_email_sent";
    case "credit_note":
      return "email_sent";
  }
}

/**
 * Format a Firestore Timestamp into a locale-appropriate date string.
 */
function formatDate(
  ts: FirebaseFirestore.Timestamp | undefined,
  locale: "sv" | "en",
): string {
  if (!ts) return "";
  const date = ts.toDate();
  return date.toLocaleDateString(locale === "sv" ? "sv-SE" : "en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function sendInvoiceEmail(
  params: SendInvoiceEmailParams,
): Promise<SendInvoiceEmailResult> {
  const { invoiceId, emailType, locale = "sv", additionalData = {} } = params;

  try {
    // ------------------------------------------------------------------
    // 1. Fetch invoice
    // ------------------------------------------------------------------
    const invoiceRef = db.collection("invoices").doc(invoiceId);
    const invoiceDoc = await invoiceRef.get();

    if (!invoiceDoc.exists) {
      logger.warn({ invoiceId }, "sendInvoiceEmail: invoice not found");
      return { success: false, error: "Invoice not found" };
    }

    const invoice = invoiceDoc.data()!;

    // ------------------------------------------------------------------
    // 1b. Idempotency guard: skip if this exact email type was already
    //     sent recently (within 60 seconds) to prevent duplicate delivery.
    // ------------------------------------------------------------------
    const lastSentType = invoice.lastEmailTypeSent as string | undefined;
    const lastSentAt = invoice.lastEmailSentAt as
      | FirebaseFirestore.Timestamp
      | undefined;

    if (lastSentType === emailType && lastSentAt) {
      const secondsSinceLastSend =
        (Date.now() - lastSentAt.toDate().getTime()) / 1000;
      if (secondsSinceLastSend < 60) {
        logger.info(
          { invoiceId, emailType, secondsSinceLastSend },
          "sendInvoiceEmail: skipping duplicate send (idempotency guard)",
        );
        return { success: true };
      }
    }

    // ------------------------------------------------------------------
    // 2. Resolve contact email
    // ------------------------------------------------------------------
    const contactEmail = invoice.contactEmail as string | undefined;
    if (!contactEmail) {
      logger.warn(
        { invoiceId },
        "sendInvoiceEmail: no contact email on invoice",
      );
      return { success: false, error: "No contact email on invoice" };
    }

    // ------------------------------------------------------------------
    // 3. Resolve organisation name
    // ------------------------------------------------------------------
    let organizationName = invoice.organizationName as string | undefined;
    if (!organizationName && invoice.organizationId) {
      const orgDoc = await db
        .collection("organizations")
        .doc(invoice.organizationId)
        .get();
      organizationName = orgDoc.exists
        ? (orgDoc.data()!.name as string)
        : undefined;
    }
    organizationName = organizationName || "EquiDuty";

    // ------------------------------------------------------------------
    // 4. Render template
    // ------------------------------------------------------------------
    let subject: string;
    let htmlBody: string;
    let textBody: string;

    const invoiceNumber = (invoice.invoiceNumber as string) || invoiceId;
    const contactName = (invoice.contactName as string) || "";
    const currency = (invoice.currency as string) || "SEK";

    switch (emailType) {
      case "invoice": {
        const items = Array.isArray(invoice.items)
          ? (invoice.items as Array<Record<string, unknown>>).map((item) => ({
              description: (item.description as string) || "",
              quantity: (item.quantity as number) || 0,
              unitPrice: (item.unitPrice as number) || 0,
              totalPrice: (item.lineTotal as number) || 0,
            }))
          : undefined;

        const result = invoiceEmailTemplate(
          {
            invoiceNumber,
            contactName,
            organizationName,
            totalAmount: (invoice.total as number) || 0,
            currency,
            dueDate: formatDate(invoice.dueDate, locale),
            paymentLinkUrl:
              (additionalData.paymentLinkUrl as string) ||
              (invoice.checkoutUrl as string) ||
              (invoice.stripeInvoiceUrl as string) ||
              undefined,
            items,
          },
          locale,
        );
        subject = result.subject;
        htmlBody = result.htmlBody;
        textBody = result.textBody;
        break;
      }

      case "payment_confirmation": {
        const result = paymentConfirmationTemplate(
          {
            invoiceNumber,
            contactName,
            organizationName,
            amountPaid:
              (invoice.amountPaid as number) || (invoice.total as number) || 0,
            currency,
            paymentMethod:
              (additionalData.paymentMethod as string) || undefined,
            receiptUrl:
              (additionalData.receiptUrl as string) ||
              (invoice.receiptUrl as string) ||
              undefined,
          },
          locale,
        );
        subject = result.subject;
        htmlBody = result.htmlBody;
        textBody = result.textBody;
        break;
      }

      case "payment_failure": {
        const result = paymentFailureTemplate(
          {
            invoiceNumber,
            contactName,
            organizationName,
            amount: (invoice.total as number) || 0,
            currency,
            errorMessage: (additionalData.errorMessage as string) || undefined,
            retryUrl:
              (additionalData.retryUrl as string) ||
              (invoice.checkoutUrl as string) ||
              undefined,
          },
          locale,
        );
        subject = result.subject;
        htmlBody = result.htmlBody;
        textBody = result.textBody;
        break;
      }

      case "reminder": {
        const dueDateMs = invoice.dueDate
          ? (invoice.dueDate as FirebaseFirestore.Timestamp).toDate().getTime()
          : Date.now();
        const daysPastDue = Math.max(
          0,
          Math.floor((Date.now() - dueDateMs) / (1000 * 60 * 60 * 24)),
        );

        const result = reminderEmailTemplate(
          {
            invoiceNumber,
            contactName,
            organizationName,
            totalAmount: (invoice.total as number) || 0,
            amountDue:
              (invoice.amountDue as number) || (invoice.total as number) || 0,
            currency,
            dueDate: formatDate(invoice.dueDate, locale),
            daysPastDue,
            paymentLinkUrl:
              (additionalData.paymentLinkUrl as string) ||
              (invoice.checkoutUrl as string) ||
              (invoice.stripeInvoiceUrl as string) ||
              undefined,
          },
          locale,
        );
        subject = result.subject;
        htmlBody = result.htmlBody;
        textBody = result.textBody;
        break;
      }

      case "credit_note": {
        const result = creditNoteEmailTemplate(
          {
            invoiceNumber,
            creditNoteNumber:
              (invoice.creditNoteNumber as string) ||
              (additionalData.creditNoteNumber as string) ||
              invoiceNumber,
            contactName,
            organizationName,
            amount: (invoice.total as number) || 0,
            currency,
          },
          locale,
        );
        subject = result.subject;
        htmlBody = result.htmlBody;
        textBody = result.textBody;
        break;
      }

      default: {
        const _exhaustive: never = emailType;
        return { success: false, error: `Unknown email type: ${_exhaustive}` };
      }
    }

    // ------------------------------------------------------------------
    // 5. Send email
    // ------------------------------------------------------------------
    const sendResult = await sendEmail({
      to: contactEmail,
      subject,
      body: textBody,
      htmlBody,
    });

    // ------------------------------------------------------------------
    // 6. Update invoice + write audit event
    // ------------------------------------------------------------------
    if (sendResult.success) {
      const now = Timestamp.now();

      await invoiceRef.update({
        emailSentAt: now,
        emailSentTo: contactEmail,
        lastEmailTypeSent: emailType,
        lastEmailSentAt: now,
      });

      await invoiceRef.collection("statusEvents").add({
        invoiceId,
        fromStatus: invoice.status || null,
        toStatus: invoice.status || null,
        action: emailTypeToAction(emailType),
        performedBy: "system",
        timestamp: now,
        metadata: {
          emailType,
          sentTo: contactEmail,
        },
      });

      logger.info(
        { invoiceId, emailType, to: contactEmail },
        "Invoice email sent successfully",
      );
    } else {
      // Record failed attempt in audit trail
      await invoiceRef.collection("statusEvents").add({
        invoiceId,
        fromStatus: invoice.status || null,
        toStatus: invoice.status || null,
        action: "email_failed" as InvoiceEventAction,
        performedBy: "system",
        timestamp: Timestamp.now(),
        metadata: {
          emailType,
          sentTo: contactEmail,
          error: sendResult.error,
        },
      });

      logger.error(
        { invoiceId, emailType, error: sendResult.error },
        "Invoice email send failed",
      );
    }

    return sendResult;
  } catch (error) {
    const errorMsg = formatErrorMessage(error);
    logger.error(
      { error: errorMsg, invoiceId, emailType },
      "Failed to send invoice email",
    );
    return { success: false, error: errorMsg };
  }
}
