//
//  Date+TodayExtensions.swift
//  EquiDuty
//
//  Date utilities for TodayView period navigation and display
//

import Foundation

extension Date {
    // MARK: - Date Range Calculation

    /// Get the start and end dates for a given period type
    func dateRange(for periodType: TodayPeriodType, calendar: Calendar = .current) -> (start: Date, end: Date) {
        switch periodType {
        case .day:
            let start = calendar.startOfDay(for: self)
            let end = calendar.date(byAdding: DateComponents(day: 1, second: -1), to: start) ?? start
            return (start, end)

        case .week:
            let startOfWeek = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: self)) ?? self
            // Add 6 days + 23:59:59 to cover full week (Sunday night)
            let endOfWeek = calendar.date(byAdding: DateComponents(day: 7, second: -1), to: startOfWeek) ?? startOfWeek
            return (startOfWeek, endOfWeek)

        case .month:
            let startOfMonth = calendar.date(from: calendar.dateComponents([.year, .month], from: self)) ?? self
            let endOfMonth = calendar.date(byAdding: DateComponents(month: 1, day: -1), to: startOfMonth) ?? startOfMonth
            return (startOfMonth, endOfMonth)
        }
    }

    // MARK: - Navigation

    /// Navigate to the next period
    func nextPeriod(for periodType: TodayPeriodType, calendar: Calendar = .current) -> Date {
        switch periodType {
        case .day:
            return calendar.date(byAdding: .day, value: 1, to: self) ?? self
        case .week:
            return calendar.date(byAdding: .weekOfYear, value: 1, to: self) ?? self
        case .month:
            return calendar.date(byAdding: .month, value: 1, to: self) ?? self
        }
    }

    /// Navigate to the previous period
    func previousPeriod(for periodType: TodayPeriodType, calendar: Calendar = .current) -> Date {
        switch periodType {
        case .day:
            return calendar.date(byAdding: .day, value: -1, to: self) ?? self
        case .week:
            return calendar.date(byAdding: .weekOfYear, value: -1, to: self) ?? self
        case .month:
            return calendar.date(byAdding: .month, value: -1, to: self) ?? self
        }
    }

    // MARK: - Display Labels

    /// Get display label for the current date and period type
    func periodDisplayLabel(for periodType: TodayPeriodType, calendar: Calendar = .current) -> String {
        let today = Date()

        switch periodType {
        case .day:
            if calendar.isDateInToday(self) {
                return String(localized: "today.navigation.today")
            } else if calendar.isDateInYesterday(self) {
                return String(localized: "today.navigation.yesterday")
            } else if calendar.isDateInTomorrow(self) {
                return String(localized: "today.navigation.tomorrow")
            } else {
                return self.formatted(.dateTime.weekday(.wide).day().month(.abbreviated))
            }

        case .week:
            let (start, end) = dateRange(for: .week, calendar: calendar)
            let todayRange = today.dateRange(for: .week, calendar: calendar)

            if start == todayRange.start {
                return String(localized: "today.navigation.thisWeek")
            }

            // Check if it's last week
            let lastWeekStart = today.previousPeriod(for: .week, calendar: calendar)
                .dateRange(for: .week, calendar: calendar).start
            if start == lastWeekStart {
                return String(localized: "today.navigation.lastWeek")
            }

            // Check if it's next week
            let nextWeekStart = today.nextPeriod(for: .week, calendar: calendar)
                .dateRange(for: .week, calendar: calendar).start
            if start == nextWeekStart {
                return String(localized: "today.navigation.nextWeek")
            }

            // Format as date range
            let startFormat = start.formatted(.dateTime.day().month(.abbreviated))
            let endFormat = end.formatted(.dateTime.day().month(.abbreviated))
            return "\(startFormat) - \(endFormat)"

        case .month:
            let components = calendar.dateComponents([.year, .month], from: self)
            let todayComponents = calendar.dateComponents([.year, .month], from: today)

            if components.year == todayComponents.year && components.month == todayComponents.month {
                return String(localized: "today.navigation.thisMonth")
            }

            // Check if it's last month
            if let lastMonth = calendar.date(byAdding: .month, value: -1, to: today) {
                let lastMonthComponents = calendar.dateComponents([.year, .month], from: lastMonth)
                if components.year == lastMonthComponents.year && components.month == lastMonthComponents.month {
                    return String(localized: "today.navigation.lastMonth")
                }
            }

            // Check if it's next month
            if let nextMonth = calendar.date(byAdding: .month, value: 1, to: today) {
                let nextMonthComponents = calendar.dateComponents([.year, .month], from: nextMonth)
                if components.year == nextMonthComponents.year && components.month == nextMonthComponents.month {
                    return String(localized: "today.navigation.nextMonth")
                }
            }

            // Format as month and year
            return self.formatted(.dateTime.month(.wide).year())
        }
    }

    /// Get secondary display label (e.g., date under weekday)
    func periodSecondaryLabel(for periodType: TodayPeriodType, calendar: Calendar = .current) -> String? {
        switch periodType {
        case .day:
            // Return the full date unless it's a relative day
            if calendar.isDateInToday(self) || calendar.isDateInYesterday(self) || calendar.isDateInTomorrow(self) {
                return self.formatted(.dateTime.day().month(.abbreviated).year())
            }
            return nil

        case .week:
            let (start, end) = dateRange(for: .week, calendar: calendar)
            let today = Date()
            let todayRange = today.dateRange(for: .week, calendar: calendar)

            // If it's this/last/next week, show the date range
            if start == todayRange.start ||
               start == today.previousPeriod(for: .week, calendar: calendar).dateRange(for: .week, calendar: calendar).start ||
               start == today.nextPeriod(for: .week, calendar: calendar).dateRange(for: .week, calendar: calendar).start {
                let startFormat = start.formatted(.dateTime.day().month(.abbreviated))
                let endFormat = end.formatted(.dateTime.day().month(.abbreviated))
                return "\(startFormat) - \(endFormat)"
            }
            return nil

        case .month:
            let components = calendar.dateComponents([.year, .month], from: self)
            let todayComponents = calendar.dateComponents([.year, .month], from: Date())

            // Show year for relative months
            if components.year == todayComponents.year {
                if let lastMonth = calendar.date(byAdding: .month, value: -1, to: Date()),
                   let nextMonth = calendar.date(byAdding: .month, value: 1, to: Date()) {
                    let lastMonthComponents = calendar.dateComponents([.year, .month], from: lastMonth)
                    let nextMonthComponents = calendar.dateComponents([.year, .month], from: nextMonth)

                    if components.month == todayComponents.month ||
                       (components.year == lastMonthComponents.year && components.month == lastMonthComponents.month) ||
                       (components.year == nextMonthComponents.year && components.month == nextMonthComponents.month) {
                        return self.formatted(.dateTime.month(.wide).year())
                    }
                }
            }
            return nil
        }
    }

    // MARK: - Comparison Helpers

    /// Check if date is in the same period as another date
    func isInSamePeriod(as other: Date, for periodType: TodayPeriodType, calendar: Calendar = .current) -> Bool {
        switch periodType {
        case .day:
            return calendar.isDate(self, inSameDayAs: other)
        case .week:
            let selfRange = dateRange(for: .week, calendar: calendar)
            let otherRange = other.dateRange(for: .week, calendar: calendar)
            return selfRange.start == otherRange.start
        case .month:
            let selfComponents = calendar.dateComponents([.year, .month], from: self)
            let otherComponents = calendar.dateComponents([.year, .month], from: other)
            return selfComponents.year == otherComponents.year && selfComponents.month == otherComponents.month
        }
    }

    /// Check if date is in current period
    func isInCurrentPeriod(for periodType: TodayPeriodType, calendar: Calendar = .current) -> Bool {
        isInSamePeriod(as: Date(), for: periodType, calendar: calendar)
    }
}
