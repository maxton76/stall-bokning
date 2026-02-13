//
//  TodayViewModels.swift
//  EquiDuty
//
//  Models for the enhanced TodayView with period selection, view modes, and filtering
//

import Foundation

// MARK: - Period Type

/// Period type for date navigation
enum TodayPeriodType: String, CaseIterable, Identifiable {
    case week
    case month

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .week: return String(localized: "today.period.week")
        case .month: return String(localized: "today.period.month")
        }
    }

    var icon: String {
        switch self {
        case .week: return "calendar.badge.clock"
        case .month: return "calendar"
        }
    }
}

// MARK: - View Mode

/// View mode for content filtering (All/Activities/Routines)
enum TodayViewMode: String, CaseIterable, Identifiable {
    case all
    case activities
    case routines

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .all: return String(localized: "today.viewMode.all")
        case .activities: return String(localized: "today.viewMode.activities")
        case .routines: return String(localized: "today.viewMode.routines")
        }
    }

    var icon: String {
        switch self {
        case .all: return "list.bullet"
        case .activities: return "figure.equestrian.sports"
        case .routines: return "checklist"
        }
    }
}

// MARK: - Filters

/// Group by options for activities
enum TodayGroupByOption: String, CaseIterable, Identifiable {
    case none
    case horse
    case staff
    case type

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .none: return String(localized: "today.filters.groupBy.none")
        case .horse: return String(localized: "today.filters.groupBy.horse")
        case .staff: return String(localized: "today.filters.groupBy.staff")
        case .type: return String(localized: "today.filters.groupBy.type")
        }
    }

    var icon: String {
        switch self {
        case .none: return "list.bullet"
        case .horse: return "pawprint.fill"
        case .staff: return "person.2.fill"
        case .type: return "tag.fill"
        }
    }
}

/// Filter settings for TodayView
struct TodayFilters: Equatable {
    var groupBy: TodayGroupByOption = .none
    var forMe: Bool = false
    var showFinished: Bool = true

    var hasActiveFilters: Bool {
        groupBy != .none || forMe || !showFinished
    }

    var activeFilterCount: Int {
        var count = 0
        if groupBy != .none { count += 1 }
        if forMe { count += 1 }
        if !showFinished { count += 1 }
        return count
    }

    mutating func clearAll() {
        groupBy = .none
        forMe = false
        showFinished = true
    }
}

// MARK: - Routine Grouping

/// Routine groups by status
struct RoutineGroups {
    var active: [RoutineInstance] = []      // started, in_progress
    var scheduled: [RoutineInstance] = []   // scheduled
    var completed: [RoutineInstance] = []   // completed, cancelled

    var isEmpty: Bool {
        active.isEmpty && scheduled.isEmpty && completed.isEmpty
    }

    var totalCount: Int {
        active.count + scheduled.count + completed.count
    }

    /// Initialize from array of routine instances
    init(from routines: [RoutineInstance]) {
        for routine in routines {
            switch routine.status {
            case .started, .inProgress:
                active.append(routine)
            case .scheduled:
                scheduled.append(routine)
            case .completed, .cancelled, .missed:
                completed.append(routine)
            }
        }

        // Sort each group by scheduled time
        active.sort { $0.scheduledStartTime < $1.scheduledStartTime }
        scheduled.sort { $0.scheduledStartTime < $1.scheduledStartTime }
        completed.sort { $0.scheduledStartTime < $1.scheduledStartTime }
    }

    /// Initialize empty
    init() {}
}

// MARK: - Temporal Sections (Day View)

/// Temporal sections for day view activities
struct TemporalSections {
    var overdue: [ActivityInstance] = []    // scheduledDate < today
    var today: [ActivityInstance] = []      // scheduledDate == today
    var upcoming: [ActivityInstance] = []   // scheduledDate > today (for multi-day ranges)

    var isEmpty: Bool {
        overdue.isEmpty && today.isEmpty && upcoming.isEmpty
    }

    var totalCount: Int {
        overdue.count + today.count + upcoming.count
    }

    /// Initialize from activities and reference date
    init(from activities: [ActivityInstance], referenceDate: Date) {
        let calendar = Calendar.current
        let todayStart = calendar.startOfDay(for: referenceDate)

        for activity in activities {
            let activityDate = calendar.startOfDay(for: activity.scheduledDate)

            if activityDate < todayStart {
                overdue.append(activity)
            } else if activityDate == todayStart {
                today.append(activity)
            } else {
                upcoming.append(activity)
            }
        }

        // Sort each section by scheduled time
        let sortByTime: (ActivityInstance, ActivityInstance) -> Bool = { a, b in
            if let timeA = a.scheduledTime, let timeB = b.scheduledTime {
                return timeA < timeB
            }
            return a.scheduledDate < b.scheduledDate
        }

        overdue.sort(by: sortByTime)
        today.sort(by: sortByTime)
        upcoming.sort(by: sortByTime)
    }

    /// Initialize empty
    init() {}
}

// MARK: - Activity Grouping

/// Grouped activities based on group by option
struct GroupedActivities {
    var groups: [(key: String, activities: [ActivityInstance])] = []
    var ungrouped: [ActivityInstance] = []

    var isEmpty: Bool {
        groups.allSatisfy { $0.activities.isEmpty } && ungrouped.isEmpty
    }

    var totalCount: Int {
        groups.reduce(0) { $0 + $1.activities.count } + ungrouped.count
    }

    /// Initialize from activities and group by option
    init(from activities: [ActivityInstance], groupBy: TodayGroupByOption) {
        switch groupBy {
        case .none:
            ungrouped = activities.sorted { a, b in
                if let timeA = a.scheduledTime, let timeB = b.scheduledTime {
                    return timeA < timeB
                }
                return a.scheduledDate < b.scheduledDate
            }

        case .horse:
            var grouped: [String: [ActivityInstance]] = [:]
            for activity in activities {
                let key = activity.horseNames.joined(separator: ", ")
                let groupKey = key.isEmpty ? String(localized: "today.grouping.noHorse") : key
                grouped[groupKey, default: []].append(activity)
            }
            let sortByTime: (ActivityInstance, ActivityInstance) -> Bool = { a, b in
                if let timeA = a.scheduledTime, let timeB = b.scheduledTime {
                    return timeA < timeB
                }
                return a.scheduledDate < b.scheduledDate
            }
            groups = grouped.map { ($0.key, $0.value.sorted(by: sortByTime)) }.sorted { $0.key < $1.key }

        case .staff:
            var grouped: [String: [ActivityInstance]] = [:]
            for activity in activities {
                let key = activity.assignedToName ?? String(localized: "today.grouping.unassigned")
                grouped[key, default: []].append(activity)
            }
            let sortByTime: (ActivityInstance, ActivityInstance) -> Bool = { a, b in
                if let timeA = a.scheduledTime, let timeB = b.scheduledTime {
                    return timeA < timeB
                }
                return a.scheduledDate < b.scheduledDate
            }
            groups = grouped.map { ($0.key, $0.value.sorted(by: sortByTime)) }.sorted { $0.key < $1.key }

        case .type:
            var grouped: [String: [ActivityInstance]] = [:]
            for activity in activities {
                let key = activity.activityTypeName
                grouped[key, default: []].append(activity)
            }
            let sortByTime: (ActivityInstance, ActivityInstance) -> Bool = { a, b in
                if let timeA = a.scheduledTime, let timeB = b.scheduledTime {
                    return timeA < timeB
                }
                return a.scheduledDate < b.scheduledDate
            }
            groups = grouped.map { ($0.key, $0.value.sorted(by: sortByTime)) }.sorted { $0.key < $1.key }
        }
    }

    /// Initialize empty
    init() {}
}
