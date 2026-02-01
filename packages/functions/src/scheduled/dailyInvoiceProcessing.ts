import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import * as crypto from "crypto";

import { db, Timestamp } from "../lib/firebase.js";
import { formatErrorMessage } from "@equiduty/shared";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_REMINDER_1_DAYS = 14;
const DEFAULT_REMINDER_2_DAYS = 30;
const DEFAULT_REMINDER_FEE_ORE = 6000; // 60 SEK
const DEFAULT_MAX_REMINDERS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 500;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Resolve billing contact for a member.
 * If the member belongs to a billing group, return the group's billing contact.
 * Otherwise, return the member's own userId as the billing contact.
 */
async function resolveBillingContactId(
  organizationId: string,
  memberId: string,
  memberData: FirebaseFirestore.DocumentData,
): Promise<string> {
  if (memberData.billingGroupId) {
    try {
      const groupDoc = await db
        .collection("billingGroups")
        .doc(memberData.billingGroupId)
        .get();

      if (groupDoc.exists) {
        const groupData = groupDoc.data();
        if (groupData?.billingContactId) {
          return groupData.billingContactId;
        }
      }
    } catch {
      // Fall through to default
    }
  }

  return memberData.userId || memberId;
}

/**
 * Determine the current billing period key (YYYY-MM) in Stockholm timezone.
 */
function getCurrentYearMonth(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  return `${year}-${month}`;
}

/**
 * Check if today is the 1st of the month in Stockholm timezone.
 */
function isFirstOfMonth(): boolean {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    day: "numeric",
  }).formatToParts(now);

  const day = parseInt(parts.find((p) => p.type === "day")?.value || "0", 10);
  return day === 1;
}

// ---------------------------------------------------------------------------
// Step 1: Recurring Billing
// ---------------------------------------------------------------------------

async function runRecurringBilling(executionId: string): Promise<void> {
  const now = new Date();

  logger.info(
    { executionId, timestamp: now.toISOString() },
    "Step 1: Starting recurring billing",
  );

  let totalOrgs = 0;
  let totalLineItems = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  const yearMonth = getCurrentYearMonth();

  const orgsSnapshot = await db
    .collection("organizations")
    .where("modules.invoicing", "==", true)
    .get();

  logger.info(
    { executionId, orgCount: orgsSnapshot.size, yearMonth },
    "Found organizations with invoicing module",
  );

  for (const orgDoc of orgsSnapshot.docs) {
    const organizationId = orgDoc.id;

    try {
      // 1. Get invoice settings for this org
      const settingsDoc = await db
        .collection("invoiceSettings")
        .doc(organizationId)
        .get();

      if (!settingsDoc.exists) {
        logger.warn(
          { executionId, organizationId },
          "No invoiceSettings found, skipping org",
        );
        totalSkipped++;
        continue;
      }

      const settings = settingsDoc.data()!;

      // 2. Check if it is time to run based on billing cadence
      const cadence = settings.billingCadence || "monthly";
      let shouldRun = false;

      if (cadence === "monthly") {
        shouldRun = isFirstOfMonth();
      } else {
        const lastRun = settings.lastBillingRun?.toDate();
        const intervalDays = settings.billingIntervalDays || 30;

        if (!lastRun) {
          shouldRun = true;
        } else {
          const daysSinceLastRun = Math.floor(
            (now.getTime() - lastRun.getTime()) / (24 * 60 * 60 * 1000),
          );
          shouldRun = daysSinceLastRun >= intervalDays;
        }
      }

      if (!shouldRun) {
        logger.debug(
          { executionId, organizationId, cadence },
          "Not time to run billing for this org",
        );
        continue;
      }

      totalOrgs++;

      // 3. Query active recurring chargeable items for this org
      const chargeableItemsSnapshot = await db
        .collection("chargeableItems")
        .where("organizationId", "==", organizationId)
        .where("category", "==", "recurring")
        .where("isActive", "==", true)
        .get();

      if (chargeableItemsSnapshot.empty) {
        logger.debug(
          { executionId, organizationId },
          "No active recurring chargeable items",
        );
        await settingsDoc.ref.update({
          lastBillingRun: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        continue;
      }

      // 4. Query active organization members
      const membersSnapshot = await db
        .collection("organizationMembers")
        .where("organizationId", "==", organizationId)
        .where("status", "==", "active")
        .get();

      if (membersSnapshot.empty) {
        logger.debug(
          { executionId, organizationId },
          "No active members in organization",
        );
        await settingsDoc.ref.update({
          lastBillingRun: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        continue;
      }

      logger.info(
        {
          executionId,
          organizationId,
          chargeableItemCount: chargeableItemsSnapshot.size,
          memberCount: membersSnapshot.size,
        },
        "Processing recurring billing for organization",
      );

      // 5. Generate line items for each chargeable item x member
      for (const itemDoc of chargeableItemsSnapshot.docs) {
        const chargeableItem = itemDoc.data();
        const chargeableItemId = itemDoc.id;

        for (const memberDoc of membersSnapshot.docs) {
          const memberData = memberDoc.data();
          const memberId = memberDoc.id;

          try {
            const idempotencyKey = `recurring-${chargeableItemId}-${memberId}-${yearMonth}`;

            // 6. Idempotency check
            const existingSnapshot = await db
              .collection("lineItems")
              .where("idempotencyKey", "==", idempotencyKey)
              .limit(1)
              .get();

            if (!existingSnapshot.empty) {
              totalSkipped++;
              continue;
            }

            const billingContactId = await resolveBillingContactId(
              organizationId,
              memberId,
              memberData,
            );

            const quantity = 1;
            const unitPrice = chargeableItem.defaultUnitPrice || 0;
            const vatRate = chargeableItem.vatRate || 0;

            const totalExclVat = unitPrice * quantity;
            const totalVat = Math.round((unitPrice * quantity * vatRate) / 100);
            const totalInclVat = totalExclVat + totalVat;

            const nowTimestamp = Timestamp.now();

            await db.collection("lineItems").add({
              memberId,
              billingContactId,
              chargeableItemId,
              description: chargeableItem.name || "",
              quantity,
              unitPrice,
              vatRate,
              totalExclVat,
              totalVat,
              totalInclVat,
              sourceType: "recurring",
              sourceId: chargeableItemId,
              idempotencyKey,
              status: "pending",
              date: nowTimestamp,
              organizationId,
              createdAt: nowTimestamp,
              updatedAt: nowTimestamp,
            });

            totalLineItems++;
          } catch (error) {
            totalErrors++;
            logger.error(
              {
                executionId,
                organizationId,
                chargeableItemId,
                memberId,
                error: formatErrorMessage(error),
              },
              "Error creating line item",
            );
          }
        }
      }

      // 7. Update lastBillingRun timestamp
      await settingsDoc.ref.update({
        lastBillingRun: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // 8. Auto-generate invoices (future implementation)
      // TODO: If settings.autoGenerateInvoices is enabled, trigger
      // invoice generation from the pending line items created above.

      logger.info(
        { executionId, organizationId },
        "Completed recurring billing for organization",
      );
    } catch (error) {
      totalErrors++;
      logger.error(
        {
          executionId,
          organizationId,
          error: formatErrorMessage(error),
        },
        "Error processing organization billing",
      );
    }
  }

  logger.info(
    {
      executionId,
      totalOrgs,
      totalLineItems,
      totalSkipped,
      totalErrors,
      duration: Date.now() - now.getTime(),
    },
    "Step 1: Recurring billing complete",
  );
}

// ---------------------------------------------------------------------------
// Step 2: Overdue Check
// ---------------------------------------------------------------------------

async function runOverdueCheck(executionId: string): Promise<void> {
  const now = Timestamp.now();

  logger.info({ executionId }, "Step 2: Starting invoice overdue check");

  const sentSnapshot = await db
    .collection("invoices")
    .where("status", "==", "sent")
    .where("dueDate", "<", now)
    .limit(BATCH_SIZE)
    .get();

  if (sentSnapshot.empty) {
    logger.info({ executionId }, "No overdue invoices found");
    return;
  }

  logger.info(
    { executionId, count: sentSnapshot.size },
    "Found invoices to mark as overdue",
  );

  let processed = 0;
  let errors = 0;

  for (const invoiceDoc of sentSnapshot.docs) {
    const invoiceId = invoiceDoc.id;

    try {
      const batch = db.batch();

      batch.update(invoiceDoc.ref, {
        status: "overdue",
        updatedAt: Timestamp.now(),
        updatedBy: "system",
      });

      const eventRef = invoiceDoc.ref.collection("statusEvents").doc();

      batch.set(eventRef, {
        invoiceId,
        fromStatus: "sent",
        toStatus: "overdue",
        action: "auto_overdue",
        performedBy: "system",
        timestamp: Timestamp.now(),
        metadata: {},
      });

      await batch.commit();
      processed++;
    } catch (error) {
      errors++;
      logger.error(
        {
          executionId,
          invoiceId,
          error: formatErrorMessage(error),
        },
        "Failed to mark invoice as overdue",
      );
    }
  }

  logger.info(
    { executionId, processed, errors },
    "Step 2: Invoice overdue check complete",
  );
}

// ---------------------------------------------------------------------------
// Step 3: Reminder Sender
// ---------------------------------------------------------------------------

async function runReminderSender(executionId: string): Promise<void> {
  const nowDate = new Date();

  logger.info(
    { executionId, timestamp: nowDate.toISOString() },
    "Step 3: Starting invoice reminder sender",
  );

  let totalRemindersSent = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  // Paginate through all organizations using cursor-based pagination
  let orgsQuery: FirebaseFirestore.Query = db
    .collection("organizations")
    .limit(BATCH_SIZE);

  while (true) {
    const orgsSnapshot = await orgsQuery.get();
    if (orgsSnapshot.empty) break;

    for (const orgDoc of orgsSnapshot.docs) {
      const orgId = orgDoc.id;

      try {
        const settingsDoc = await db
          .collection("invoiceSettings")
          .doc(orgId)
          .get();

        if (!settingsDoc.exists) {
          logger.info(
            { executionId, orgId },
            "No invoice settings configured, skipping organization",
          );
          continue;
        }

        const invoiceSettings = settingsDoc.data()!;

        const reminder1Days: number =
          invoiceSettings.reminder1DaysAfterDue ?? DEFAULT_REMINDER_1_DAYS;
        const reminder2Days: number =
          invoiceSettings.reminder2DaysAfterDue ?? DEFAULT_REMINDER_2_DAYS;
        const reminderFeeOre: number =
          invoiceSettings.reminderFee ?? DEFAULT_REMINDER_FEE_ORE;
        const reminderFeeDescription: string =
          invoiceSettings.reminderFeeDescription ?? "Påminnelseavgift";
        const maxReminders: number =
          invoiceSettings.maxReminders ?? DEFAULT_MAX_REMINDERS;

        const overdueSnapshot = await db
          .collection("invoices")
          .where("status", "==", "overdue")
          .where("organizationId", "==", orgId)
          .limit(BATCH_SIZE)
          .get();

        if (overdueSnapshot.empty) {
          continue;
        }

        let orgRemindersSent = 0;
        let orgSkipped = 0;

        for (const invoiceDoc of overdueSnapshot.docs) {
          const invoiceId = invoiceDoc.id;
          const invoice = invoiceDoc.data();

          try {
            const dueDate = invoice.dueDate?.toDate?.();
            if (!dueDate) {
              logger.warn(
                { executionId, invoiceId },
                "Invoice missing dueDate, skipping",
              );
              orgSkipped++;
              continue;
            }

            const daysSinceDue = Math.floor(
              (nowDate.getTime() - dueDate.getTime()) / MS_PER_DAY,
            );

            const existingRemindersSnapshot = await invoiceDoc.ref
              .collection("reminders")
              .orderBy("reminderNumber", "desc")
              .limit(maxReminders)
              .get();

            const reminderCount = existingRemindersSnapshot.size;

            if (reminderCount >= maxReminders) {
              orgSkipped++;
              continue;
            }

            const nextReminderNumber = reminderCount + 1;

            let shouldSend = false;

            if (nextReminderNumber === 1 && daysSinceDue >= reminder1Days) {
              shouldSend = true;
            } else if (
              nextReminderNumber === 2 &&
              daysSinceDue >= reminder2Days
            ) {
              shouldSend = true;
            } else if (nextReminderNumber >= 3) {
              const interval = reminder2Days - reminder1Days;
              const threshold =
                reminder2Days + interval * (nextReminderNumber - 2);
              if (daysSinceDue >= threshold) {
                shouldSend = true;
              }
            }

            if (!shouldSend) {
              orgSkipped++;
              continue;
            }

            // Idempotency: check if this reminder level was already sent
            const existingForLevel = existingRemindersSnapshot.docs.find(
              (d) => d.data().reminderNumber === nextReminderNumber,
            );
            if (existingForLevel) {
              orgSkipped++;
              continue;
            }

            // Add paminnelseavgift line item (idempotent via idempotencyKey)
            const idempotencyKey = `reminder-${invoiceId}-${nextReminderNumber}`;

            const existingLineItemSnapshot = await db
              .collection("lineItems")
              .where("idempotencyKey", "==", idempotencyKey)
              .limit(1)
              .get();

            if (existingLineItemSnapshot.empty) {
              await db.collection("lineItems").add({
                invoiceId,
                organizationId: orgId,
                description: reminderFeeDescription,
                unitPrice: reminderFeeOre,
                quantity: 1,
                vatRate: 0,
                sourceType: "reminder",
                sourceId: invoiceId,
                idempotencyKey,
                status: "pending",
                createdAt: Timestamp.now(),
                createdBy: "system",
              });
            }

            // Write reminder record
            await invoiceDoc.ref.collection("reminders").add({
              reminderNumber: nextReminderNumber,
              sentAt: Timestamp.now(),
              daysSinceDue,
              reminderFee: reminderFeeOre,
              emailSent: false,
            });

            // Write audit event
            await invoiceDoc.ref.collection("statusEvents").add({
              invoiceId,
              fromStatus: "overdue",
              toStatus: "overdue",
              action: `reminder_${nextReminderNumber}_sent`,
              performedBy: "system",
              timestamp: Timestamp.now(),
              metadata: {
                reminderNumber: nextReminderNumber,
                daysSinceDue,
                reminderFee: reminderFeeOre,
              },
            });

            // TODO: Send reminder email via SMTP integration

            orgRemindersSent++;

            logger.info(
              {
                executionId,
                invoiceId,
                orgId,
                reminderNumber: nextReminderNumber,
                daysSinceDue,
                reminderFeeOre,
              },
              "Invoice reminder sent",
            );
          } catch (error) {
            totalErrors++;
            logger.error(
              {
                executionId,
                invoiceId,
                orgId,
                error: formatErrorMessage(error),
              },
              "Failed to process invoice reminder",
            );
          }
        }

        totalRemindersSent += orgRemindersSent;
        totalSkipped += orgSkipped;

        if (orgRemindersSent > 0 || orgSkipped > 0) {
          logger.info(
            {
              executionId,
              orgId,
              remindersSent: orgRemindersSent,
              skipped: orgSkipped,
            },
            "Organization invoice reminders processed",
          );
        }
      } catch (error) {
        totalErrors++;
        logger.error(
          {
            executionId,
            orgId,
            error: formatErrorMessage(error),
          },
          "Failed to process organization invoices",
        );
      }
    }

    // If fewer results than BATCH_SIZE, we've reached the last page
    if (orgsSnapshot.size < BATCH_SIZE) break;

    // Advance cursor to next page
    orgsQuery = db
      .collection("organizations")
      .startAfter(orgsSnapshot.docs[orgsSnapshot.docs.length - 1])
      .limit(BATCH_SIZE);
  }

  logger.info(
    {
      executionId,
      totalRemindersSent,
      totalSkipped,
      totalErrors,
      duration: Date.now() - nowDate.getTime(),
    },
    "Step 3: Invoice reminder sender complete",
  );
}

// ---------------------------------------------------------------------------
// Exported scheduled function
// ---------------------------------------------------------------------------

/**
 * Daily Invoice Processing
 * Runs daily at 02:00 Stockholm time.
 * Executes three sequential steps:
 *   1. Generate recurring line items
 *   2. Mark overdue invoices
 *   3. Send reminders for overdue invoices
 *
 * Each step is wrapped in its own try/catch so a failure in one step
 * does not block subsequent steps.
 */
export const dailyInvoiceProcessing = onSchedule(
  {
    schedule: "0 2 * * *",
    timeZone: "Europe/Stockholm",
    region: "europe-west1",
    retryCount: 2,
  },
  async (_event) => {
    const executionId = crypto.randomUUID();
    const startTime = Date.now();

    logger.info(
      { executionId, timestamp: new Date().toISOString() },
      "Starting daily invoice processing",
    );

    // Step 1: Generate recurring line items
    try {
      await runRecurringBilling(executionId);
    } catch (error) {
      logger.error(
        { executionId, step: 1, error: formatErrorMessage(error) },
        "Recurring billing step failed",
      );
    }

    // Step 2: Mark overdue invoices
    try {
      await runOverdueCheck(executionId);
    } catch (error) {
      logger.error(
        { executionId, step: 2, error: formatErrorMessage(error) },
        "Overdue check step failed",
      );
    }

    // Step 3: Send reminders for overdue invoices
    try {
      await runReminderSender(executionId);
    } catch (error) {
      logger.error(
        { executionId, step: 3, error: formatErrorMessage(error) },
        "Reminder sender step failed",
      );
    }

    logger.info(
      { executionId, duration: Date.now() - startTime },
      "Daily invoice processing complete",
    );
  },
);
