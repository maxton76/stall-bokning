/**
 * Firestore Trigger: Invoice Status Change
 *
 * Fires on every update to an invoice document.  When a meaningful status
 * transition is detected the appropriate email is dispatched automatically.
 *
 * Supported transitions:
 *   * -> sent           : Send the invoice email
 *   * -> paid           : Send a payment confirmation
 *   * -> overdue        : (future) Could trigger a reminder
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import { db, Timestamp } from "../lib/firebase.js";
import { sendInvoiceEmail } from "../emails/sendInvoiceEmail.js";

export const onInvoiceStatusChange = onDocumentUpdated(
  {
    document: "invoices/{invoiceId}",
    region: "europe-west1",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const invoiceId = event.params.invoiceId;

    if (!before || !after) {
      logger.warn(
        { invoiceId },
        "onInvoiceStatusChange: missing before/after data",
      );
      return;
    }

    const oldStatus = before.status as string | undefined;
    const newStatus = after.status as string | undefined;

    // Only act on actual status changes
    if (oldStatus === newStatus) {
      return;
    }

    logger.info({ invoiceId, oldStatus, newStatus }, "Invoice status changed");

    const locale = (after.language as "sv" | "en") || "sv";
    const invoiceRef = db.collection("invoices").doc(invoiceId);

    // -----------------------------------------------------------------
    // Idempotency helper: check if email for this transition was already sent.
    // Cloud Functions may retry on transient failures, so we guard against
    // duplicate emails by recording a per-transition timestamp field.
    // -----------------------------------------------------------------
    async function hasEmailBeenSent(transitionKey: string): Promise<boolean> {
      const doc = await invoiceRef.get();
      const data = doc.data();
      return !!data?.emailSentForTransition?.[transitionKey];
    }

    async function markEmailSent(transitionKey: string): Promise<void> {
      await invoiceRef.update({
        [`emailSentForTransition.${transitionKey}`]: Timestamp.now(),
      });
    }

    // -----------------------------------------------------------------
    // Transition: * -> sent
    // -----------------------------------------------------------------
    if (newStatus === "sent" && oldStatus !== "sent") {
      const transitionKey = `${oldStatus}_to_sent`;

      if (await hasEmailBeenSent(transitionKey)) {
        logger.info(
          { invoiceId, transitionKey },
          "Skipping duplicate invoice email (already sent for this transition)",
        );
      } else {
        logger.info(
          { invoiceId, transition: `${oldStatus} -> sent` },
          "Sending invoice email",
        );

        const result = await sendInvoiceEmail({
          invoiceId,
          emailType: "invoice",
          locale,
        });

        if (result.success) {
          await markEmailSent(transitionKey);
        } else {
          logger.error(
            { invoiceId, error: result.error },
            "Failed to send invoice email on status change",
          );
        }
      }
    }

    // -----------------------------------------------------------------
    // Transition: * -> paid
    // -----------------------------------------------------------------
    if (newStatus === "paid" && oldStatus !== "paid") {
      const transitionKey = `${oldStatus}_to_paid`;

      if (await hasEmailBeenSent(transitionKey)) {
        logger.info(
          { invoiceId, transitionKey },
          "Skipping duplicate payment confirmation email (already sent for this transition)",
        );
      } else {
        logger.info(
          { invoiceId, transition: `${oldStatus} -> paid` },
          "Sending payment confirmation email",
        );

        const result = await sendInvoiceEmail({
          invoiceId,
          emailType: "payment_confirmation",
          locale,
        });

        if (result.success) {
          await markEmailSent(transitionKey);
        } else {
          logger.error(
            { invoiceId, error: result.error },
            "Failed to send payment confirmation on status change",
          );
        }
      }
    }

    // -----------------------------------------------------------------
    // Transition: * -> overdue  (log only, reminders handled by scheduler)
    // -----------------------------------------------------------------
    if (newStatus === "overdue" && oldStatus !== "overdue") {
      logger.info(
        { invoiceId, transition: `${oldStatus} -> overdue` },
        "Invoice marked overdue - reminders handled by daily scheduler",
      );
    }
  },
);
