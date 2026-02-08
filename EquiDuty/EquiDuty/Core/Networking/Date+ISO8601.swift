//
//  Date+ISO8601.swift
//  EquiDuty
//
//  ISO 8601 datetime formatting utilities for API communication
//

import Foundation

extension Date {
    // MARK: - ISO 8601 DateTime Formatting

    /// Returns ISO 8601 datetime string in UTC (e.g., "2026-02-01T00:00:00Z")
    /// - Returns: ISO 8601 formatted string with timezone
    func iso8601DateTimeString() -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withTimeZone]
        formatter.timeZone = TimeZone(identifier: "UTC")
        return formatter.string(from: self)
    }

    /// Returns ISO 8601 datetime string at start of day (00:00:00 UTC)
    /// Used for startDate query parameters in API calls
    /// - Returns: ISO 8601 formatted string at start of day
    func startOfDayISO8601() -> String {
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: self)
        return startOfDay.iso8601DateTimeString()
    }

    /// Returns ISO 8601 datetime string at end of day (23:59:59 UTC)
    /// Used for endDate query parameters in API calls
    /// - Returns: ISO 8601 formatted string at end of day
    func endOfDayISO8601() -> String {
        let calendar = Calendar.current
        var components = calendar.dateComponents([.year, .month, .day], from: self)
        components.hour = 23
        components.minute = 59
        components.second = 59
        components.timeZone = TimeZone(identifier: "UTC")
        let endOfDay = calendar.date(from: components) ?? self
        return endOfDay.iso8601DateTimeString()
    }
}
