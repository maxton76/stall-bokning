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
    byStable: (stableId: string) =>
      [...queryKeys.horses.lists(), { stableId }] as const,
    my: () => [...queryKeys.horses.all, "my"] as const,
    details: () => [...queryKeys.horses.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.horses.details(), id] as const,
    vaccinationRules: (horseId: string) =>
      [...queryKeys.horses.details(), horseId, "vaccinationRules"] as const,
  },

  // Horse Groups
  horseGroups: {
    all: ["horseGroups"] as const,
    lists: () => [...queryKeys.horseGroups.all, "list"] as const,
    list: (stableId: string) =>
      [...queryKeys.horseGroups.lists(), stableId] as const,
    byOrganization: (organizationId: string) =>
      [...queryKeys.horseGroups.lists(), { organizationId }] as const,
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
    trainers: (organizationId: string) =>
      [
        ...queryKeys.organizationMembers.all,
        "trainers",
        organizationId,
      ] as const,
  },

  // Organization Invites
  organizationInvites: {
    all: ["organizationInvites"] as const,
    lists: () => [...queryKeys.organizationInvites.all, "list"] as const,
    list: (organizationId: string) =>
      [...queryKeys.organizationInvites.lists(), organizationId] as const,
  },

  // Activities
  activities: {
    all: ["activities"] as const,
    lists: () => [...queryKeys.activities.all, "list"] as const,
    list: (filters: Record<string, any>) =>
      [...queryKeys.activities.lists(), filters] as const,
    byPeriod: (stableId: string, date: string, periodType: string) =>
      [
        ...queryKeys.activities.lists(),
        { stableId, date, periodType },
      ] as const,
    byPeriodMultiStable: (
      stableIds: string[],
      date: string,
      periodType: string,
    ) =>
      [
        ...queryKeys.activities.lists(),
        "multi",
        { stableIds: stableIds.sort().join(","), date, periodType },
      ] as const,
    care: (stableId: string | string[]) =>
      [
        ...queryKeys.activities.lists(),
        "care",
        Array.isArray(stableId) ? stableId.sort().join(",") : stableId,
      ] as const,
    details: () => [...queryKeys.activities.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.activities.details(), id] as const,
  },

  // Activity Types
  activityTypes: {
    all: ["activityTypes"] as const,
    lists: () => [...queryKeys.activityTypes.all, "list"] as const,
    list: (organizationId: string) =>
      [...queryKeys.activityTypes.lists(), organizationId] as const,
    byStable: (stableId: string, activeOnly?: boolean) =>
      [
        ...queryKeys.activityTypes.lists(),
        "stable",
        { stableId, activeOnly },
      ] as const,
    details: () => [...queryKeys.activityTypes.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.activityTypes.details(), id] as const,
  },

  // Contacts
  contacts: {
    all: ["contacts"] as const,
    lists: () => [...queryKeys.contacts.all, "list"] as const,
    list: (filters: Record<string, any>) =>
      [...queryKeys.contacts.lists(), filters] as const,
    byOrganization: (organizationId: string) =>
      [...queryKeys.contacts.lists(), { organizationId }] as const,
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
    byStable: (stableId: string) =>
      [...queryKeys.facilityReservations.lists(), { stableId }] as const,
    byFacility: (facilityId: string) =>
      [...queryKeys.facilityReservations.lists(), { facilityId }] as const,
    byUser: (userId: string) =>
      [...queryKeys.facilityReservations.lists(), { userId }] as const,
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

  // Routines
  routines: {
    all: ["routines"] as const,
    templates: (organizationId?: string, stableId?: string) =>
      [
        ...queryKeys.routines.all,
        "templates",
        { organizationId, stableId },
      ] as const,
    instances: (stableId?: string, date?: Date) =>
      [
        ...queryKeys.routines.all,
        "instances",
        { stableId, date: date?.toISOString().split("T")[0] },
      ] as const,
    dailyNotes: (stableId?: string, date?: Date) =>
      [
        ...queryKeys.routines.all,
        "dailyNotes",
        { stableId, date: date?.toISOString().split("T")[0] },
      ] as const,
  },

  // Routine Schedules
  routineSchedules: {
    all: ["routineSchedules"] as const,
    lists: () => [...queryKeys.routineSchedules.all, "list"] as const,
    byStable: (stableId: string) =>
      [...queryKeys.routineSchedules.lists(), { stableId }] as const,
    byTemplate: (templateId: string) =>
      [...queryKeys.routineSchedules.lists(), { templateId }] as const,
    details: () => [...queryKeys.routineSchedules.all, "detail"] as const,
    detail: (id: string) =>
      [...queryKeys.routineSchedules.details(), id] as const,
  },

  // Feeding
  feeding: {
    all: ["feeding"] as const,
    today: (stableId: string, date?: string) =>
      [...queryKeys.feeding.all, "today", { stableId, date }] as const,
    schedule: (stableId: string) =>
      [...queryKeys.feeding.all, "schedule", stableId] as const,
  },

  // Feed Types
  feedTypes: {
    all: ["feedTypes"] as const,
    lists: () => [...queryKeys.feedTypes.all, "list"] as const,
    byOrganization: (organizationId: string, includeInactive?: boolean) =>
      [
        ...queryKeys.feedTypes.lists(),
        { organizationId, includeInactive },
      ] as const,
    details: () => [...queryKeys.feedTypes.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.feedTypes.details(), id] as const,
  },

  // Feeding Times
  feedingTimes: {
    all: ["feedingTimes"] as const,
    lists: () => [...queryKeys.feedingTimes.all, "list"] as const,
    byStable: (stableId: string, includeInactive?: boolean) =>
      [
        ...queryKeys.feedingTimes.lists(),
        { stableId, includeInactive },
      ] as const,
    details: () => [...queryKeys.feedingTimes.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.feedingTimes.details(), id] as const,
  },

  // Horse Feedings (feeding assignments per horse)
  horseFeedings: {
    all: ["horseFeedings"] as const,
    lists: () => [...queryKeys.horseFeedings.all, "list"] as const,
    byStable: (stableId: string, date?: string, activeOnly?: boolean) =>
      [
        ...queryKeys.horseFeedings.lists(),
        { stableId, date, activeOnly },
      ] as const,
    details: () => [...queryKeys.horseFeedings.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.horseFeedings.details(), id] as const,
  },

  // Feed Analytics
  feedAnalytics: {
    all: ["feedAnalytics"] as const,
    byStable: (stableId: string, period: string, referenceDate?: string) =>
      [
        ...queryKeys.feedAnalytics.all,
        { stableId, period, referenceDate },
      ] as const,
  },

  // Inventory
  inventory: {
    all: ["inventory"] as const,
    lists: () => [...queryKeys.inventory.all, "list"] as const,
    byStable: (stableId: string, status?: string) =>
      [...queryKeys.inventory.lists(), { stableId, status }] as const,
    summary: (stableId: string) =>
      [...queryKeys.inventory.all, "summary", stableId] as const,
    transactions: (itemId: string) =>
      [...queryKeys.inventory.all, "transactions", itemId] as const,
    details: () => [...queryKeys.inventory.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.inventory.details(), id] as const,
  },

  // Invoices
  invoices: {
    all: ["invoices"] as const,
    lists: () => [...queryKeys.invoices.all, "list"] as const,
    byOrganization: (organizationId: string, filters?: { status?: string }) =>
      [...queryKeys.invoices.lists(), { organizationId, ...filters }] as const,
    overdue: (organizationId: string) =>
      [...queryKeys.invoices.all, "overdue", organizationId] as const,
    my: (organizationId: string, status?: string) =>
      [...queryKeys.invoices.all, "my", { organizationId, status }] as const,
    details: () => [...queryKeys.invoices.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.invoices.details(), id] as const,
  },

  // Payments
  payments: {
    all: ["payments"] as const,
    byOrganization: (organizationId: string) =>
      [...queryKeys.payments.all, "org", organizationId] as const,
    invoicePaymentStatus: (organizationId: string, invoiceId: string) =>
      [
        ...queryKeys.payments.all,
        "invoice-status",
        organizationId,
        invoiceId,
      ] as const,
    stripeSettings: (organizationId: string) =>
      [...queryKeys.payments.all, "stripe-settings", organizationId] as const,
  },

  // Line Items
  lineItems: {
    all: ["lineItems"] as const,
    byOrganization: (organizationId: string) =>
      [...queryKeys.lineItems.all, organizationId] as const,
  },

  // Chargeable Items
  chargeableItems: {
    all: ["chargeableItems"] as const,
    byOrganization: (organizationId: string) =>
      [...queryKeys.chargeableItems.all, organizationId] as const,
  },

  // Billing Groups
  billingGroups: {
    all: ["billingGroups"] as const,
    byOrganization: (organizationId: string) =>
      [...queryKeys.billingGroups.all, organizationId] as const,
  },

  // Package Definitions
  packageDefinitions: {
    all: ["packageDefinitions"] as const,
    byOrganization: (organizationId: string) =>
      [...queryKeys.packageDefinitions.all, organizationId] as const,
  },

  // Member Packages
  memberPackages: {
    all: ["memberPackages"] as const,
    byOrganization: (organizationId: string) =>
      [...queryKeys.memberPackages.all, organizationId] as const,
    my: (organizationId: string, status?: string) =>
      [
        ...queryKeys.memberPackages.all,
        "my",
        { organizationId, status },
      ] as const,
  },

  // Commission Configs
  commissionConfigs: {
    all: ["commissionConfigs"] as const,
    byOrganization: (organizationId: string) =>
      [...queryKeys.commissionConfigs.all, organizationId] as const,
  },

  // Commissions
  commissions: {
    all: ["commissions"] as const,
    byOrganization: (
      organizationId: string,
      filters?: Record<string, string | undefined>,
    ) => [...queryKeys.commissions.all, organizationId, filters] as const,
  },

  // Disputes
  disputes: {
    all: ["disputes"] as const,
    byOrganization: (organizationId: string, filters?: { status?: string }) =>
      [
        ...queryKeys.disputes.all,
        "org",
        organizationId,
        { ...filters },
      ] as const,
    detail: (disputeId: string) =>
      [...queryKeys.disputes.all, "detail", disputeId] as const,
  },

  // Staff Availability
  staffAvailability: {
    all: ["staffAvailability"] as const,
    matrix: (organizationId: string, startDate: string, endDate: string) =>
      [
        ...queryKeys.staffAvailability.all,
        "matrix",
        { organizationId, startDate, endDate },
      ] as const,
  },

  // Invitations
  invitations: {
    all: ["invitations"] as const,
    lists: () => [...queryKeys.invitations.all, "list"] as const,
    pending: (userId: string) =>
      [...queryKeys.invitations.lists(), "pending", userId] as const,
  },

  // Lessons
  lessons: {
    all: ["lessons"] as const,
    lists: () => [...queryKeys.lessons.all, "list"] as const,
    byStable: (stableId: string) =>
      [...queryKeys.lessons.lists(), stableId] as const,
    byOrganization: (
      organizationId: string,
      startDate?: string,
      endDate?: string,
    ) =>
      [
        ...queryKeys.lessons.lists(),
        { organizationId, startDate, endDate },
      ] as const,
    details: () => [...queryKeys.lessons.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.lessons.details(), id] as const,
  },

  // Lesson Types
  lessonTypes: {
    all: ["lessonTypes"] as const,
    lists: () => [...queryKeys.lessonTypes.all, "list"] as const,
    byOrganization: (organizationId: string) =>
      [...queryKeys.lessonTypes.lists(), organizationId] as const,
  },

  // Instructors
  instructors: {
    all: ["instructors"] as const,
    lists: () => [...queryKeys.instructors.all, "list"] as const,
    byOrganization: (organizationId: string) =>
      [...queryKeys.instructors.lists(), organizationId] as const,
  },

  // Lesson Bookings
  lessonBookings: {
    all: ["lessonBookings"] as const,
    myBookings: (organizationId: string) =>
      [...queryKeys.lessonBookings.all, "my", organizationId] as const,
    byLesson: (lessonId: string) =>
      [...queryKeys.lessonBookings.all, "lesson", lessonId] as const,
  },

  // Lesson Settings
  lessonSettings: {
    all: ["lessonSettings"] as const,
    byOrganization: (organizationId: string) =>
      [...queryKeys.lessonSettings.all, organizationId] as const,
  },

  // User Stables
  userStables: {
    all: ["userStables"] as const,
    byUser: (userId: string) => [...queryKeys.userStables.all, userId] as const,
  },

  // Portal
  portal: {
    all: ["portal"] as const,
    dashboard: () => [...queryKeys.portal.all, "dashboard"] as const,
    horses: () => [...queryKeys.portal.all, "horses"] as const,
    horseDetail: (horseId: string) =>
      [...queryKeys.portal.all, "horse", horseId] as const,
    invoices: (status?: string) =>
      [...queryKeys.portal.all, "invoices", { status }] as const,
    invoiceDetail: (invoiceId: string) =>
      [...queryKeys.portal.all, "invoice", invoiceId] as const,
    threads: () => [...queryKeys.portal.all, "threads"] as const,
    threadMessages: (threadId: string) =>
      [...queryKeys.portal.all, "thread", threadId, "messages"] as const,
    profile: () => [...queryKeys.portal.all, "profile"] as const,
  },

  // Admin Portal
  admin: {
    all: ["admin"] as const,
    horses: (search?: string, page?: number) =>
      [...queryKeys.admin.all, "horses", { search, page }] as const,
  },

  // Selection Processes (Turn-based routine selection)
  selectionProcesses: {
    all: ["selectionProcesses"] as const,
    lists: () => [...queryKeys.selectionProcesses.all, "list"] as const,
    list: (params: { stableId?: string; status?: string }) =>
      [...queryKeys.selectionProcesses.lists(), params] as const,
    byStable: (stableId: string) =>
      [...queryKeys.selectionProcesses.lists(), { stableId }] as const,
    details: () => [...queryKeys.selectionProcesses.all, "detail"] as const,
    detail: (id: string) =>
      [...queryKeys.selectionProcesses.details(), id] as const,
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
   * Invalidate all organization member queries
   */
  organizationMembers: {
    all: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizationMembers.all,
      }),
    lists: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizationMembers.lists(),
      }),
    list: (organizationId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizationMembers.list(organizationId),
      }),
  },

  /**
   * Invalidate all organization invite queries
   */
  organizationInvites: {
    all: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizationInvites.all,
      }),
    lists: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizationInvites.lists(),
      }),
    list: (organizationId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizationInvites.list(organizationId),
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
   * Invalidate all vaccination rule queries
   */
  vaccinationRules: {
    all: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.vaccinationRules.all,
      }),
    lists: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.vaccinationRules.lists(),
      }),
    list: (organizationId: string | null) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.vaccinationRules.list(organizationId),
      }),
    detail: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.vaccinationRules.detail(id),
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

  /**
   * Invalidate all routine queries
   */
  routines: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.routines.all }),
    templates: (organizationId?: string, stableId?: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.routines.templates(organizationId, stableId),
      }),
    instances: (stableId?: string, date?: Date) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.routines.instances(stableId, date),
      }),
    dailyNotes: (stableId?: string, date?: Date) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.routines.dailyNotes(stableId, date),
      }),
  },

  /**
   * Invalidate all routine schedule queries
   */
  routineSchedules: {
    all: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.routineSchedules.all,
      }),
    lists: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.routineSchedules.lists(),
      }),
    byStable: (stableId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.routineSchedules.byStable(stableId),
      }),
    byTemplate: (templateId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.routineSchedules.byTemplate(templateId),
      }),
    detail: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.routineSchedules.detail(id),
      }),
  },

  /**
   * Invalidate all feeding queries
   */
  feeding: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.feeding.all }),
    today: (stableId: string, date?: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.feeding.today(stableId, date),
      }),
  },

  /**
   * Invalidate user stables queries
   */
  userStables: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.userStables.all }),
    byUser: (userId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.userStables.byUser(userId),
      }),
  },

  /**
   * Invalidate all activity type queries
   */
  activityTypes: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.activityTypes.all }),
    lists: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.activityTypes.lists(),
      }),
    byStable: (stableId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.activityTypes.byStable(stableId),
      }),
    detail: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.activityTypes.detail(id),
      }),
  },

  /**
   * Invalidate all feed type queries
   */
  feedTypes: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.feedTypes.all }),
    lists: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.feedTypes.lists() }),
    byOrganization: (organizationId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.feedTypes.byOrganization(organizationId),
      }),
    detail: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.feedTypes.detail(id),
      }),
  },

  /**
   * Invalidate all feeding time queries
   */
  feedingTimes: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.feedingTimes.all }),
    lists: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.feedingTimes.lists(),
      }),
    byStable: (stableId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.feedingTimes.byStable(stableId),
      }),
    detail: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.feedingTimes.detail(id),
      }),
  },

  /**
   * Invalidate all horse feeding queries
   */
  horseFeedings: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.horseFeedings.all }),
    lists: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.horseFeedings.lists(),
      }),
    byStable: (stableId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.horseFeedings.byStable(stableId),
      }),
    detail: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.horseFeedings.detail(id),
      }),
  },

  /**
   * Invalidate all feed analytics queries
   */
  feedAnalytics: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.feedAnalytics.all }),
    byStable: (stableId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.feedAnalytics.byStable(stableId, "", ""),
      }),
  },

  /**
   * Invalidate all contact queries
   */
  contacts: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all }),
    lists: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.lists() }),
    byOrganization: (organizationId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.contacts.byOrganization(organizationId),
      }),
    detail: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.contacts.detail(id),
      }),
  },

  /**
   * Invalidate all horse group queries
   */
  horseGroups: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.horseGroups.all }),
    lists: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.horseGroups.lists(),
      }),
    list: (stableId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.horseGroups.list(stableId),
      }),
    byOrganization: (organizationId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.horseGroups.byOrganization(organizationId),
      }),
    detail: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.horseGroups.detail(id),
      }),
  },

  /**
   * Invalidate all inventory queries
   */
  inventory: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
    lists: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() }),
    byStable: (stableId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.byStable(stableId),
      }),
    transactions: (itemId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.transactions(itemId),
      }),
    detail: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.detail(id),
      }),
  },

  /**
   * Invalidate all invoice queries
   */
  invoices: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all }),
    lists: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() }),
    byOrganization: (organizationId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.byOrganization(organizationId),
      }),
    overdue: (organizationId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.overdue(organizationId),
      }),
    my: () =>
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.invoices.all, "my"],
      }),
    detail: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.detail(id),
      }),
  },

  /**
   * Invalidate payment queries
   */
  payments: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all }),
    byOrganization: (organizationId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.payments.byOrganization(organizationId),
      }),
    stripeSettings: (organizationId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.payments.stripeSettings(organizationId),
      }),
  },

  /**
   * Invalidate line item queries
   */
  lineItems: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.lineItems.all }),
    byOrganization: (organizationId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.lineItems.byOrganization(organizationId),
      }),
  },

  /**
   * Invalidate chargeable item queries
   */
  chargeableItems: {
    all: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.chargeableItems.all,
      }),
    byOrganization: (organizationId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.chargeableItems.byOrganization(organizationId),
      }),
  },

  /**
   * Invalidate billing group queries
   */
  billingGroups: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.billingGroups.all }),
    byOrganization: (organizationId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.billingGroups.byOrganization(organizationId),
      }),
  },

  /**
   * Invalidate package definition queries
   */
  packageDefinitions: {
    all: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.packageDefinitions.all,
      }),
    byOrganization: (organizationId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.packageDefinitions.byOrganization(organizationId),
      }),
  },

  /**
   * Invalidate member package queries
   */
  memberPackages: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.memberPackages.all }),
    byOrganization: (organizationId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.memberPackages.byOrganization(organizationId),
      }),
    my: () =>
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.memberPackages.all, "my"],
      }),
  },

  /**
   * Invalidate commission config queries
   */
  commissionConfigs: {
    all: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.commissionConfigs.all,
      }),
    byOrganization: (organizationId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.commissionConfigs.byOrganization(organizationId),
      }),
  },

  /**
   * Invalidate commission queries
   */
  commissions: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.commissions.all }),
    byOrganization: (organizationId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.commissions.byOrganization(organizationId),
      }),
  },

  /**
   * Invalidate dispute queries
   */
  disputes: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.disputes.all }),
    byOrganization: (organizationId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.disputes.byOrganization(organizationId),
      }),
    detail: (disputeId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.disputes.detail(disputeId),
      }),
  },

  /**
   * Invalidate all staff availability queries
   */
  staffAvailability: {
    all: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.staffAvailability.all,
      }),
    matrix: (organizationId: string, startDate: string, endDate: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.staffAvailability.matrix(
          organizationId,
          startDate,
          endDate,
        ),
      }),
  },

  /**
   * Invalidate all invitation queries
   */
  invitations: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.invitations.all }),
    lists: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.invitations.lists(),
      }),
    pending: (userId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.invitations.pending(userId),
      }),
  },

  /**
   * Invalidate all lesson queries
   */
  lessons: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.lessons.all }),
    lists: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.lessons.lists() }),
    byStable: (stableId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.lessons.byStable(stableId),
      }),
    byOrganization: (organizationId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.lessons.byOrganization(organizationId),
      }),
    detail: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.lessons.detail(id),
      }),
  },

  /**
   * Invalidate all lesson type queries
   */
  lessonTypes: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.lessonTypes.all }),
    lists: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.lessonTypes.lists(),
      }),
    byOrganization: (organizationId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.lessonTypes.byOrganization(organizationId),
      }),
  },

  /**
   * Invalidate all instructor queries
   */
  instructors: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.instructors.all }),
    lists: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.instructors.lists(),
      }),
    byOrganization: (organizationId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.instructors.byOrganization(organizationId),
      }),
  },

  /**
   * Invalidate lesson booking queries
   */
  lessonBookings: {
    all: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.lessonBookings.all,
      }),
    myBookings: (organizationId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.lessonBookings.myBookings(organizationId),
      }),
    byLesson: (lessonId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.lessonBookings.byLesson(lessonId),
      }),
  },

  /**
   * Invalidate lesson settings queries
   */
  lessonSettings: {
    all: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.lessonSettings.all,
      }),
  },

  /**
   * Invalidate all portal queries
   */
  portal: {
    all: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.portal.all }),
    dashboard: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.portal.dashboard() }),
    horses: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.portal.horses() }),
    horseDetail: (horseId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.portal.horseDetail(horseId),
      }),
    invoices: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.portal.invoices() }),
    invoiceDetail: (invoiceId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.portal.invoiceDetail(invoiceId),
      }),
    threads: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.portal.threads() }),
    threadMessages: (threadId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.portal.threadMessages(threadId),
      }),
    profile: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.portal.profile() }),
  },

  /**
   * Invalidate all selection process queries
   */
  selectionProcesses: {
    all: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.selectionProcesses.all,
      }),
    lists: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.selectionProcesses.lists(),
      }),
    byStable: (stableId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.selectionProcesses.byStable(stableId),
      }),
    detail: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.selectionProcesses.detail(id),
      }),
  },
};
