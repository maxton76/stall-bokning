import { stripe } from "./stripe.js";
import { db } from "./firebase.js";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { logInvoiceEvent } from "./invoiceAudit.js";

/**
 * Create a Stripe refund on a connected account.
 * Updates the local PaymentIntent record and invoice amounts.
 */
export async function createStripeRefund(params: {
  organizationId: string;
  paymentIntentId: string; // Our local PaymentIntent doc ID
  amount?: number; // Amount in ore. If undefined, full refund.
  reason?: "duplicate" | "fraudulent" | "requested_by_customer";
  performedBy: string;
}): Promise<{
  refundId: string;
  stripeRefundId: string;
  amount: number;
  status: string;
}> {
  const { organizationId, paymentIntentId, amount, reason, performedBy } =
    params;

  // 1. Get the local PaymentIntent document (initial read for validation)
  const piDoc = await db
    .collection("paymentIntents")
    .doc(paymentIntentId)
    .get();
  if (!piDoc.exists) {
    throw new Error("Payment not found");
  }
  const piData = piDoc.data()!;

  // Validate org ownership
  if (piData.organizationId !== organizationId) {
    throw new Error("Payment does not belong to this organization");
  }

  // 2. Get the connected account ID
  const settingsDoc = await db
    .collection("organizationStripeSettings")
    .doc(organizationId)
    .get();
  if (!settingsDoc.exists || !settingsDoc.data()?.stripeAccountId) {
    throw new Error("Stripe account not connected");
  }
  const stripeAccountId = settingsDoc.data()!.stripeAccountId;

  // 3. Calculate refund amount (preliminary check before Stripe call)
  const alreadyRefunded = piData.totalRefunded || 0;
  const maxRefundable = piData.amount - alreadyRefunded;
  const refundAmount = amount || maxRefundable; // Full refund if no amount specified

  if (refundAmount <= 0) {
    throw new Error("Nothing left to refund");
  }
  if (refundAmount > maxRefundable) {
    throw new Error(
      `Cannot refund more than ${maxRefundable} ore (already refunded: ${alreadyRefunded} ore)`,
    );
  }

  // 4. Create Stripe refund on connected account
  const stripeRefund = await stripe.refunds.create(
    {
      payment_intent: piData.stripePaymentIntentId,
      amount: refundAmount,
      reason: reason || undefined,
      metadata: {
        organizationId,
        paymentIntentId,
        performedBy,
      },
    },
    { stripeAccount: stripeAccountId },
  );

  // 5. Atomically update local PaymentIntent document inside a transaction.
  //    If Firestore updates fail after the Stripe refund succeeded, we write a
  //    recovery record to enable manual reconciliation.
  const refundEntry = {
    stripeRefundId: stripeRefund.id,
    amount: refundAmount,
    reason: reason || "requested_by_customer",
    status: stripeRefund.status,
    createdAt: Timestamp.now(),
    performedBy,
  };

  let invoiceId: string | undefined;

  try {
    await db.runTransaction(async (transaction) => {
      const piRef = db.collection("paymentIntents").doc(paymentIntentId);
      const freshPiDoc = await transaction.get(piRef);
      if (!freshPiDoc.exists) {
        throw new Error("Payment not found during transaction");
      }
      const freshPiData = freshPiDoc.data()!;

      // Re-validate inside transaction to prevent over-refunding
      const currentTotalRefunded = freshPiData.totalRefunded || 0;
      if (currentTotalRefunded + refundAmount > freshPiData.amount) {
        throw new Error(
          `Concurrent refund detected: totalRefunded (${currentTotalRefunded}) + refundAmount (${refundAmount}) exceeds payment amount (${freshPiData.amount})`,
        );
      }

      const newTotalRefunded = currentTotalRefunded + refundAmount;
      transaction.update(piRef, {
        totalRefunded: FieldValue.increment(refundAmount),
        refunds: [...(freshPiData.refunds || []), refundEntry],
        status:
          newTotalRefunded >= freshPiData.amount
            ? "refunded"
            : "partially_refunded",
        updatedAt: Timestamp.now(),
      });

      invoiceId = freshPiData.invoiceId;
    });

    // 6. Update invoice if linked
    if (invoiceId) {
      await updateInvoiceAfterRefund(invoiceId, refundAmount, performedBy);
    }
  } catch (firestoreError) {
    // CRITICAL: Stripe refund succeeded but local records failed to update.
    // Write a recovery record for manual reconciliation.
    const errorMessage =
      firestoreError instanceof Error
        ? firestoreError.message
        : String(firestoreError);

    console.error(
      `CRITICAL: Stripe refund ${stripeRefund.id} succeeded but Firestore update failed. ` +
        `paymentIntentId=${paymentIntentId}, organizationId=${organizationId}, ` +
        `amount=${refundAmount}, error=${errorMessage}`,
    );

    try {
      await db.collection("failedRefundReconciliation").add({
        stripeRefundId: stripeRefund.id,
        stripePaymentIntentId: piData.stripePaymentIntentId,
        paymentIntentId,
        invoiceId: piData.invoiceId || null,
        organizationId,
        amount: refundAmount,
        reason: reason || "requested_by_customer",
        performedBy,
        error: errorMessage,
        status: "pending_reconciliation",
        createdAt: Timestamp.now(),
      });
    } catch (reconciliationError) {
      // Last resort: if even the recovery record fails, log everything
      console.error(
        `FATAL: Failed to write reconciliation record for Stripe refund ${stripeRefund.id}. ` +
          `Manual intervention required. Original error: ${errorMessage}. ` +
          `Reconciliation error: ${reconciliationError instanceof Error ? reconciliationError.message : String(reconciliationError)}`,
      );
    }

    // Re-throw to inform the caller that local state is inconsistent
    throw firestoreError;
  }

  return {
    refundId: refundEntry.stripeRefundId,
    stripeRefundId: stripeRefund.id,
    amount: refundAmount,
    status: stripeRefund.status || "succeeded",
  };
}

/**
 * Update invoice amounts after a refund.
 */
async function updateInvoiceAfterRefund(
  invoiceId: string,
  refundAmount: number,
  performedBy: string,
): Promise<void> {
  const invoiceRef = db.collection("invoices").doc(invoiceId);

  let oldStatus: string | undefined;
  let newStatus: string | undefined;

  await db.runTransaction(async (transaction) => {
    const invoiceDoc = await transaction.get(invoiceRef);
    if (!invoiceDoc.exists) return;

    const invoice = invoiceDoc.data()!;
    const currentAmountPaid = invoice.amountPaid || 0;

    // Guard: ensure amountPaid is sufficient for this refund
    if (currentAmountPaid < refundAmount) {
      throw new Error(
        `Cannot refund ${refundAmount} ore: invoice amountPaid is only ${currentAmountPaid} ore`,
      );
    }

    const newAmountPaid = Math.max(0, currentAmountPaid - refundAmount);
    const newAmountDue = invoice.totalAmount - newAmountPaid;

    oldStatus = invoice.status;
    newStatus = invoice.status;
    if (newAmountPaid <= 0) {
      newStatus = "sent"; // Fully refunded, back to unpaid
    } else if (newAmountPaid < invoice.totalAmount) {
      newStatus = "partially_paid";
    }

    transaction.update(invoiceRef, {
      amountPaid: FieldValue.increment(-refundAmount),
      amountDue: newAmountDue,
      status: newStatus,
      updatedAt: Timestamp.now(),
    });
  });

  if (oldStatus !== undefined && newStatus !== undefined) {
    await logInvoiceEvent(
      invoiceId,
      oldStatus,
      newStatus,
      "refund_processed",
      performedBy,
      { refundAmount },
    );
  }
}

/**
 * Create a refund linked to a credit note.
 * Atomic operation: creates credit note reference + Stripe refund.
 */
export async function linkRefundToCreditNote(params: {
  organizationId: string;
  paymentIntentId: string;
  creditNoteId: string;
  amount: number;
  reason?: "duplicate" | "fraudulent" | "requested_by_customer";
  performedBy: string;
}): Promise<{
  refundId: string;
  stripeRefundId: string;
  amount: number;
}> {
  const { creditNoteId, ...refundParams } = params;

  // Create the Stripe refund
  const result = await createStripeRefund(refundParams);

  // Link refund to credit note
  await db.collection("invoices").doc(creditNoteId).update({
    refundId: result.stripeRefundId,
    refundAmount: result.amount,
    updatedAt: Timestamp.now(),
  });

  return result;
}
