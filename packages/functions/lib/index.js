"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o)
            if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, "__esModule", { value: true });
exports.monthlyTimeAccrual =
  exports.onSchedulePublished =
  exports.cleanupOldNotifications =
  exports.retryFailedNotifications =
  exports.processNotificationQueue =
  exports.scanForReminders =
  exports.generateActivityInstances =
    void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_functions_1 = require("firebase-functions");
const crypto = __importStar(require("crypto"));
const firebase_js_1 = require("./lib/firebase.js");
const validation_js_1 = require("./lib/validation.js");
const errors_js_1 = require("./lib/errors.js");
// Re-export scheduled functions
var generateInstances_js_1 = require("./scheduled/generateInstances.js");
Object.defineProperty(exports, "generateActivityInstances", {
  enumerable: true,
  get: function () {
    return generateInstances_js_1.generateActivityInstances;
  },
});
var reminderScanner_js_1 = require("./scheduled/reminderScanner.js");
Object.defineProperty(exports, "scanForReminders", {
  enumerable: true,
  get: function () {
    return reminderScanner_js_1.scanForReminders;
  },
});
// Re-export notification functions
var index_js_1 = require("./notifications/index.js");
Object.defineProperty(exports, "processNotificationQueue", {
  enumerable: true,
  get: function () {
    return index_js_1.processNotificationQueue;
  },
});
Object.defineProperty(exports, "retryFailedNotifications", {
  enumerable: true,
  get: function () {
    return index_js_1.retryFailedNotifications;
  },
});
Object.defineProperty(exports, "cleanupOldNotifications", {
  enumerable: true,
  get: function () {
    return index_js_1.cleanupOldNotifications;
  },
});
// Re-export trigger functions
var onSchedulePublished_js_1 = require("./triggers/onSchedulePublished.js");
Object.defineProperty(exports, "onSchedulePublished", {
  enumerable: true,
  get: function () {
    return onSchedulePublished_js_1.onSchedulePublished;
  },
});
// ============================================================================
// VALIDATION HELPERS
// ============================================================================
/**
 * Validate and sanitize accrual configuration
 * Ensures all values are within reasonable bounds
 */
function validateAccrualConfig(config) {
  const rawConfig = config && typeof config === "object" ? config : {};
  return {
    monthlyAccrualHours: (0, validation_js_1.validateNumber)(
      rawConfig.monthlyAccrualHours,
      2.5,
      0,
      10,
    ),
    maxCarryoverHours: (0, validation_js_1.validateNumber)(
      rawConfig.maxCarryoverHours,
      40,
      0,
      500,
    ),
    maxBalanceHours: (0, validation_js_1.validateNumber)(
      rawConfig.maxBalanceHours,
      100,
      0,
      1000,
    ),
  };
}
/**
 * Safely calculate weekly hours from a schedule with bounds checking
 * Validates each day's data to prevent data corruption attacks
 */
function validateScheduleHours(schedule) {
  if (!schedule || typeof schedule !== "object") {
    return 0;
  }
  const scheduleData = schedule;
  const weeklySchedule = scheduleData.weeklySchedule;
  if (!Array.isArray(weeklySchedule)) {
    return 0;
  }
  return weeklySchedule.reduce((sum, day) => {
    if (typeof day !== "object" || day === null) {
      return sum;
    }
    const d = day;
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
function validateTimeBalanceData(data) {
  const rawData = data && typeof data === "object" ? data : {};
  return {
    carryoverFromPreviousYear: (0, validation_js_1.validateNumber)(
      rawData.carryoverFromPreviousYear,
      0,
      -1000,
      1000,
    ),
    buildUpHours: (0, validation_js_1.validateNumber)(
      rawData.buildUpHours,
      0,
      -1000,
      1000,
    ),
    corrections: (0, validation_js_1.validateNumber)(
      rawData.corrections,
      0,
      -1000,
      1000,
    ),
    approvedLeave: (0, validation_js_1.validateNumber)(
      rawData.approvedLeave,
      0,
      0,
      10000,
    ),
    tentativeLeave: (0, validation_js_1.validateNumber)(
      rawData.tentativeLeave,
      0,
      0,
      10000,
    ),
    approvedOvertime: (0, validation_js_1.validateNumber)(
      rawData.approvedOvertime,
      0,
      0,
      10000,
    ),
    lastAccrualMonth:
      typeof rawData.lastAccrualMonth === "string"
        ? rawData.lastAccrualMonth
        : undefined,
  };
}
/**
 * Calculate total balance from validated time balance data
 */
function calculateBalance(data) {
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
const DEFAULT_ACCRUAL_CONFIG = {
  monthlyAccrualHours: 2.5, // 30 hours per year
  maxCarryoverHours: 40, // Max hours to carry to next year
  maxBalanceHours: 100, // Maximum balance allowed
};
/**
 * Monthly Accrual Cloud Function
 * Runs on the 1st of each month at 00:05 UTC
 * Accrues time balance for all users with active work schedules
 */
exports.monthlyTimeAccrual = (0, scheduler_1.onSchedule)(
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
    firebase_functions_1.logger.info(
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
      const organizationsSnapshot = await firebase_js_1.db
        .collection("organizations")
        .get();
      firebase_functions_1.logger.info(
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
        const membersSnapshot = await firebase_js_1.db
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
            firebase_functions_1.logger.warn(
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
            const schedulesSnapshot = await firebase_js_1.db
              .collection("workSchedules")
              .where("userId", "==", userId)
              .where("organizationId", "==", organizationId)
              .where("effectiveFrom", "<=", firebase_js_1.Timestamp.now())
              .orderBy("effectiveFrom", "desc")
              .limit(1)
              .get();
            // Skip users without work schedules
            if (schedulesSnapshot.empty) {
              totalSkipped++;
              firebase_functions_1.logger.debug(
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
              firebase_functions_1.logger.debug(
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
              firebase_functions_1.logger.info(
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
              firebase_functions_1.logger.info(
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
            firebase_functions_1.logger.error(
              {
                executionId,
                organizationId,
                error: (0, errors_js_1.formatErrorMessage)(error),
              },
              "Error processing user",
            );
          }
        }
      }
      firebase_functions_1.logger.info(
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
      firebase_functions_1.logger.error(
        {
          executionId,
          error: (0, errors_js_1.formatErrorMessage)(error),
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
  userId,
  organizationId,
  previousYear,
  newYear,
  accrualConfig,
  executionId,
) {
  const previousBalanceId = `${userId}_${organizationId}_${previousYear}`;
  const newBalanceId = `${userId}_${organizationId}_${newYear}`;
  const previousBalanceDoc = await firebase_js_1.db
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
  const newBalanceRef = firebase_js_1.db
    .collection("timeBalances")
    .doc(newBalanceId);
  const newBalanceDoc = await newBalanceRef.get();
  const now = firebase_js_1.Timestamp.now();
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
  firebase_functions_1.logger.info(
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
  userId,
  organizationId,
  year,
  currentYearMonth,
  monthlyAccrual,
  accrualConfig,
  executionId,
) {
  const balanceId = `${userId}_${organizationId}_${year}`;
  const balanceRef = firebase_js_1.db.collection("timeBalances").doc(balanceId);
  const now = firebase_js_1.Timestamp.now();
  return await firebase_js_1.db.runTransaction(async (transaction) => {
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
        firebase_functions_1.logger.info(
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
//# sourceMappingURL=index.js.map
