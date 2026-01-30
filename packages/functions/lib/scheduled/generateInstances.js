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
exports.generateActivityInstances = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_functions_1 = require("firebase-functions");
const crypto = __importStar(require("crypto"));
const firebase_js_1 = require("../lib/firebase.js");
const shared_1 = require("@equiduty/shared");
function parseRRule(rrule) {
  const result = {
    freq: "DAILY",
    interval: 1,
  };
  // Remove "RRULE:" prefix if present
  const rule = rrule.replace("RRULE:", "");
  const parts = rule.split(";");
  for (const part of parts) {
    const [key, value] = part.split("=");
    switch (key) {
      case "FREQ":
        result.freq = value;
        break;
      case "INTERVAL":
        result.interval = parseInt(value, 10);
        break;
      case "BYDAY":
        result.byDay = value.split(",");
        break;
      case "BYMONTHDAY":
        result.byMonthDay = parseInt(value, 10);
        break;
      case "COUNT":
        result.count = parseInt(value, 10);
        break;
      case "UNTIL":
        result.until = parseRRuleDate(value);
        break;
    }
  }
  return result;
}
function parseRRuleDate(value) {
  // RRULE dates are in format: YYYYMMDD or YYYYMMDDTHHMMSSZ
  const year = parseInt(value.substring(0, 4), 10);
  const month = parseInt(value.substring(4, 6), 10) - 1;
  const day = parseInt(value.substring(6, 8), 10);
  return new Date(year, month, day);
}
/**
 * Map RRULE day codes to JavaScript day numbers (0=Sunday)
 */
const dayCodeToNumber = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};
/**
 * Check if a date matches the BYDAY constraint
 */
function matchesByDay(date, byDay) {
  const dayOfWeek = date.getDay();
  return byDay.some((dayCode) => dayCodeToNumber[dayCode] === dayOfWeek);
}
/**
 * Generate dates for a recurring activity within a date range
 */
function generateDates(
  startDate,
  endDate,
  rrule,
  patternStartDate,
  patternEndDate,
) {
  const dates = [];
  let currentDate = new Date(
    Math.max(startDate.getTime(), patternStartDate.getTime()),
  );
  // Align to pattern start based on frequency
  if (rrule.freq === "WEEKLY" && rrule.byDay) {
    // For weekly with specific days, start from the start date
    currentDate = new Date(startDate);
  }
  const effectiveEndDate = patternEndDate
    ? new Date(Math.min(endDate.getTime(), patternEndDate.getTime()))
    : endDate;
  let count = 0;
  const maxIterations = 1000; // Safety limit
  let iterations = 0;
  while (currentDate <= effectiveEndDate && iterations < maxIterations) {
    iterations++;
    // Check if this date should be included
    let includeDate = true;
    if (rrule.byDay && rrule.byDay.length > 0) {
      includeDate = matchesByDay(currentDate, rrule.byDay);
    }
    if (rrule.byMonthDay && currentDate.getDate() !== rrule.byMonthDay) {
      includeDate = false;
    }
    if (
      includeDate &&
      currentDate >= startDate &&
      currentDate >= patternStartDate
    ) {
      dates.push(new Date(currentDate));
      count++;
      if (rrule.count && count >= rrule.count) {
        break;
      }
    }
    // Move to next occurrence based on frequency
    switch (rrule.freq) {
      case "DAILY":
        currentDate.setDate(currentDate.getDate() + rrule.interval);
        break;
      case "WEEKLY":
        if (rrule.byDay && rrule.byDay.length > 0) {
          // Move to next day, interval only applies after all days in a week
          currentDate.setDate(currentDate.getDate() + 1);
        } else {
          currentDate.setDate(currentDate.getDate() + 7 * rrule.interval);
        }
        break;
      case "MONTHLY": {
        // Fix monthly day overflow bug:
        // January 31 + 1 month should go to February 28/29, not March 3
        const originalDay = currentDate.getDate();
        currentDate.setDate(1); // Set to 1st to avoid overflow
        currentDate.setMonth(currentDate.getMonth() + rrule.interval);
        // Get the last day of the target month
        const lastDayOfMonth = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0,
        ).getDate();
        // Use the original day or the last day of the month, whichever is smaller
        currentDate.setDate(Math.min(originalDay, lastDayOfMonth));
        break;
      }
      case "YEARLY":
        currentDate.setFullYear(currentDate.getFullYear() + rrule.interval);
        break;
    }
  }
  return dates;
}
/**
 * Check if a date is a weekend or Swedish holiday
 */
function isHolidayOrWeekend(date) {
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true;
  }
  // Swedish holidays (simplified - major ones)
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const holidays = [
    { month: 1, day: 1 }, // Nyårsdagen
    { month: 1, day: 6 }, // Trettondedag jul
    { month: 5, day: 1 }, // Första maj
    { month: 6, day: 6 }, // Nationaldagen
    { month: 12, day: 24 }, // Julafton
    { month: 12, day: 25 }, // Juldagen
    { month: 12, day: 26 }, // Annandag jul
    { month: 12, day: 31 }, // Nyårsafton
  ];
  return holidays.some((h) => h.month === month && h.day === day);
}
/**
 * Calculate end time from start time and duration
 */
function calculateEndTime(startTime, durationMinutes) {
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
}
/**
 * Get next user in rotation
 */
function getNextInRotation(rotationGroup, currentIndex) {
  const nextIndex = (currentIndex + 1) % rotationGroup.length;
  return {
    userId: rotationGroup[currentIndex] || rotationGroup[0],
    nextIndex,
  };
}
/**
 * Generate Activity Instances Cloud Function
 * Runs daily at 02:00 Stockholm time
 * Materializes recurring activities into activity instances
 */
exports.generateActivityInstances = (0, scheduler_1.onSchedule)(
  {
    schedule: "0 2 * * *", // At 02:00 every day
    timeZone: "Europe/Stockholm",
    region: "europe-west1",
    retryCount: 3,
  },
  async (_event) => {
    const executionId = crypto.randomUUID();
    const now = new Date();
    firebase_functions_1.logger.info(
      {
        executionId,
        timestamp: now.toISOString(),
      },
      "Starting activity instance generation",
    );
    try {
      // Get all active recurring activities
      const recurringSnapshot = await firebase_js_1.db
        .collection("recurringActivities")
        .where("status", "==", "active")
        .get();
      firebase_functions_1.logger.info(
        {
          executionId,
          count: recurringSnapshot.size,
        },
        "Found active recurring activities",
      );
      let totalGenerated = 0;
      let totalSkipped = 0;
      let totalErrors = 0;
      for (const recurringDoc of recurringSnapshot.docs) {
        try {
          const recurring = recurringDoc.data();
          const recurringId = recurringDoc.id;
          // Calculate generation window
          const generateDaysAhead = recurring.generateDaysAhead || 60;
          const startDate = new Date(now);
          const endDate = new Date(now);
          endDate.setDate(endDate.getDate() + generateDaysAhead);
          // Parse recurrence rule
          const rrule = parseRRule(recurring.recurrenceRule);
          // Generate dates
          const patternStartDate = recurring.startDate?.toDate() || now;
          const patternEndDate = recurring.endDate?.toDate();
          const dates = generateDates(
            startDate,
            endDate,
            rrule,
            patternStartDate,
            patternEndDate,
          );
          // Get existing instances to avoid duplicates
          const existingSnapshot = await firebase_js_1.db
            .collection("activityInstances")
            .where("recurringActivityId", "==", recurringId)
            .where(
              "scheduledDate",
              ">=",
              firebase_js_1.Timestamp.fromDate(startDate),
            )
            .where(
              "scheduledDate",
              "<=",
              firebase_js_1.Timestamp.fromDate(endDate),
            )
            .get();
          const existingDates = new Set(
            existingSnapshot.docs.map((doc) => {
              const data = doc.data();
              return data.scheduledDate.toDate().toISOString().split("T")[0];
            }),
          );
          // Get exceptions
          const exceptionsSnapshot = await firebase_js_1.db
            .collection("recurringActivityExceptions")
            .where("recurringActivityId", "==", recurringId)
            .where(
              "exceptionDate",
              ">=",
              firebase_js_1.Timestamp.fromDate(startDate),
            )
            .where(
              "exceptionDate",
              "<=",
              firebase_js_1.Timestamp.fromDate(endDate),
            )
            .get();
          const exceptions = new Map(
            exceptionsSnapshot.docs.map((doc) => {
              const data = doc.data();
              const dateKey = data.exceptionDate
                .toDate()
                .toISOString()
                .split("T")[0];
              return [dateKey, data];
            }),
          );
          // Track rotation index
          let currentRotationIndex = recurring.currentRotationIndex || 0;
          // Pre-fetch horses OUTSIDE the date loop to fix N+1 query problem
          // This ensures we only query horses once per recurring activity, not once per date
          let horseChecklistData;
          if (recurring.appliesToAllHorses) {
            const horsesSnapshot = await firebase_js_1.db
              .collection("horses")
              .where("currentStableId", "==", recurring.stableId)
              .where("status", "==", "active")
              .get();
            horseChecklistData = horsesSnapshot.docs.map((horseDoc) => ({
              id: horseDoc.id,
              name: horseDoc.data().name,
            }));
          } else if (recurring.horseGroupId) {
            const horsesSnapshot = await firebase_js_1.db
              .collection("horses")
              .where("horseGroupId", "==", recurring.horseGroupId)
              .where("status", "==", "active")
              .get();
            horseChecklistData = horsesSnapshot.docs.map((horseDoc) => ({
              id: horseDoc.id,
              name: horseDoc.data().name,
            }));
          }
          // Generate instances
          const batch = firebase_js_1.db.batch();
          let batchCount = 0;
          for (const date of dates) {
            const dateKey = date.toISOString().split("T")[0];
            // Skip if already exists
            if (existingDates.has(dateKey)) {
              totalSkipped++;
              continue;
            }
            // Check for exceptions
            const exception = exceptions.get(dateKey);
            if (exception?.exceptionType === "skip") {
              totalSkipped++;
              continue;
            }
            // Determine assignment
            let assignedTo;
            let assignedToName;
            switch (recurring.assignmentMode) {
              case "fixed":
                assignedTo = recurring.assignedTo?.[0];
                assignedToName = recurring.assignedToNames?.[0];
                break;
              case "rotation":
                if (
                  recurring.rotationGroup &&
                  recurring.rotationGroup.length > 0
                ) {
                  const rotation = getNextInRotation(
                    recurring.rotationGroup,
                    currentRotationIndex,
                  );
                  assignedTo = rotation.userId;
                  currentRotationIndex = rotation.nextIndex;
                  const names = recurring.rotationGroupNames || [];
                  assignedToName =
                    names[recurring.rotationGroup.indexOf(assignedTo)];
                }
                break;
              case "fair-distribution":
                // Fair distribution is handled at assignment time, not generation
                break;
            }
            // Apply exception modifications
            if (exception?.exceptionType === "modify") {
              if (exception.modifiedAssignedTo) {
                assignedTo = exception.modifiedAssignedTo;
                assignedToName = exception.modifiedAssignedToName;
              }
            }
            // Calculate if this is a holiday shift
            const isHolidayShift = isHolidayOrWeekend(date);
            const weight =
              recurring.isHolidayMultiplied && isHolidayShift
                ? recurring.weight * 1.5
                : recurring.weight;
            // Build checklist from pre-fetched horse data
            let checklist;
            if (horseChecklistData && horseChecklistData.length > 0) {
              checklist = horseChecklistData.map((horse, index) => ({
                id: crypto.randomUUID(),
                text: horse.name,
                entityType: "horse",
                entityId: horse.id,
                completed: false,
                order: index,
              }));
            }
            const instanceData = {
              recurringActivityId: recurringId,
              stableId: recurring.stableId,
              stableName: recurring.stableName,
              organizationId: recurring.organizationId,
              title: exception?.modifiedTitle || recurring.title,
              description: recurring.description,
              category: recurring.category,
              color: recurring.color,
              icon: recurring.icon,
              scheduledDate: firebase_js_1.Timestamp.fromDate(date),
              scheduledTime: exception?.modifiedTime || recurring.timeOfDay,
              scheduledEndTime: calculateEndTime(
                exception?.modifiedTime || recurring.timeOfDay,
                recurring.duration,
              ),
              duration: recurring.duration,
              assignedTo,
              assignedToName,
              assignedAt: assignedTo ? firebase_js_1.Timestamp.now() : null,
              assignedBy: "system",
              horseId: recurring.horseId,
              horseName: recurring.horseName,
              appliesToAllHorses: recurring.appliesToAllHorses || false,
              horseGroupId: recurring.horseGroupId,
              horseGroupName: recurring.horseGroupName,
              progress: {
                value: 0,
                source: checklist ? "calculated" : "manual",
                displayText: checklist ? `0 of ${checklist.length}` : undefined,
              },
              checklist,
              status: "scheduled",
              isException: !!exception,
              exceptionNote: exception?.reason,
              weight,
              isHolidayShift,
              createdAt: firebase_js_1.Timestamp.now(),
              createdBy: "system",
              updatedAt: firebase_js_1.Timestamp.now(),
              updatedBy: "system",
            };
            const instanceRef = firebase_js_1.db
              .collection("activityInstances")
              .doc();
            batch.set(instanceRef, instanceData);
            batchCount++;
            totalGenerated++;
            // Commit batch every 400 documents (Firestore limit is 500)
            if (batchCount >= 400) {
              try {
                await batch.commit();
                firebase_functions_1.logger.debug(
                  { executionId, recurringId, committed: batchCount },
                  "Committed batch of activity instances",
                );
              } catch (batchError) {
                firebase_functions_1.logger.error(
                  {
                    executionId,
                    recurringId,
                    batchCount,
                    error: (0, shared_1.formatErrorMessage)(batchError),
                  },
                  "Failed to commit batch of activity instances",
                );
                throw batchError; // Re-throw to be caught by outer catch
              }
              batchCount = 0;
            }
          }
          // Commit remaining
          if (batchCount > 0) {
            try {
              await batch.commit();
              firebase_functions_1.logger.debug(
                { executionId, recurringId, committed: batchCount },
                "Committed final batch of activity instances",
              );
            } catch (batchError) {
              firebase_functions_1.logger.error(
                {
                  executionId,
                  recurringId,
                  batchCount,
                  error:
                    batchError instanceof Error
                      ? batchError.message
                      : String(batchError),
                },
                "Failed to commit final batch of activity instances",
              );
              throw batchError;
            }
          }
          // Update rotation index
          if (recurring.assignmentMode === "rotation") {
            await recurringDoc.ref.update({
              currentRotationIndex,
              lastGeneratedDate: firebase_js_1.Timestamp.now(),
            });
          } else {
            await recurringDoc.ref.update({
              lastGeneratedDate: firebase_js_1.Timestamp.now(),
            });
          }
        } catch (error) {
          totalErrors++;
          firebase_functions_1.logger.error(
            {
              executionId,
              recurringId: recurringDoc.id,
              error: (0, shared_1.formatErrorMessage)(error),
            },
            "Error processing recurring activity",
          );
        }
      }
      firebase_functions_1.logger.info(
        {
          executionId,
          totalGenerated,
          totalSkipped,
          totalErrors,
          duration: Date.now() - now.getTime(),
        },
        "Activity instance generation complete",
      );
    } catch (error) {
      firebase_functions_1.logger.error(
        {
          executionId,
          error: (0, shared_1.formatErrorMessage)(error),
        },
        "Activity instance generation failed",
      );
      throw error;
    }
  },
);
//# sourceMappingURL=generateInstances.js.map
