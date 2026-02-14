/**
 * Facility Reservation Helper Functions
 *
 * Utilities to normalize legacy and new reservation formats
 */

import type { FacilityReservation } from "../types/facilityReservation";

/**
 * Get horse IDs from a reservation (handles both legacy and new format)
 */
export function getHorseIds(reservation: FacilityReservation): string[] {
  if (reservation.horseIds && reservation.horseIds.length > 0) {
    return reservation.horseIds;
  }
  if (reservation.horseId) {
    return [reservation.horseId];
  }
  return [];
}

/**
 * Get horse names from a reservation (handles both legacy and new format)
 */
export function getHorseNames(reservation: FacilityReservation): string[] {
  if (reservation.horseNames && reservation.horseNames.length > 0) {
    return reservation.horseNames;
  }
  if (reservation.horseName) {
    return [reservation.horseName];
  }
  return [];
}

/**
 * Get horse count from a reservation
 */
export function getHorseCount(reservation: FacilityReservation): number {
  return getHorseIds(reservation).length;
}

/**
 * Get combined horse information from a reservation
 */
export function getHorses(
  reservation: FacilityReservation,
): Array<{ id: string; name: string }> {
  const ids = getHorseIds(reservation);
  const names = getHorseNames(reservation);

  return ids.map((id, index) => ({
    id,
    name: names[index] || `Horse ${index + 1}`,
  }));
}

/**
 * Format horse display text for a reservation
 * - Single horse: returns horse name
 * - Multiple horses: returns "N horses"
 */
export function formatHorseDisplay(
  reservation: FacilityReservation,
  t: (key: string, options?: any) => string,
): string {
  const horses = getHorses(reservation);

  if (horses.length === 0) return "";
  if (horses.length === 1 && horses[0]) return horses[0].name;

  return t("facilities:horses", { count: horses.length });
}
