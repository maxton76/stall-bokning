//
//  TodayViewModel.swift
//  EquiDuty
//
//  ViewModel for the enhanced TodayView with period selection, view modes, and filtering
//

import Foundation
import os

/// ViewModel for TodayView with comprehensive state management
@MainActor
@Observable
final class TodayViewModel {
    // MARK: - Services

    private let authService = AuthService.shared
    private let routineService = RoutineService.shared
    private let activityService = ActivityService.shared
    private let calendar = Calendar.current

    // MARK: - Navigation State

    var selectedDate: Date = Date()
    var periodType: TodayPeriodType = .day

    // MARK: - View Mode State

    var viewMode: TodayViewMode = .all

    // MARK: - Filter State

    var filters = TodayFilters()
    var showFilterSheet = false

    // MARK: - Data State

    private(set) var routines: [RoutineInstance] = []
    private(set) var activities: [ActivityInstance] = []
    private(set) var isLoading = false
    private(set) var errorMessage: String?

    // MARK: - Computed Properties

    /// Current date range based on selected date and period type
    var dateRange: (start: Date, end: Date) {
        selectedDate.dateRange(for: periodType, calendar: calendar)
    }

    /// Selected stable from auth service
    var selectedStable: Stable? {
        authService.selectedStable
    }

    /// Current user ID — uses Firebase Auth UID directly to match Firestore data
    var currentUserId: String? {
        authService.firebaseUid
    }

    /// Current user name
    var currentUserName: String? {
        authService.currentUser?.fullName
    }

    // MARK: - Filtered Data

    /// Apply filters to routines
    var filteredRoutines: [RoutineInstance] {
        var result = routines

        // Apply "For Me" filter — show only routines that are mine
        if filters.forMe, let userId = currentUserId {
            #if DEBUG
            for r in result {
                print("🔍 ForMe: uid='\(userId)' assignedTo='\(r.assignedTo ?? "nil")' startedBy='\(r.startedBy ?? "nil")' status=\(r.status.rawValue) name=\(r.templateName)")
            }
            #endif
            result = result.filter {
                $0.assignedTo == userId || $0.startedBy == userId
            }
        }

        // Apply "Show Finished" filter
        if !filters.showFinished {
            result = result.filter {
                $0.status != .completed && $0.status != .cancelled
            }
        }

        return result
    }

    /// Apply filters to activities
    var filteredActivities: [ActivityInstance] {
        var result = activities

        // Apply "For Me" filter
        if filters.forMe, let userId = currentUserId {
            result = result.filter { $0.assignedTo == userId }
        }

        // Apply "Show Finished" filter
        if !filters.showFinished {
            result = result.filter {
                $0.status != .completed && $0.status != .cancelled
            }
        }

        return result
    }

    // MARK: - Grouped Data

    /// Routines grouped by status
    var routineGroups: RoutineGroups {
        RoutineGroups(from: filteredRoutines)
    }

    /// Temporal sections for activities (day view only)
    var temporalSections: TemporalSections {
        guard periodType == .day else {
            // For week/month view, put everything in "today" section
            return TemporalSections(from: filteredActivities, referenceDate: selectedDate)
        }
        return TemporalSections(from: filteredActivities, referenceDate: selectedDate)
    }

    /// Grouped activities based on current filter setting
    var groupedActivities: GroupedActivities {
        GroupedActivities(from: filteredActivities, groupBy: filters.groupBy)
    }

    // MARK: - Counts

    /// Total routine count
    var routineCount: Int {
        filteredRoutines.count
    }

    /// Total activity count
    var activityCount: Int {
        filteredActivities.count
    }

    /// Total count for current view mode
    var totalCount: Int {
        switch viewMode {
        case .all:
            return routineCount + activityCount
        case .activities:
            return activityCount
        case .routines:
            return routineCount
        }
    }

    /// Check if content is empty for current view mode (checks filtered data)
    var isEmpty: Bool {
        switch viewMode {
        case .all:
            return filteredRoutines.isEmpty && filteredActivities.isEmpty
        case .activities:
            return filteredActivities.isEmpty
        case .routines:
            return filteredRoutines.isEmpty
        }
    }

    /// Check if filtered content is empty
    var isFilteredEmpty: Bool {
        switch viewMode {
        case .all:
            return filteredRoutines.isEmpty && filteredActivities.isEmpty
        case .activities:
            return filteredActivities.isEmpty
        case .routines:
            return filteredRoutines.isEmpty
        }
    }

    // MARK: - Navigation Display

    /// Display label for current period
    var periodDisplayLabel: String {
        selectedDate.periodDisplayLabel(for: periodType, calendar: calendar)
    }

    /// Secondary display label (date details)
    var periodSecondaryLabel: String? {
        selectedDate.periodSecondaryLabel(for: periodType, calendar: calendar)
    }

    /// Check if currently viewing today/this week/this month
    var isCurrentPeriod: Bool {
        selectedDate.isInCurrentPeriod(for: periodType, calendar: calendar)
    }

    // MARK: - Navigation Actions

    func navigateNext() {
        selectedDate = selectedDate.nextPeriod(for: periodType, calendar: calendar)
        loadData()
    }

    func navigatePrevious() {
        selectedDate = selectedDate.previousPeriod(for: periodType, calendar: calendar)
        loadData()
    }

    func goToToday() {
        selectedDate = Date()
        loadData()
    }

    func setPeriodType(_ type: TodayPeriodType) {
        periodType = type
        loadData()
    }

    func setViewMode(_ mode: TodayViewMode) {
        viewMode = mode
    }

    // MARK: - Filter Actions

    func applyFilters(_ newFilters: TodayFilters) {
        filters = newFilters
        // Filters are applied via computed properties, no need to reload data
    }

    func clearFilters() {
        filters.clearAll()
    }

    // MARK: - Data Loading

    /// Force reload data even if already loading (used after returning from routine flow)
    func forceLoadData() {
        isLoading = false
        loadData()
    }

    func loadData() {
        guard !isLoading else { return }

        isLoading = true
        errorMessage = nil

        let stableId = authService.selectedStable?.id

        #if DEBUG
        print("📱 TodayViewModel.loadData() - stable: \(authService.selectedStable?.name ?? "nil"), period: \(periodType.rawValue), date: \(selectedDate)")
        #endif

        Task {
            do {
                if let stableId = stableId {
                    let range = dateRange
                    let today = Date()

                    // Routines are ALWAYS fetched for today only, regardless of period selection
                    AppLogger.data.info("📱 TodayVM: loading routines for stable=\(stableId, privacy: .public)")
                    routines = try await routineService.getRoutineInstances(
                        stableId: stableId,
                        date: today
                    )
                    AppLogger.data.info("📱 TodayVM: decoded \(self.routines.count) routines")
                    #if DEBUG
                    for r in routines {
                        print("  📋 Routine: \(r.templateName), status=\(r.status.rawValue), assignedTo=\(r.assignedTo ?? "nil")")
                    }
                    #endif

                    // Activities are fetched for the selected date range
                    AppLogger.data.info("📱 TodayVM: loading activities range=\(range.start) to \(range.end)")
                    activities = try await activityService.getActivitiesForStable(
                        stableId: stableId,
                        startDate: range.start,
                        endDate: range.end,
                        types: nil
                    )
                    AppLogger.data.info("📱 TodayVM: decoded \(self.activities.count) activities")

                    AppLogger.data.info("📱 TodayVM: viewMode=\(self.viewMode.rawValue, privacy: .public) filteredRoutines=\(self.filteredRoutines.count) filteredActivities=\(self.filteredActivities.count) isEmpty=\(self.isEmpty)")
                } else {
                    AppLogger.data.warning("📱 TodayVM: no stable selected, skipping fetch")
                    routines = []
                    activities = []
                }

                isLoading = false
            } catch {
                AppLogger.error.error("📱 TodayVM: loadData FAILED: \(error.localizedDescription, privacy: .public)")
                AppLogger.error.error("📱 TodayVM: error detail: \(String(describing: error), privacy: .public)")
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }

    func refreshData() async {
        isLoading = true
        defer { isLoading = false }

        do {
            if let stableId = authService.selectedStable?.id {
                let range = dateRange
                let today = Date()

                // Routines are ALWAYS fetched for today only
                routines = try await routineService.getRoutineInstances(
                    stableId: stableId,
                    date: today
                )

                // Activities are fetched for the selected date range
                activities = try await activityService.getActivitiesForStable(
                    stableId: stableId,
                    startDate: range.start,
                    endDate: range.end,
                    types: nil
                )
            } else {
                routines = []
                activities = []
            }

            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
