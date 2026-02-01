import { Timestamp } from "firebase-admin/firestore";
import { db } from "./firebase.js";
import { deductFromPackage } from "./packageDeduction.js";

/**
 * Generate line items for activity/lesson attendance.
 * For each attendee, either deducts from klippkort or creates a billable line item.
 */
export async function generateActivityLineItems(
  activityId: string,
  organizationId: string,
  chargeableItemId: string,
  unitPrice: number, // öre
  vatRate: number,
  attendees: Array<{
    memberId: string;
    billingContactId: string;
    horseId?: string;
  }>,
  activityDate: Date,
  description: string,
  createdBy: string,
): Promise<
  Array<{
    lineItemId: string;
    type: "billed" | "deducted";
    deductionId?: string;
  }>
> {
  const results: Array<{
    lineItemId: string;
    type: "billed" | "deducted";
    deductionId?: string;
  }> = [];

  for (const attendee of attendees) {
    const idempotencyKey = `activity-${activityId}-${attendee.memberId}-${activityDate.toISOString().slice(0, 10)}`;

    // Use a deterministic doc based on idempotency key for atomic check-and-create
    const idempotencyRef = db
      .collection("lineItemIdempotency")
      .doc(idempotencyKey);

    const totalExclVat = unitPrice; // quantity is 1 per attendee
    const totalVat = Math.round(totalExclVat * (vatRate / 100));
    const totalInclVat = totalExclVat + totalVat;

    const lineItemData = {
      organizationId,
      memberId: attendee.memberId,
      billingContactId: attendee.billingContactId,
      date: Timestamp.fromDate(activityDate),
      chargeableItemId,
      description,
      quantity: 1,
      unitPrice,
      vatRate,
      totalExclVat,
      totalVat,
      totalInclVat,
      sourceType: "activity",
      sourceId: activityId,
      idempotencyKey,
      horseId: attendee.horseId || null,
      status: "pending",
      packageDeductionId: null,
      createdAt: Timestamp.now(),
      createdBy,
      updatedAt: Timestamp.now(),
      updatedBy: createdBy,
    };

    // Atomic idempotency: transaction reads the idempotency doc, creates line item only if not exists
    let lineItemId: string | null = null;
    let alreadyExists = false;

    await db.runTransaction(async (transaction) => {
      const idempotencyDoc = await transaction.get(idempotencyRef);

      if (idempotencyDoc.exists) {
        lineItemId = idempotencyDoc.data()!.lineItemId;
        alreadyExists = true;
        return;
      }

      // Create the line item with an auto-generated ID
      const lineItemRef = db.collection("lineItems").doc();
      transaction.set(lineItemRef, lineItemData);

      // Record the idempotency mapping atomically
      transaction.set(idempotencyRef, {
        lineItemId: lineItemRef.id,
        createdAt: Timestamp.now(),
      });

      lineItemId = lineItemRef.id;
    });

    if (alreadyExists) {
      results.push({ lineItemId: lineItemId!, type: "billed" });
      continue;
    }

    const lineItemRef = db.collection("lineItems").doc(lineItemId!);

    // Try to deduct from klippkort
    const deduction = await deductFromPackage(
      attendee.memberId,
      chargeableItemId,
      organizationId,
      lineItemRef.id,
      createdBy,
    );

    if (deduction) {
      // Mark line item as covered by package
      await lineItemRef.update({
        packageDeductionId: deduction.deductionId,
        status: "pending", // Still pending but has a deduction reference
        updatedAt: Timestamp.now(),
      });
      results.push({
        lineItemId: lineItemRef.id,
        type: "deducted",
        deductionId: deduction.deductionId,
      });
    } else {
      results.push({ lineItemId: lineItemRef.id, type: "billed" });
    }
  }

  return results;
}

/**
 * Generate a cancellation fee line item.
 */
export async function generateCancellationLineItem(
  bookingId: string,
  organizationId: string,
  memberId: string,
  billingContactId: string,
  unitPrice: number, // fee in öre
  vatRate: number,
  reason: string,
  createdBy: string,
): Promise<string> {
  const idempotencyKey = `cancellation-${bookingId}`;
  const idempotencyRef = db
    .collection("lineItemIdempotency")
    .doc(idempotencyKey);

  const totalExclVat = unitPrice;
  const totalVat = Math.round(totalExclVat * (vatRate / 100));
  const totalInclVat = totalExclVat + totalVat;

  const lineItemData = {
    organizationId,
    memberId,
    billingContactId,
    date: Timestamp.now(),
    description: `Avbokningsavgift: ${reason}`,
    quantity: 1,
    unitPrice,
    vatRate,
    totalExclVat,
    totalVat,
    totalInclVat,
    sourceType: "cancellation_fee",
    sourceId: bookingId,
    idempotencyKey,
    status: "pending",
    packageDeductionId: null,
    createdAt: Timestamp.now(),
    createdBy,
    updatedAt: Timestamp.now(),
    updatedBy: createdBy,
  };

  let lineItemId: string;

  await db.runTransaction(async (transaction) => {
    const idempotencyDoc = await transaction.get(idempotencyRef);

    if (idempotencyDoc.exists) {
      lineItemId = idempotencyDoc.data()!.lineItemId;
      return;
    }

    const lineItemRef = db.collection("lineItems").doc();
    transaction.set(lineItemRef, lineItemData);
    transaction.set(idempotencyRef, {
      lineItemId: lineItemRef.id,
      createdAt: Timestamp.now(),
    });

    lineItemId = lineItemRef.id;
  });

  return lineItemId!;
}
