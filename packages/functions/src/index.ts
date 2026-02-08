import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import * as crypto from "crypto";

import { db, Timestamp } from "./lib/firebase.js";
import { formatErrorMessage, validateNumber } from "@equiduty/shared";

// Re-export scheduled functions
export { generateActivityInstances } from "./scheduled/generateInstances.js";
export { scanForReminders } from "./scheduled/reminderScanner.js";
export { expirePendingMemberships } from "./scheduled/expirePendingMemberships.js";
export { dailyInvoiceProcessing } from "./scheduled/dailyInvoiceProcessing.js";
export { scanForBillingNotifications } from "./scheduled/billingNotifications.js";

// Re-export notification functions
export {
  processNotificationQueue,
  retryFailedNotifications,
  cleanupOldNotifications,
} from "./notifications/index.js";

// Re-export trigger functions
export { onSchedulePublished } from "./triggers/onSchedulePublished.js";
export { onRoutineScheduleCreated } from "./triggers/onRoutineScheduleCreated.js";
export { onRoutineScheduleDeleted } from "./triggers/onRoutineScheduleDeleted.js";
export { processBulkImport } from "./triggers/processBulkImport.js";
export { onInvoiceStatusChange } from "./triggers/onInvoiceStatusChange.js";
export { onActivityUpdated } from "./triggers/onActivityUpdated.js";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AccrualConfig {
  monthlyAccrualHours: number;
  maxCarryoverHours: number;
  maxBalanceHours: number;
}

interface TimeBalanceData {
  carryoverFromPreviousYear: number;
  buildUpHours: number;
  corrections: number;
  approvedLeave: number;
  tentativeLeave: number;
  approvedOvertime: number;
  lastAccrualMonth?: string;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate and sanitize accrual configuration
 * Ensures all values are within reasonable bounds
 */
function validateAccrualConfig(config: unknown): AccrualConfig {
  const rawConfig =
    config && typeof config === "object"
      ? (config as Record<string, unknown>)
      : {};

  return {
    monthlyAccrualHours: validateNumber(
      rawConfig.monthlyAccrualHours,
      2.5,
      0,
      10,
    ),
    maxCarryoverHours: validateNumber(rawConfig.maxCarryoverHours, 40, 0, 500),
    maxBalanceHours: validateNumber(rawConfig.maxBalanceHours, 100, 0, 1000),
  };
}

/**
 * Safely calculate weekly hours from a schedule with bounds checking
 * Validates each day's data to prevent data corruption attacks
 */
function validateScheduleHours(schedule: unknown): number {
  if (!schedule || typeof schedule !== "object") {
    return 0;
  }

  const scheduleData = schedule as Record<string, unknown>;
  const weeklySchedule = scheduleData.weeklySchedule;

  if (!Array.isArray(weeklySchedule)) {
    return 0;
  }

  return weeklySchedule.reduce((sum: number, day: unknown) => {
    if (typeof day !== "object" || day === null) {
      return sum;
    }

    const d = day as Record<string, unknown>;
    const isWorkDay = d.isWorkDay === true;

    if (!isWorkDay) {
      return sum;
    }

    const hours = typeof d.hours === "number" ? d.hours : 0;
    // Bounds check: 0-24 hours per day (reasonable work day limit)
    const validHours = Math.max(0, Math.min(24, hours));

    return sum + validHours;
  }, 0);
}

/**
 * Validate and extract time balance data with safe defaults
 */
function validateTimeBalanceData(data: unknown): TimeBalanceData {
  const rawData =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};

  return {
    carryoverFromPreviousYear: validateNumber(
      rawData.carryoverFromPreviousYear,
      0,
      -1000,
      1000,
    ),
    buildUpHours: validateNumber(rawData.buildUpHours, 0, -1000, 1000),
    corrections: validateNumber(rawData.corrections, 0, -1000, 1000),
    approvedLeave: validateNumber(rawData.approvedLeave, 0, 0, 10000),
    tentativeLeave: validateNumber(rawData.tentativeLeave, 0, 0, 10000),
    approvedOvertime: validateNumber(rawData.approvedOvertime, 0, 0, 10000),
    lastAccrualMonth:
      typeof rawData.lastAccrualMonth === "string"
        ? rawData.lastAccrualMonth
        : undefined,
  };
}

/**
 * Calculate total balance from validated time balance data
 */
function calculateBalance(data: TimeBalanceData): number {
  return (
    data.carryoverFromPreviousYear +
    data.buildUpHours +
    data.corrections -
    data.approvedLeave
  );
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Default accrual configuration
 * In production, this should be configurable per organization
 */
const DEFAULT_ACCRUAL_CONFIG: AccrualConfig = {
  monthlyAccrualHours: 2.5, // 30 hours per year
  maxCarryoverHours: 40, // Max hours to carry to next year
  maxBalanceHours: 100, // Maximum balance allowed
};

/**
 * Monthly Accrual Cloud Function
 * Runs on the 1st of each month at 00:05 UTC
 * Accrues time balance for all users with active work schedules
 */
export const monthlyTimeAccrual = onSchedule(
  {
    schedule: "5 0 1 * *", // At 00:05 on day 1 of every month
    timeZone: "Europe/Stockholm",
    region: "europe-west1",
    retryCount: 3,
  },
  async (_event) => {
    // Generate execution ID for tracing
    const executionId = crypto.randomUUID();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    const currentYearMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;

    logger.info(
      {
        executionId,
        timestamp: now.toISOString(),
        yearMonth: currentYearMonth,
      },
      "Starting monthly time accrual process",
    );

    // Check if it's January - handle year-end carryover
    const isNewYear = currentMonth === 0;

    try {
      // Get all organizations
      const organizationsSnapshot = await db.collection("organizations").get();
      logger.info(
        {
          executionId,
          organizationCount: organizationsSnapshot.size,
        },
        "Organizations loaded",
      );

      let totalProcessed = 0;
      let totalErrors = 0;
      let totalSkipped = 0;

      for (const orgDoc of organizationsSnapshot.docs) {
        const organizationId = orgDoc.id;
        const orgData = orgDoc.data();

        // Validate and sanitize accrual config from organization settings
        const accrualConfig = validateAccrualConfig({
          ...DEFAULT_ACCRUAL_CONFIG,
          ...(orgData?.accrualConfig || {}),
        });

        // Get all active members of this organization
        const membersSnapshot = await db
          .collection("organizationMembers")
          .where("organizationId", "==", organizationId)
          .where("status", "==", "active")
          .get();

        for (const memberDoc of membersSnapshot.docs) {
          const memberData = memberDoc.data();
          const userId = memberData?.userId;

          // Validate userId exists
          if (typeof userId !== "string" || !userId) {
            totalErrors++;
            logger.warn(
              {
                executionId,
                memberId: memberDoc.id,
                organizationId,
              },
              "Member document missing userId",
            );
            continue;
          }

          try {
            // Check if user has an active work schedule
            const schedulesSnapshot = await db
              .collection("workSchedules")
              .where("userId", "==", userId)
              .where("organizationId", "==", organizationId)
              .where("effectiveFrom", "<=", Timestamp.now())
              .orderBy("effectiveFrom", "desc")
              .limit(1)
              .get();

            // Skip users without work schedules
            if (schedulesSnapshot.empty) {
              totalSkipped++;
              logger.debug(
                {
                  executionId,
                  organizationId,
                  reason: "no_schedule",
                },
                "Skipping user - no active work schedule",
              );
              continue;
            }

            const schedule = schedulesSnapshot.docs[0].data();

            // Skip if schedule has effectiveUntil and it's in the past
            if (
              schedule.effectiveUntil &&
              schedule.effectiveUntil.toDate() < now
            ) {
              totalSkipped++;
              logger.debug(
                {
                  executionId,
                  organizationId,
                  reason: "schedule_expired",
                },
                "Skipping user - work schedule has expired",
              );
              continue;
            }

            // Use validated schedule hours calculation
            const weeklyHours = validateScheduleHours(schedule);
            const fullTimeWeeklyHours = 40;
            const accrualMultiplier = Math.min(
              weeklyHours / fullTimeWeeklyHours,
              1,
            );
            const monthlyAccrual =
              accrualConfig.monthlyAccrualHours * accrualMultiplier;

            // Handle year-end carryover
            if (isNewYear) {
              await handleYearEndCarryover(
                userId,
                organizationId,
                currentYear - 1,
                currentYear,
                accrualConfig,
                executionId,
              );
            }

            // Update or create time balance for current year with idempotency check
            const wasProcessed = await updateTimeBalance(
              userId,
              organizationId,
              currentYear,
              currentYearMonth,
              monthlyAccrual,
              accrualConfig,
              executionId,
            );

            if (wasProcessed) {
              totalProcessed++;
              logger.info(
                {
                  executionId,
                  organizationId,
                  accrual: monthlyAccrual,
                  weeklyHours,
                },
                "Accrual completed for user",
              );
            } else {
              totalSkipped++;
              logger.info(
                {
                  executionId,
                  organizationId,
                  yearMonth: currentYearMonth,
                },
                "Skipping user - already processed this month",
              );
            }
          } catch (error) {
            totalErrors++;
            logger.error(
              {
                executionId,
                organizationId,
                error: formatErrorMessage(error),
              },
              "Error processing user",
            );
          }
        }
      }

      logger.info(
        {
          executionId,
          totalProcessed,
          totalErrors,
          totalSkipped,
          duration: Date.now() - now.getTime(),
        },
        "Monthly accrual complete",
      );
    } catch (error) {
      logger.error(
        {
          executionId,
          error: formatErrorMessage(error),
        },
        "Monthly accrual failed",
      );
      throw error; // Trigger retry
    }
  },
);

/**
 * Handle year-end carryover
 * Transfers balance from previous year to new year (up to max)
 */
async function handleYearEndCarryover(
  userId: string,
  organizationId: string,
  previousYear: number,
  newYear: number,
  accrualConfig: AccrualConfig,
  executionId: string,
): Promise<void> {
  const previousBalanceId = `${userId}_${organizationId}_${previousYear}`;
  const newBalanceId = `${userId}_${organizationId}_${newYear}`;

  const previousBalanceDoc = await db
    .collection("timeBalances")
    .doc(previousBalanceId)
    .get();

  if (!previousBalanceDoc.exists) {
    return; // No previous balance to carry over
  }

  // Validate previous balance data
  const validatedData = validateTimeBalanceData(previousBalanceDoc.data());
  const previousBalance = calculateBalance(validatedData);

  // Calculate carryover (capped at max, minimum 0)
  const carryover = Math.min(
    Math.max(previousBalance, 0),
    accrualConfig.maxCarryoverHours,
  );

  const newBalanceRef = db.collection("timeBalances").doc(newBalanceId);
  const newBalanceDoc = await newBalanceRef.get();

  const now = Timestamp.now();

  if (newBalanceDoc.exists) {
    // Update existing balance with carryover
    await newBalanceRef.update({
      carryoverFromPreviousYear: carryover,
      updatedAt: now,
    });
  } else {
    // Create new balance with carryover
    await newBalanceRef.set({
      userId,
      organizationId,
      year: newYear,
      carryoverFromPreviousYear: carryover,
      buildUpHours: 0,
      corrections: 0,
      approvedLeave: 0,
      tentativeLeave: 0,
      approvedOvertime: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  logger.info(
    {
      executionId,
      organizationId,
      previousYear,
      newYear,
      carryover,
      previousBalance,
    },
    "Year-end carryover completed",
  );
}

/**
 * Update time balance with monthly accrual
 * Returns true if accrual was applied, false if already processed this month
 */
async function updateTimeBalance(
  userId: string,
  organizationId: string,
  year: number,
  currentYearMonth: string,
  monthlyAccrual: number,
  accrualConfig: AccrualConfig,
  executionId: string,
): Promise<boolean> {
  const balanceId = `${userId}_${organizationId}_${year}`;
  const balanceRef = db.collection("timeBalances").doc(balanceId);
  const now = Timestamp.now();

  return await db.runTransaction(async (transaction) => {
    const balanceDoc = await transaction.get(balanceRef);

    if (balanceDoc.exists) {
      // Validate existing balance data
      const validatedData = validateTimeBalanceData(balanceDoc.data());

      // Idempotency check: skip if already processed this month
      if (validatedData.lastAccrualMonth === currentYearMonth) {
        return false;
      }

      const currentTotal = calculateBalance(validatedData);

      // Check if adding accrual would exceed max balance
      const newTotal = currentTotal + monthlyAccrual;

      if (newTotal > accrualConfig.maxBalanceHours) {
        // Cap the accrual to not exceed max balance
        const cappedAccrual = Math.max(
          0,
          accrualConfig.maxBalanceHours - currentTotal,
        );
        transaction.update(balanceRef, {
          buildUpHours: validatedData.buildUpHours + cappedAccrual,
          lastAccrualMonth: currentYearMonth,
          updatedAt: now,
        });
        logger.info(
          {
            executionId,
            organizationId,
            cappedAccrual,
            requestedAccrual: monthlyAccrual,
            currentTotal,
            maxBalance: accrualConfig.maxBalanceHours,
          },
          "Accrual capped due to max balance",
        );
      } else {
        transaction.update(balanceRef, {
          buildUpHours: validatedData.buildUpHours + monthlyAccrual,
          lastAccrualMonth: currentYearMonth,
          updatedAt: now,
        });
      }
    } else {
      // Create new balance document
      transaction.set(balanceRef, {
        userId,
        organizationId,
        year,
        carryoverFromPreviousYear: 0,
        buildUpHours: monthlyAccrual,
        corrections: 0,
        approvedLeave: 0,
        tentativeLeave: 0,
        approvedOvertime: 0,
        lastAccrualMonth: currentYearMonth,
        createdAt: now,
        updatedAt: now,
      });
    }

    return true;
  });
}

// Note: Manual trigger function removed - use HTTP callable function for manual accrual triggers
