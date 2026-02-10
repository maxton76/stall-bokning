/**
 * useOrganizationHolidays Hook
 *
 * Combines organization data fetch + useHolidays in one call.
 * Reuses the same cached org query key as SubscriptionContext.
 */

import { useOrganization } from "@/contexts/OrganizationContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useHolidays, useCalendarHolidays } from "@/hooks/useHolidays";
import { queryKeys } from "@/lib/queryClient";
import { getOrganization } from "@/services/organizationService";
import type { Organization } from "@equiduty/shared/types/organization";
import type { Holiday, HolidayCalendarSettings } from "@equiduty/shared";

interface UseOrganizationHolidaysOptions {
  startDate: Date;
  endDate: Date;
}

interface UseOrganizationHolidaysResult {
  holidays: Holiday[];
  showHolidays: boolean;
  isHoliday: (date: Date) => boolean;
  getHoliday: (date: Date) => Holiday | null;
  settings: Partial<HolidayCalendarSettings> | undefined;
  isLoading: boolean;
}

/**
 * Hook for accessing organization-aware holiday data.
 * Uses the same cached query key as SubscriptionContext for org data.
 */
export function useOrganizationHolidays({
  startDate,
  endDate,
}: UseOrganizationHolidaysOptions): UseOrganizationHolidaysResult {
  const { currentOrganizationId } = useOrganization();

  const { data: organization, isLoading: orgLoading } =
    useApiQuery<Organization | null>(
      queryKeys.organizations.detail(currentOrganizationId || ""),
      () => getOrganization(currentOrganizationId!),
      {
        enabled: !!currentOrganizationId,
        staleTime: 5 * 60 * 1000,
      },
    );

  const settings = organization?.settings?.holidayCalendar;

  const { holidays, showHolidays, isHoliday, getHoliday } = useHolidays({
    startDate,
    endDate,
    settings,
  });

  return {
    holidays,
    showHolidays,
    isHoliday,
    getHoliday,
    settings,
    isLoading: orgLoading,
  };
}

/**
 * Convenience hook for month calendar views with buffer days.
 */
export function useOrganizationCalendarHolidays(
  month: Date,
): UseOrganizationHolidaysResult {
  const { currentOrganizationId } = useOrganization();

  const { data: organization, isLoading: orgLoading } =
    useApiQuery<Organization | null>(
      queryKeys.organizations.detail(currentOrganizationId || ""),
      () => getOrganization(currentOrganizationId!),
      {
        enabled: !!currentOrganizationId,
        staleTime: 5 * 60 * 1000,
      },
    );

  const settings = organization?.settings?.holidayCalendar;

  const { holidays, showHolidays, isHoliday, getHoliday } = useCalendarHolidays(
    month,
    settings,
  );

  return {
    holidays,
    showHolidays,
    isHoliday,
    getHoliday,
    settings,
    isLoading: orgLoading,
  };
}
