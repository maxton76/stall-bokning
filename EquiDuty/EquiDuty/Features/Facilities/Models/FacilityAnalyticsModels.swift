//
//  FacilityAnalyticsModels.swift
//  EquiDuty
//
//  Analytics models for facility reservations
//

import Foundation

/// Analytics response from GET /facility-reservations/analytics
struct FacilityAnalytics: Codable {
    let metrics: AnalyticsMetrics
    let facilityUtilization: [FacilityUtilization]
    let topUsers: [TopUser]
    let dateRange: AnalyticsDateRange
}

/// Aggregate booking metrics
struct AnalyticsMetrics: Codable {
    let totalBookings: Int
    let confirmedBookings: Int
    let completedBookings: Int
    let cancelledBookings: Int
    let noShows: Int
    let averageDuration: Double
    let noShowRate: Double
    let peakHour: Int?
}

/// Per-facility utilization data
struct FacilityUtilization: Codable, Identifiable {
    let facilityId: String
    let facilityName: String
    let bookings: Int
    let bookedHours: Double

    var id: String { facilityId }
}

/// Top user by booking count
struct TopUser: Codable, Identifiable {
    let userId: String
    let userEmail: String
    let userName: String?
    let bookingCount: Int

    var id: String { userId }
}

/// Date range for analytics query
struct AnalyticsDateRange: Codable {
    let startDate: Date
    let endDate: Date
}
