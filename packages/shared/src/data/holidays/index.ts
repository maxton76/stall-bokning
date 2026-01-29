/**
 * Holiday Data Barrel Export
 */

export * from "./schema.js";

// Re-export calendar data for direct access if needed
import seCalendar from "./se.json" with { type: "json" };
export { seCalendar };
