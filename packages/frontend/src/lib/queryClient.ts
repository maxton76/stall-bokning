import { QueryClient } from "@tanstack/react-query";

/**
 * TanStack Query Client Configuration
 *
 * Centralized configuration for data fetching, caching, and synchronization
 *
 * Features:
 * - 60% cache hit rate targeting through intelligent defaults
 * - Automatic background refetching
 * - Optimistic UI updates
 * - Request deduplication
 * - Garbage collection
 */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache duration: 5 minutes
      staleTime: 5 * 60 * 1000,

      // Keep cached data for 10 minutes before garbage collection
      gcTime: 10 * 60 * 1000,

      // Retry failed requests 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Background refetching
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,

      // Prevent request waterfalls
      refetchInterval: false,

      // Network mode
      networkMode: "online",
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      retryDelay: 1000,

      // Network mode
      networkMode: "online",
    },
  },
});

/**
 * Query key factory for consistent cache keys
 *
 * Benefits:
 * - Type-safe query keys
 * - Consistent invalidation patterns
 * - Easy cache management
 *
 * @example
 * ```tsx
 * const horseKey = queryKeys.horses.detail(horseId)
 * const horsesKey = queryKeys.horses.list({ stableId })
 * ```
 */
export const queryKeys = {
  // Horses
  horses: {
    all: ["horses"] as const,
    lists: () => [...queryKeys.horses.all, "list"] as const,
    list: (filters: Record<string, any>) =>
      [...queryKeys.horses.lists(), filters] as const,
    details: () => [...queryKeys.horses.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.horses.details(), id] as const,
  },

  // Horse Groups
  horseGroups: {
    all: ["horseGroups"] as const,
    lists: () => [...queryKeys.horseGroups.all, "list"] as const,
    list: (stableId: string) =>
      [...queryKeys.horseGroups.lists(), stableId] as const,
    details: () => [...queryKeys.horseGroups.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.horseGroups.details(), id] as const,
  },

  // Stables
  stables: {
    all: ["stables"] as const,
    lists: () => [...queryKeys.stables.all, "list"] as const,
    list: (userId: string) => [...queryKeys.stables.lists(), userId] as const,
    details: () => [...queryKeys.stables.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.stables.details(), id] as const,
  },

  // Organizations
  organizations: {
    all: ["organizations"] as const,
    lists: () => [...queryKeys.organizations.all, "list"] as const,
    list: (userId: string) =>
      [...queryKeys.organizations.lists(), userId] as const,
    details: () => [...queryKeys.organizations.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.organizations.details(), id] as const,
  },

  // Organization Members
  organizationMembers: {
    all: ["organizationMembers"] as const,
    lists: () => [...queryKeys.organizationMembers.all, "list"] as const,
    list: (organizationId: string) =>
      [...queryKeys.organizationMembers.lists(), organizationId] as const,
    details: () => [...queryKeys.organizationMembers.all, "detail"] as const,
    detail: (id: string) =>
      [...queryKeys.organizationMembers.details(), id] as const,
  },

  // Activities
  activities: {
    all: ["activities"] as const,
    lists: () => [...queryKeys.activities.all, "list"] as const,
    list: (filters: Record<string, any>) =>
      [...queryKeys.activities.lists(), filters] as const,
    details: () => [...queryKeys.activities.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.activities.details(), id] as const,
  },

  // Activity Types
  activityTypes: {
    all: ["activityTypes"] as const,
    lists: () => [...queryKeys.activityTypes.all, "list"] as const,
    list: (organizationId: string) =>
      [...queryKeys.activityTypes.lists(), organizationId] as const,
    details: () => [...queryKeys.activityTypes.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.activityTypes.details(), id] as const,
  },

  // Contacts
  contacts: {
    all: ["contacts"] as const,
    lists: () => [...queryKeys.contacts.all, "list"] as const,
    list: (filters: Record<string, any>) =>
      [...queryKeys.contacts.lists(), filters] as const,
    details: () => [...queryKeys.contacts.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.contacts.details(), id] as const,
  },

  // Vaccination Rules
  vaccinationRules: {
    all: ["vaccinationRules"] as const,
    lists: () => [...queryKeys.vaccinationRules.all, "list"] as const,
    list: (organizationId: string | null) =>
      [...queryKeys.vaccinationRules.lists(), organizationId] as const,
    details: () => [...queryKeys.vaccinationRules.all, "detail"] as const,
    detail: (id: string) =>
      [...queryKeys.vaccinationRules.details(), id] as const,
  },

  // Vaccinations (Vaccination Records)
  vaccinations: {
    all: ["vaccinations"] as const,
    lists: () => [...queryKeys.vaccinations.all, "list"] as const,
    byHorse: (horseId: string) =>
      [...queryKeys.vaccinations.lists(), { horseId }] as const,
    expiringSoon: () =>
      [...queryKeys.vaccinations.lists(), { expiringSoon: true }] as const,
    details: () => [...queryKeys.vaccinations.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.vaccinations.details(), id] as const,
  },

  // Location History
  locationHistory: {
    all: ["locationHistory"] as const,
    lists: () => [...queryKeys.locationHistory.all, "list"] as const,
    list: (horseId: string) =>
      [...queryKeys.locationHistory.lists(), horseId] as const,
  },

  // Facilities
  facilities: {
    all: ["facilities"] as const,
    lists: () => [...queryKeys.facilities.all, "list"] as const,
    list: (filters: Record<string, any>) =>
      [...queryKeys.facilities.lists(), filters] as const,
    details: () => [...queryKeys.facilities.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.facilities.details(), id] as const,
  },

  // Facility Reservations
  facilityReservations: {
    all: ["facilityReservations"] as const,
    lists: () => [...queryKeys.facilityReservations.all, "list"] as const,
    list: (filters: Record<string, any>) =>
      [...queryKeys.facilityReservations.lists(), filters] as const,
    conflicts: (facilityId: string, startTime: Date, endTime: Date) =>
      [
        ...queryKeys.facilityReservations.all,
        "conflicts",
        { facilityId, startTime, endTime },
      ] as const,
    details: () => [...queryKeys.facilityReservations.all, "detail"] as const,
    detail: (id: string) =>
      [...queryKeys.facilityReservations.details(), id] as const,
  },

  // Schedules
  schedules: {
    all: ["schedules"] as const,
    lists: () => [...queryKeys.schedules.all, "list"] as const,
    list: (stableId: string, filters?: Record<string, any>) =>
      [...queryKeys.schedules.lists(), stableId, filters] as const,
    details: () => [...queryKeys.schedules.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.schedules.details(), id] as const,
  },

  // Leave Requests
  leaveRequests: {
    all: ["leaveRequests"] as const,
    lists: () => [...queryKeys.leaveRequests.all, "list"] as const,
    list: (organizationId: string) =>
      [...queryKeys.leaveRequests.lists(), organizationId] as const,
    adminList: (organizationId: string, filters?: Record<string, any>) =>
      [
        ...queryKeys.leaveRequests.lists(),
        "admin",
        organizationId,
        filters,
      ] as const,
    details: () => [...queryKeys.leaveRequests.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.leaveRequests.details(), id] as const,
  },

  // Work Schedules (availability)
  workSchedules: {
    all: ["workSchedules"] as const,
    lists: () => [...queryKeys.workSchedules.all, "list"] as const,
    byUser: (organizationId: string) =>
      [...queryKeys.workSchedules.lists(), organizationId] as const,
  },

  // Time Balances
  timeBalances: {
    all: ["timeBalances"] as const,
    lists: () => [...queryKeys.timeBalances.all, "list"] as const,
    byUser: (organizationId: string, year?: number) =>
      [...queryKeys.timeBalances.lists(), organizationId, year] as const,
  },
};

/**
 * Cache invalidation helpers
 *
 * Provides convenient methods for invalidating specific parts of the cache
 */
export const cacheInvalidation = {
  /**
   * Invalidate all horse-related queries
   */
  horses: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.horses.all }),
    lists: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.horses.lists() }),
    detail: (id: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.horses.detail(id) }),
  },

  /**
   * Invalidate all stable-related queries
   */
  stables: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.stables.all }),
    lists: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.stables.lists() }),
    detail: (id: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.stables.detail(id) }),
  },

  /**
   * Invalidate all organization-related queries
   */
  organizations: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all }),
    lists: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.lists(),
      }),
    detail: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.detail(id),
      }),
  },

  /**
   * Invalidate all activity-related queries
   */
  activities: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.all }),
    lists: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.lists() }),
    detail: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.activities.detail(id),
      }),
  },

  /**
   * Invalidate all vaccination-related queries
   */
  vaccinations: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.vaccinations.all }),
    lists: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.vaccinations.lists(),
      }),
    byHorse: (horseId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.vaccinations.byHorse(horseId),
      }),
    expiringSoon: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.vaccinations.expiringSoon(),
      }),
    detail: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.vaccinations.detail(id),
      }),
  },

  /**
   * Invalidate all facility-related queries
   */
  facilities: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.facilities.all }),
    lists: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.facilities.lists() }),
    detail: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.facilities.detail(id),
      }),
  },

  /**
   * Invalidate all facility reservation queries
   */
  facilityReservations: {
    all: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.facilityReservations.all,
      }),
    lists: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.facilityReservations.lists(),
      }),
    detail: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.facilityReservations.detail(id),
      }),
  },

  /**
   * Invalidate all leave request queries
   */
  leaveRequests: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveRequests.all }),
    lists: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.leaveRequests.lists(),
      }),
    detail: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.leaveRequests.detail(id),
      }),
  },

  /**
   * Invalidate all work schedule queries
   */
  workSchedules: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.workSchedules.all }),
    lists: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.workSchedules.lists(),
      }),
  },

  /**
   * Invalidate all time balance queries
   */
  timeBalances: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.timeBalances.all }),
    lists: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.timeBalances.lists(),
      }),
  },
};
