import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import type { HorseColor, HorseUsage } from "@/types/roles";
import type { FeedCategory, QuantityMeasure } from "@stall-bokning/shared";
import type { FacilityType, FacilityStatus } from "@/types/facility";
import type { ReservationStatus } from "@/types/facilityReservation";

/**
 * Hook for getting translated horse colors
 */
export function useTranslatedHorseColors() {
  const { t } = useTranslation("constants");

  return useMemo(
    () =>
      [
        { value: "black" as HorseColor, label: t("horseColors.black") },
        { value: "brown" as HorseColor, label: t("horseColors.brown") },
        { value: "bay_brown" as HorseColor, label: t("horseColors.bay_brown") },
        {
          value: "dark_brown" as HorseColor,
          label: t("horseColors.dark_brown"),
        },
        { value: "chestnut" as HorseColor, label: t("horseColors.chestnut") },
        { value: "grey" as HorseColor, label: t("horseColors.grey") },
        {
          value: "strawberry" as HorseColor,
          label: t("horseColors.strawberry"),
        },
        { value: "piebald" as HorseColor, label: t("horseColors.piebald") },
        { value: "skewbald" as HorseColor, label: t("horseColors.skewbald") },
        { value: "dun" as HorseColor, label: t("horseColors.dun") },
        { value: "cream" as HorseColor, label: t("horseColors.cream") },
        { value: "palomino" as HorseColor, label: t("horseColors.palomino") },
        { value: "appaloosa" as HorseColor, label: t("horseColors.appaloosa") },
      ] as const,
    [t],
  );
}

/**
 * Hook for getting translated horse genders
 */
export function useTranslatedHorseGenders() {
  const { t } = useTranslation("constants");

  return useMemo(
    () =>
      [
        { value: "stallion" as const, label: t("horseGenders.stallion") },
        { value: "mare" as const, label: t("horseGenders.mare") },
        { value: "gelding" as const, label: t("horseGenders.gelding") },
      ] as const,
    [t],
  );
}

/**
 * Hook for getting translated horse usage options
 */
export function useTranslatedHorseUsage() {
  const { t } = useTranslation("constants");

  return useMemo(
    () =>
      [
        {
          value: "care" as HorseUsage,
          label: t("horseUsage.care"),
          icon: "🩷",
          color: "purple",
        },
        {
          value: "sport" as HorseUsage,
          label: t("horseUsage.sport"),
          icon: "🏃",
          color: "green",
        },
        {
          value: "breeding" as HorseUsage,
          label: t("horseUsage.breeding"),
          icon: "🧬",
          color: "amber",
        },
      ] as const,
    [t],
  );
}

/**
 * Hook for getting translated feed categories
 */
export function useTranslatedFeedCategories() {
  const { t } = useTranslation("constants");

  return useMemo(
    () =>
      [
        {
          value: "roughage" as FeedCategory,
          label: t("feedCategories.roughage"),
        },
        {
          value: "concentrate" as FeedCategory,
          label: t("feedCategories.concentrate"),
        },
        {
          value: "supplement" as FeedCategory,
          label: t("feedCategories.supplement"),
        },
        {
          value: "medicine" as FeedCategory,
          label: t("feedCategories.medicine"),
        },
      ] as const,
    [t],
  );
}

/**
 * Hook for getting translated quantity measures
 */
export function useTranslatedQuantityMeasures() {
  const { t } = useTranslation("constants");

  return useMemo(
    () =>
      [
        {
          value: "scoop" as QuantityMeasure,
          label: t("quantityMeasures.scoop"),
        },
        {
          value: "teaspoon" as QuantityMeasure,
          label: t("quantityMeasures.teaspoon"),
        },
        {
          value: "tablespoon" as QuantityMeasure,
          label: t("quantityMeasures.tablespoon"),
        },
        { value: "cup" as QuantityMeasure, label: t("quantityMeasures.cup") },
        { value: "ml" as QuantityMeasure, label: t("quantityMeasures.ml") },
        { value: "l" as QuantityMeasure, label: t("quantityMeasures.l") },
        { value: "g" as QuantityMeasure, label: t("quantityMeasures.g") },
        { value: "kg" as QuantityMeasure, label: t("quantityMeasures.kg") },
        {
          value: "custom" as QuantityMeasure,
          label: t("quantityMeasures.custom"),
        },
      ] as const,
    [t],
  );
}

/**
 * Hook for getting translated facility types
 */
export function useTranslatedFacilityTypes() {
  const { t } = useTranslation("constants");

  return useMemo(
    () =>
      [
        {
          value: "transport" as FacilityType,
          label: t("facilityTypes.transport"),
        },
        {
          value: "water_treadmill" as FacilityType,
          label: t("facilityTypes.water_treadmill"),
        },
        {
          value: "indoor_arena" as FacilityType,
          label: t("facilityTypes.indoor_arena"),
        },
        {
          value: "outdoor_arena" as FacilityType,
          label: t("facilityTypes.outdoor_arena"),
        },
        {
          value: "galloping_track" as FacilityType,
          label: t("facilityTypes.galloping_track"),
        },
        {
          value: "lunging_ring" as FacilityType,
          label: t("facilityTypes.lunging_ring"),
        },
        {
          value: "paddock" as FacilityType,
          label: t("facilityTypes.paddock"),
        },
        {
          value: "solarium" as FacilityType,
          label: t("facilityTypes.solarium"),
        },
        {
          value: "jumping_yard" as FacilityType,
          label: t("facilityTypes.jumping_yard"),
        },
        {
          value: "treadmill" as FacilityType,
          label: t("facilityTypes.treadmill"),
        },
        {
          value: "vibration_plate" as FacilityType,
          label: t("facilityTypes.vibration_plate"),
        },
        {
          value: "pasture" as FacilityType,
          label: t("facilityTypes.pasture"),
        },
        { value: "walker" as FacilityType, label: t("facilityTypes.walker") },
        { value: "other" as FacilityType, label: t("facilityTypes.other") },
      ] as const,
    [t],
  );
}

/**
 * Hook for getting a single translated facility type label
 */
export function useTranslatedFacilityTypeLabel() {
  const { t } = useTranslation("constants");

  return (type: FacilityType): string => {
    return t(`facilityTypes.${type}`, { defaultValue: type });
  };
}

/**
 * Hook for getting translated facility status
 */
export function useTranslatedFacilityStatus() {
  const { t } = useTranslation("constants");

  return useMemo(
    () =>
      [
        {
          value: "active" as FacilityStatus,
          label: t("facilityStatus.active"),
        },
        {
          value: "inactive" as FacilityStatus,
          label: t("facilityStatus.inactive"),
        },
        {
          value: "maintenance" as FacilityStatus,
          label: t("facilityStatus.maintenance"),
        },
      ] as const,
    [t],
  );
}

/**
 * Hook for getting translated reservation status
 */
export function useTranslatedReservationStatus() {
  const { t } = useTranslation("constants");

  return useMemo(
    () =>
      ({
        pending: {
          label: t("reservationStatus.pending"),
          variant: "secondary" as const,
        },
        confirmed: {
          label: t("reservationStatus.confirmed"),
          variant: "default" as const,
        },
        rejected: {
          label: t("reservationStatus.rejected"),
          variant: "destructive" as const,
        },
        cancelled: {
          label: t("reservationStatus.cancelled"),
          variant: "outline" as const,
        },
        completed: {
          label: t("reservationStatus.completed"),
          variant: "outline" as const,
        },
        no_show: {
          label: t("reservationStatus.no_show"),
          variant: "destructive" as const,
        },
      }) as Record<
        ReservationStatus,
        {
          label: string;
          variant: "default" | "secondary" | "destructive" | "outline";
        }
      >,
    [t],
  );
}

/**
 * Hook for getting translated activity categories
 */
export function useTranslatedActivityCategories() {
  const { t } = useTranslation("constants");

  return useMemo(
    () =>
      [
        { value: "sport" as const, label: t("activityCategories.sport") },
        { value: "care" as const, label: t("activityCategories.care") },
        { value: "breeding" as const, label: t("activityCategories.breeding") },
      ] as const,
    [t],
  );
}

/**
 * Hook for getting translated activity roles
 */
export function useTranslatedActivityRoles() {
  const { t } = useTranslation("constants");

  return useMemo(
    () =>
      [
        { value: "owner" as const, label: t("activityRoles.owner") },
        { value: "trainer" as const, label: t("activityRoles.trainer") },
        { value: "rider" as const, label: t("activityRoles.rider") },
        { value: "groom" as const, label: t("activityRoles.groom") },
        {
          value: "veterinarian" as const,
          label: t("activityRoles.veterinarian"),
        },
        { value: "farrier" as const, label: t("activityRoles.farrier") },
        { value: "dentist" as const, label: t("activityRoles.dentist") },
      ] as const,
    [t],
  );
}

/**
 * Hook for getting translated group colors
 */
export function useTranslatedGroupColors() {
  const { t } = useTranslation("constants");

  return useMemo(
    () =>
      [
        { value: "blue" as const, label: t("groupColors.blue") },
        { value: "green" as const, label: t("groupColors.green") },
        { value: "amber" as const, label: t("groupColors.amber") },
        { value: "red" as const, label: t("groupColors.red") },
        { value: "purple" as const, label: t("groupColors.purple") },
        { value: "pink" as const, label: t("groupColors.pink") },
      ] as const,
    [t],
  );
}

/**
 * Hook for getting translated user roles
 */
export function useTranslatedUserRoles() {
  const { t } = useTranslation("constants");

  return useMemo(
    () =>
      [
        {
          value: "administrator" as const,
          label: t("userRoles.administrator"),
          description: t("userRoleDescriptions.administrator"),
        },
        {
          value: "veterinarian" as const,
          label: t("userRoles.veterinarian"),
          description: t("userRoleDescriptions.veterinarian"),
        },
        {
          value: "dentist" as const,
          label: t("userRoles.dentist"),
          description: t("userRoleDescriptions.dentist"),
        },
        {
          value: "farrier" as const,
          label: t("userRoles.farrier"),
          description: t("userRoleDescriptions.farrier"),
        },
        {
          value: "customer" as const,
          label: t("userRoles.customer"),
          description: t("userRoleDescriptions.customer"),
        },
        {
          value: "groom" as const,
          label: t("userRoles.groom"),
          description: t("userRoleDescriptions.groom"),
        },
        {
          value: "saddlemaker" as const,
          label: t("userRoles.saddlemaker"),
          description: t("userRoleDescriptions.saddlemaker"),
        },
        {
          value: "horseowner" as const,
          label: t("userRoles.horseowner"),
          description: t("userRoleDescriptions.horseowner"),
        },
        {
          value: "rider" as const,
          label: t("userRoles.rider"),
          description: t("userRoleDescriptions.rider"),
        },
        {
          value: "inseminator" as const,
          label: t("userRoles.inseminator"),
          description: t("userRoleDescriptions.inseminator"),
        },
      ] as const,
    [t],
  );
}

/**
 * Hook for getting translated weekdays
 */
export function useTranslatedWeekdays() {
  const { t } = useTranslation("common");

  return useMemo(
    () => ({
      full: [
        { value: "monday" as const, label: t("weekdays.monday") },
        { value: "tuesday" as const, label: t("weekdays.tuesday") },
        { value: "wednesday" as const, label: t("weekdays.wednesday") },
        { value: "thursday" as const, label: t("weekdays.thursday") },
        { value: "friday" as const, label: t("weekdays.friday") },
        { value: "saturday" as const, label: t("weekdays.saturday") },
        { value: "sunday" as const, label: t("weekdays.sunday") },
      ],
      short: [
        { value: "mon" as const, label: t("weekdays.mon") },
        { value: "tue" as const, label: t("weekdays.tue") },
        { value: "wed" as const, label: t("weekdays.wed") },
        { value: "thu" as const, label: t("weekdays.thu") },
        { value: "fri" as const, label: t("weekdays.fri") },
        { value: "sat" as const, label: t("weekdays.sat") },
        { value: "sun" as const, label: t("weekdays.sun") },
      ],
    }),
    [t],
  );
}
