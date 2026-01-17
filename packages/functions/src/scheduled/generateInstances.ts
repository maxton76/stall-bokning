import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import * as crypto from "crypto";

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();

/**
 * Parse RRULE string to extract recurrence pattern
 * Supports DAILY, WEEKLY, MONTHLY, YEARLY with INTERVAL and BYDAY
 */
interface ParsedRRule {
  freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  byDay?: string[]; // MO, TU, WE, TH, FR, SA, SU
  byMonthDay?: number;
  count?: number;
  until?: Date;
}

function parseRRule(rrule: string): ParsedRRule {
  const result: ParsedRRule = {
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
        result.freq = value as ParsedRRule["freq"];
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

function parseRRuleDate(value: string): Date {
  // RRULE dates are in format: YYYYMMDD or YYYYMMDDTHHMMSSZ
  const year = parseInt(value.substring(0, 4), 10);
  const month = parseInt(value.substring(4, 6), 10) - 1;
  const day = parseInt(value.substring(6, 8), 10);
  return new Date(year, month, day);
}

/**
 * Map RRULE day codes to JavaScript day numbers (0=Sunday)
 */
const dayCodeToNumber: Record<string, number> = {
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
function matchesByDay(date: Date, byDay: string[]): boolean {
  const dayOfWeek = date.getDay();
  return byDay.some((dayCode) => dayCodeToNumber[dayCode] === dayOfWeek);
}

/**
 * Generate dates for a recurring activity within a date range
 */
function generateDates(
  startDate: Date,
  endDate: Date,
  rrule: ParsedRRule,
  patternStartDate: Date,
  patternEndDate?: Date,
): Date[] {
  const dates: Date[] = [];
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
      case "MONTHLY":
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
function isHolidayOrWeekend(date: Date): boolean {
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
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
}

/**
 * Get next user in rotation
 */
function getNextInRotation(
  rotationGroup: string[],
  currentIndex: number,
): { userId: string; nextIndex: number } {
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
export const generateActivityInstances = onSchedule(
  {
    schedule: "0 2 * * *", // At 02:00 every day
    timeZone: "Europe/Stockholm",
    retryCount: 3,
  },
  async (_event) => {
    const executionId = crypto.randomUUID();
    const now = new Date();

    logger.info(
      {
        executionId,
        timestamp: now.toISOString(),
      },
      "Starting activity instance generation",
    );

    try {
      // Get all active recurring activities
      const recurringSnapshot = await db
        .collection("recurringActivities")
        .where("status", "==", "active")
        .get();

      logger.info(
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
          const existingSnapshot = await db
            .collection("activityInstances")
            .where("recurringActivityId", "==", recurringId)
            .where("scheduledDate", ">=", Timestamp.fromDate(startDate))
            .where("scheduledDate", "<=", Timestamp.fromDate(endDate))
            .get();

          const existingDates = new Set(
            existingSnapshot.docs.map((doc) => {
              const data = doc.data();
              return data.scheduledDate.toDate().toISOString().split("T")[0];
            }),
          );

          // Get exceptions
          const exceptionsSnapshot = await db
            .collection("recurringActivityExceptions")
            .where("recurringActivityId", "==", recurringId)
            .where("exceptionDate", ">=", Timestamp.fromDate(startDate))
            .where("exceptionDate", "<=", Timestamp.fromDate(endDate))
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
          let horseChecklistData:
            | Array<{ id: string; name: string }>
            | undefined;

          if (recurring.appliesToAllHorses) {
            const horsesSnapshot = await db
              .collection("horses")
              .where("currentStableId", "==", recurring.stableId)
              .where("status", "==", "active")
              .get();

            horseChecklistData = horsesSnapshot.docs.map((horseDoc) => ({
              id: horseDoc.id,
              name: horseDoc.data().name,
            }));
          } else if (recurring.horseGroupId) {
            const horsesSnapshot = await db
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
          const batch = db.batch();
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
            let assignedTo: string | undefined;
            let assignedToName: string | undefined;

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
            let checklist: any[] | undefined;
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
              scheduledDate: Timestamp.fromDate(date),
              scheduledTime: exception?.modifiedTime || recurring.timeOfDay,
              scheduledEndTime: calculateEndTime(
                exception?.modifiedTime || recurring.timeOfDay,
                recurring.duration,
              ),
              duration: recurring.duration,
              assignedTo,
              assignedToName,
              assignedAt: assignedTo ? Timestamp.now() : null,
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
              createdAt: Timestamp.now(),
              createdBy: "system",
              updatedAt: Timestamp.now(),
              updatedBy: "system",
            };

            const instanceRef = db.collection("activityInstances").doc();
            batch.set(instanceRef, instanceData);
            batchCount++;
            totalGenerated++;

            // Commit batch every 400 documents (Firestore limit is 500)
            if (batchCount >= 400) {
              try {
                await batch.commit();
                logger.debug(
                  { executionId, recurringId, committed: batchCount },
                  "Committed batch of activity instances",
                );
              } catch (batchError) {
                logger.error(
                  {
                    executionId,
                    recurringId,
                    batchCount,
                    error:
                      batchError instanceof Error
                        ? batchError.message
                        : String(batchError),
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
              logger.debug(
                { executionId, recurringId, committed: batchCount },
                "Committed final batch of activity instances",
              );
            } catch (batchError) {
              logger.error(
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
              lastGeneratedDate: Timestamp.now(),
            });
          } else {
            await recurringDoc.ref.update({
              lastGeneratedDate: Timestamp.now(),
            });
          }
        } catch (error) {
          totalErrors++;
          logger.error(
            {
              executionId,
              recurringId: recurringDoc.id,
              error: error instanceof Error ? error.message : String(error),
            },
            "Error processing recurring activity",
          );
        }
      }

      logger.info(
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
      logger.error(
        {
          executionId,
          error: error instanceof Error ? error.message : String(error),
        },
        "Activity instance generation failed",
      );
      throw error;
    }
  },
);
