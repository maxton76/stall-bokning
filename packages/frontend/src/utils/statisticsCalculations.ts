import { RoutineInstance, HorseActivityHistoryEntry } from "@equiduty/shared";

export interface Statistics {
  completedRoutines: { total: number; thisWeek: number };
  feedingsGiven: { total: number; thisWeek: number };
  horsesCaredFor: number;
  completionStreak: number;
  favoriteRoutine: { templateName: string; count: number } | null;
  teamContribution: number;
}

/**
 * Calculate all statistics from user's activity data
 */
export function calculateStatistics(
  myRoutines: RoutineInstance[],
  myFeedings: HorseActivityHistoryEntry[],
  teamRoutines: RoutineInstance[],
): Statistics {
  const startOfWeek = getStartOfWeek(new Date());

  // 1. Completed Routines
  const completedRoutines = {
    total: myRoutines.filter((r) => r.status === "completed").length,
    thisWeek: myRoutines.filter(
      (r) =>
        r.status === "completed" &&
        r.completedAt &&
        new Date(r.completedAt.toDate()) >= startOfWeek,
    ).length,
  };

  // 2. Feedings Given
  const feedingsGiven = {
    total: myFeedings.length,
    thisWeek: myFeedings.filter(
      (f) => new Date(f.executedAt.toDate()) >= startOfWeek,
    ).length,
  };

  // 3. Unique Horses Cared For
  const horseIds = new Set<string>();
  myRoutines
    .filter((r) => r.status === "completed")
    .forEach((routine) => {
      Object.values(routine.progress?.stepProgress || {}).forEach((step) => {
        if (step.horseProgress) {
          Object.keys(step.horseProgress).forEach((horseId) =>
            horseIds.add(horseId),
          );
        }
      });
    });
  const horsesCaredFor = horseIds.size;

  // 4. Completion Streak
  const completionStreak = calculateStreak(myRoutines);

  // 5. Favorite Routine
  const favoriteRoutine = calculateFavoriteRoutine(myRoutines);

  // 6. Team Contribution %
  const userCompleted = myRoutines.filter(
    (r) => r.status === "completed",
  ).length;
  const teamCompleted = teamRoutines.filter(
    (r) => r.status === "completed",
  ).length;
  const teamContribution =
    teamCompleted > 0 ? Math.round((userCompleted / teamCompleted) * 100) : 0;

  return {
    completedRoutines,
    feedingsGiven,
    horsesCaredFor,
    completionStreak,
    favoriteRoutine,
    teamContribution,
  };
}

/**
 * Calculate consecutive days streak
 */
function calculateStreak(routines: RoutineInstance[]): number {
  const sorted = routines
    .filter((r) => r.status === "completed" && r.completedAt)
    .sort(
      (a, b) =>
        new Date(b.completedAt!.toDate()).getTime() -
        new Date(a.completedAt!.toDate()).getTime(),
    );

  if (sorted.length === 0) return 0;

  const completedDates = new Set(
    sorted.map((r) => {
      const date = new Date(r.completedAt!.toDate());
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    }),
  );

  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  // Check if streak is active (today or yesterday)
  const today = currentDate.getTime();
  const yesterday = new Date(currentDate);
  yesterday.setDate(yesterday.getDate() - 1);

  if (!completedDates.has(today) && !completedDates.has(yesterday.getTime())) {
    return 0;
  }

  // Count backwards
  let streak = 0;
  while (completedDates.has(currentDate.getTime())) {
    streak++;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
}

/**
 * Find most frequently completed routine
 */
function calculateFavoriteRoutine(
  routines: RoutineInstance[],
): { templateName: string; count: number } | null {
  const completed = routines.filter((r) => r.status === "completed");
  if (completed.length === 0) return null;

  const counts = completed.reduce(
    (acc, routine) => {
      acc[routine.templateName] = (acc[routine.templateName] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const entries = Object.entries(counts).sort(([, a], [, b]) => b - a);
  if (entries.length === 0) return null;

  const firstEntry = entries[0];
  if (!firstEntry) return null;

  const [templateName, count] = firstEntry;
  return { templateName, count };
}

/**
 * Get start of current week (Monday)
 */
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
