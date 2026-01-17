/**
 * Recurrence Presets for Swedish Stables
 *
 * Based on research of typical Swedish stable operations:
 * - Helpension (full board): Staff handles all care
 * - Självskötare (DIY): Owner rotation system (groups of 4)
 * - Daily schedules: Morning feed (06-07), turnout (07-08), evening feed (17-18)
 * - Health care: Farrier every 4-6 weeks, vaccinations every 6 months
 */
/**
 * Daily care presets (Daglig skötsel)
 */
export const DAILY_CARE_PRESETS = [
  {
    id: "morning-feed",
    labelKey: "recurrence.presets.morningFeed",
    descriptionKey: "recurrence.presets.morningFeedDesc",
    rrule: "RRULE:FREQ=DAILY",
    defaultTime: "07:00",
    category: "feeding",
    defaultDuration: 30,
    defaultWeight: 1,
    icon: "🌅",
    color: "#f97316", // orange
  },
  {
    id: "evening-feed",
    labelKey: "recurrence.presets.eveningFeed",
    descriptionKey: "recurrence.presets.eveningFeedDesc",
    rrule: "RRULE:FREQ=DAILY",
    defaultTime: "17:00",
    category: "feeding",
    defaultDuration: 30,
    defaultWeight: 1,
    icon: "🌆",
    color: "#8b5cf6", // purple
  },
  {
    id: "twice-daily-feed",
    labelKey: "recurrence.presets.twiceDailyFeed",
    descriptionKey: "recurrence.presets.twiceDailyFeedDesc",
    rrule: "RRULE:FREQ=DAILY",
    defaultTime: "07:00",
    category: "feeding",
    defaultDuration: 30,
    defaultWeight: 1,
    icon: "🍽️",
    color: "#22c55e", // green
  },
  {
    id: "morning-turnout",
    labelKey: "recurrence.presets.morningTurnout",
    descriptionKey: "recurrence.presets.morningTurnoutDesc",
    rrule: "RRULE:FREQ=DAILY",
    defaultTime: "08:00",
    category: "turnout",
    defaultDuration: 45,
    defaultWeight: 2,
    icon: "🏞️",
    color: "#84cc16", // lime
  },
  {
    id: "afternoon-bring-in",
    labelKey: "recurrence.presets.afternoonBringIn",
    descriptionKey: "recurrence.presets.afternoonBringInDesc",
    rrule: "RRULE:FREQ=DAILY",
    defaultTime: "16:00",
    category: "bring-in",
    defaultDuration: 45,
    defaultWeight: 2,
    icon: "🐴",
    color: "#06b6d4", // cyan
  },
  {
    id: "daily-mucking",
    labelKey: "recurrence.presets.dailyMucking",
    descriptionKey: "recurrence.presets.dailyMuckingDesc",
    rrule: "RRULE:FREQ=DAILY",
    defaultTime: "09:00",
    category: "mucking",
    defaultDuration: 60,
    defaultWeight: 4,
    icon: "🧹",
    color: "#a855f7", // purple
  },
  {
    id: "evening-hay",
    labelKey: "recurrence.presets.eveningHay",
    descriptionKey: "recurrence.presets.eveningHayDesc",
    rrule: "RRULE:FREQ=DAILY",
    defaultTime: "18:00",
    category: "hay",
    defaultDuration: 30,
    defaultWeight: 1,
    icon: "🌾",
    color: "#eab308", // yellow
  },
  {
    id: "night-check",
    labelKey: "recurrence.presets.nightCheck",
    descriptionKey: "recurrence.presets.nightCheckDesc",
    rrule: "RRULE:FREQ=DAILY",
    defaultTime: "21:00",
    category: "other",
    defaultDuration: 20,
    defaultWeight: 1,
    icon: "🌙",
    color: "#3b82f6", // blue
  },
  {
    id: "water-buckets",
    labelKey: "recurrence.presets.waterBuckets",
    descriptionKey: "recurrence.presets.waterBucketsDesc",
    rrule: "RRULE:FREQ=DAILY",
    defaultTime: "08:30",
    category: "water",
    defaultDuration: 30,
    defaultWeight: 2,
    icon: "💧",
    color: "#0ea5e9", // sky
  },
];
/**
 * Weekly care presets (Veckovis skötsel)
 */
export const WEEKLY_CARE_PRESETS = [
  {
    id: "weekdays-only",
    labelKey: "recurrence.presets.weekdaysOnly",
    descriptionKey: "recurrence.presets.weekdaysOnlyDesc",
    rrule: "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
    defaultTime: "09:00",
    category: "other",
    defaultDuration: 60,
    defaultWeight: 2,
    icon: "📅",
    color: "#64748b", // slate
  },
  {
    id: "weekends-only",
    labelKey: "recurrence.presets.weekendsOnly",
    descriptionKey: "recurrence.presets.weekendsOnlyDesc",
    rrule: "RRULE:FREQ=WEEKLY;BYDAY=SA,SU",
    defaultTime: "09:00",
    category: "other",
    defaultDuration: 60,
    defaultWeight: 2,
    icon: "🗓️",
    color: "#ec4899", // pink
  },
  {
    id: "deep-clean-weekly",
    labelKey: "recurrence.presets.deepCleanWeekly",
    descriptionKey: "recurrence.presets.deepCleanWeeklyDesc",
    rrule: "RRULE:FREQ=WEEKLY;BYDAY=SA",
    defaultTime: "10:00",
    category: "cleaning",
    defaultDuration: 120,
    defaultWeight: 3,
    icon: "🧼",
    color: "#14b8a6", // teal
  },
  {
    id: "paddock-poo-pick",
    labelKey: "recurrence.presets.paddockPooPick",
    descriptionKey: "recurrence.presets.paddockPooPickDesc",
    rrule: "RRULE:FREQ=WEEKLY;INTERVAL=2",
    defaultTime: "10:00",
    category: "cleaning",
    defaultDuration: 90,
    defaultWeight: 3,
    icon: "🌿",
    color: "#84cc16", // lime
  },
];
/**
 * Health care presets (Hälsovård)
 * Based on Swedish equine health care intervals
 */
export const HEALTH_CARE_PRESETS = [
  {
    id: "farrier-shod",
    labelKey: "recurrence.presets.farrierShod",
    descriptionKey: "recurrence.presets.farrierShodDesc",
    rrule: "RRULE:FREQ=WEEKLY;INTERVAL=6",
    defaultTime: "10:00",
    category: "health",
    defaultDuration: 60,
    defaultWeight: 1,
    icon: "🔨",
    color: "#f97316", // orange
  },
  {
    id: "farrier-barefoot",
    labelKey: "recurrence.presets.farrierBarefoot",
    descriptionKey: "recurrence.presets.farrierBarefootDesc",
    rrule: "RRULE:FREQ=WEEKLY;INTERVAL=8",
    defaultTime: "10:00",
    category: "health",
    defaultDuration: 45,
    defaultWeight: 1,
    icon: "🔨",
    color: "#f97316", // orange
  },
  {
    id: "flu-vaccine",
    labelKey: "recurrence.presets.fluVaccine",
    descriptionKey: "recurrence.presets.fluVaccineDesc",
    rrule: "RRULE:FREQ=MONTHLY;INTERVAL=6",
    defaultTime: "09:00",
    category: "health",
    defaultDuration: 30,
    defaultWeight: 1,
    icon: "💉",
    color: "#3b82f6", // blue
  },
  {
    id: "flu-vaccine-competition",
    labelKey: "recurrence.presets.fluVaccineCompetition",
    descriptionKey: "recurrence.presets.fluVaccineCompetitionDesc",
    rrule: "RRULE:FREQ=MONTHLY;INTERVAL=3",
    defaultTime: "09:00",
    category: "health",
    defaultDuration: 30,
    defaultWeight: 1,
    icon: "💉",
    color: "#6366f1", // indigo
  },
  {
    id: "tetanus-vaccine",
    labelKey: "recurrence.presets.tetanusVaccine",
    descriptionKey: "recurrence.presets.tetanusVaccineDesc",
    rrule: "RRULE:FREQ=YEARLY",
    defaultTime: "09:00",
    category: "health",
    defaultDuration: 30,
    defaultWeight: 1,
    icon: "💉",
    color: "#ef4444", // red
  },
  {
    id: "dental-annual",
    labelKey: "recurrence.presets.dentalAnnual",
    descriptionKey: "recurrence.presets.dentalAnnualDesc",
    rrule: "RRULE:FREQ=YEARLY",
    defaultTime: "10:00",
    category: "health",
    defaultDuration: 60,
    defaultWeight: 1,
    icon: "🦷",
    color: "#22c55e", // green
  },
  {
    id: "dental-young-horse",
    labelKey: "recurrence.presets.dentalYoungHorse",
    descriptionKey: "recurrence.presets.dentalYoungHorseDesc",
    rrule: "RRULE:FREQ=MONTHLY;INTERVAL=6",
    defaultTime: "10:00",
    category: "health",
    defaultDuration: 60,
    defaultWeight: 1,
    icon: "🦷",
    color: "#22c55e", // green
  },
  {
    id: "deworming-fec",
    labelKey: "recurrence.presets.dewormingFec",
    descriptionKey: "recurrence.presets.dewormingFecDesc",
    rrule: "RRULE:FREQ=MONTHLY;INTERVAL=3",
    defaultTime: "08:00",
    category: "health",
    defaultDuration: 15,
    defaultWeight: 1,
    icon: "💊",
    color: "#a855f7", // purple
  },
];
/**
 * All presets grouped by category
 */
export const ALL_RECURRENCE_PRESETS = [
  ...DAILY_CARE_PRESETS,
  ...WEEKLY_CARE_PRESETS,
  ...HEALTH_CARE_PRESETS,
];
/**
 * Get preset by ID
 */
export function getPresetById(id) {
  return ALL_RECURRENCE_PRESETS.find((preset) => preset.id === id);
}
/**
 * Get presets by category
 */
export function getPresetsByCategory(category) {
  return ALL_RECURRENCE_PRESETS.filter(
    (preset) => preset.category === category,
  );
}
/**
 * Task weight definitions based on Swedish stable research
 * Higher weight = more effort/less desirable
 */
export const TASK_WEIGHTS = {
  mucking: {
    weight: 4,
    labelKey: "recurrence.weights.mucking",
    descriptionKey: "recurrence.weights.muckingDesc",
  },
  paddockPooPicking: {
    weight: 3,
    labelKey: "recurrence.weights.paddockPooPicking",
    descriptionKey: "recurrence.weights.paddockPooPickingDesc",
  },
  turnoutBringIn: {
    weight: 2,
    labelKey: "recurrence.weights.turnoutBringIn",
    descriptionKey: "recurrence.weights.turnoutBringInDesc",
  },
  waterBuckets: {
    weight: 2,
    labelKey: "recurrence.weights.waterBuckets",
    descriptionKey: "recurrence.weights.waterBucketsDesc",
  },
  feeding: {
    weight: 1,
    labelKey: "recurrence.weights.feeding",
    descriptionKey: "recurrence.weights.feedingDesc",
  },
  hayNets: {
    weight: 1,
    labelKey: "recurrence.weights.hayNets",
    descriptionKey: "recurrence.weights.hayNetsDesc",
  },
  healthCare: {
    weight: 1,
    labelKey: "recurrence.weights.healthCare",
    descriptionKey: "recurrence.weights.healthCareDesc",
  },
};
/**
 * Holiday multiplier for weekend/holiday shifts
 * Applied to task weight for fairness calculations
 */
export const HOLIDAY_MULTIPLIER = 1.5;
/**
 * Default generation window (days ahead to materialize instances)
 */
export const DEFAULT_GENERATE_DAYS_AHEAD = 60;
/**
 * RRULE frequency options for UI dropdown
 */
export const RRULE_FREQUENCIES = [
  { value: "DAILY", labelKey: "recurrence.frequency.daily" },
  { value: "WEEKLY", labelKey: "recurrence.frequency.weekly" },
  { value: "MONTHLY", labelKey: "recurrence.frequency.monthly" },
  { value: "YEARLY", labelKey: "recurrence.frequency.yearly" },
];
/**
 * Days of week for RRULE BYDAY
 */
export const RRULE_DAYS = [
  { value: "MO", labelKey: "common:days.monday" },
  { value: "TU", labelKey: "common:days.tuesday" },
  { value: "WE", labelKey: "common:days.wednesday" },
  { value: "TH", labelKey: "common:days.thursday" },
  { value: "FR", labelKey: "common:days.friday" },
  { value: "SA", labelKey: "common:days.saturday" },
  { value: "SU", labelKey: "common:days.sunday" },
];
/**
 * Category options with i18n keys
 */
export const RECURRING_ACTIVITY_CATEGORIES = [
  { value: "feeding", labelKey: "recurrence.categories.feeding", icon: "🍽️" },
  { value: "mucking", labelKey: "recurrence.categories.mucking", icon: "🧹" },
  { value: "turnout", labelKey: "recurrence.categories.turnout", icon: "🏞️" },
  { value: "bring-in", labelKey: "recurrence.categories.bringIn", icon: "🐴" },
  { value: "health", labelKey: "recurrence.categories.health", icon: "💉" },
  { value: "grooming", labelKey: "recurrence.categories.grooming", icon: "✨" },
  { value: "cleaning", labelKey: "recurrence.categories.cleaning", icon: "🧼" },
  { value: "water", labelKey: "recurrence.categories.water", icon: "💧" },
  { value: "hay", labelKey: "recurrence.categories.hay", icon: "🌾" },
  { value: "other", labelKey: "recurrence.categories.other", icon: "📋" },
];
