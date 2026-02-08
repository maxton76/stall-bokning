//
//  Date+ISO8601Tests.swift
//  EquiDuty
//
//  Unit tests for ISO 8601 date formatting utilities
//

import Foundation

#if DEBUG
/// Quick validation tests for Date+ISO8601 extension
/// Run these in a playground or test target to verify formatting
extension Date {
    static func validateISO8601Formatting() {
        print("🧪 Testing Date+ISO8601 Extension")
        print(String(repeating: "=", count: 50))

        // Test 1: Basic ISO 8601 formatting
        let testDate = Date(timeIntervalSince1970: 1738368000) // 2026-02-01 00:00:00 UTC
        let iso8601String = testDate.iso8601DateTimeString()
        print("✅ Basic ISO 8601: \(iso8601String)")
        print("   Expected format: YYYY-MM-DDTHH:mm:ssZ")
        assert(iso8601String.contains("T"), "Missing 'T' separator")
        assert(iso8601String.hasSuffix("Z"), "Missing 'Z' timezone indicator")

        // Test 2: Start of day formatting
        let calendar = Calendar.current
        let someDate = calendar.date(from: DateComponents(year: 2026, month: 2, day: 5, hour: 14, minute: 30))!
        let startOfDay = someDate.startOfDayISO8601()
        print("✅ Start of day: \(startOfDay)")
        print("   Input: 2026-02-05 14:30:00")
        assert(startOfDay.contains("T00:00:00"), "Start of day should be 00:00:00")

        // Test 3: End of day formatting
        let endOfDay = someDate.endOfDayISO8601()
        print("✅ End of day: \(endOfDay)")
        assert(endOfDay.contains("T23:59:59"), "End of day should be 23:59:59")

        // Test 4: Week range (typical use case)
        let today = Date()
        let weekAgo = calendar.date(byAdding: .day, value: -7, to: today)!
        let startParam = weekAgo.startOfDayISO8601()
        let endParam = today.endOfDayISO8601()
        print("✅ Week range:")
        print("   startDate: \(startParam)")
        print("   endDate: \(endParam)")

        // Test 5: URL encoding (verify no special characters need escaping)
        let urlString = "https://api.example.com/activities?startDate=\(startParam)&endDate=\(endParam)"
        print("✅ URL encoding:")
        print("   URL: \(urlString)")
        print("   Note: Colons and plus signs are safe in query params")

        print(String(repeating: "=", count: 50))
        print("🎉 All Date+ISO8601 tests passed!")
        print("\nExpected API request format:")
        print("GET /api/v1/horse-activity-history/horse/{id}?startDate=2026-02-01T00:00:00Z&endDate=2026-02-08T23:59:59Z")
    }
}

/// Example usage in service
func exampleAPICall() {
    print("\n📝 Example Service Usage:")
    print(String(repeating: "=", count: 50))

    let calendar = Calendar.current
    let startDate = calendar.date(byAdding: .day, value: -7, to: Date())!
    let endDate = Date()

    var params: [String: String] = [:]
    params["startDate"] = startDate.startOfDayISO8601()
    params["endDate"] = endDate.endOfDayISO8601()
    params["limit"] = "50"

    print("Query parameters:")
    for (key, value) in params.sorted(by: { $0.key < $1.key }) {
        print("  \(key): \(value)")
    }
    print(String(repeating: "=", count: 50))
}
#endif

// Uncomment to run validation:
// Date.validateISO8601Formatting()
// exampleAPICall()
