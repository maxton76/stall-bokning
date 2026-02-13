//
//  FacilityModels.swift
//  EquiDuty
//
//  Facility data models matching API responses
//

import Foundation

/// Facility status
enum FacilityStatus: String, Codable {
    case active
    case inactive
    case maintenance
}

/// A facility at a stable (arena, paddock, etc.)
struct Facility: Codable, Identifiable {
    let id: String
    let stableId: String
    let name: String
    let type: String
    let description: String?
    let capacity: Int?
    let bookingRules: BookingRules?
    let status: FacilityStatus
    let availabilitySchedule: FacilityAvailabilitySchedule?
    let availableFrom: String?
    let availableTo: String?
    let daysAvailable: [Int]?
    let createdAt: Date?
    let updatedAt: Date?
    let createdBy: String?
    let lastModifiedBy: String?
}

/// Booking rules for a facility
struct BookingRules: Codable {
    let minDuration: Int?
    let maxDuration: Int?
    let advanceBookingDays: Int?
    let requiresApproval: Bool?
    let maxConcurrentBookings: Int?
    let allowRecurring: Bool?
}

/// Availability schedule for a facility
struct FacilityAvailabilitySchedule: Codable {
    let weeklySchedule: WeeklySchedule?
    let exceptions: [ScheduleException]?
}

/// Weekly schedule configuration
struct WeeklySchedule: Codable {
    let defaultTimeBlocks: [TimeBlock]?
    let days: [String: FacilityDaySchedule]?
}

/// A time block (from-to in HH:MM format)
struct TimeBlock: Codable {
    let from: String
    let to: String
}

/// Schedule for a specific day of the week
struct FacilityDaySchedule: Codable {
    let available: Bool?
    let timeBlocks: [TimeBlock]?
}

/// Exception to the regular schedule (e.g., holidays, maintenance)
struct ScheduleException: Codable {
    let date: String
    let type: ScheduleExceptionType
    let timeBlocks: [TimeBlock]?
    let reason: String?
    let createdBy: String?
    let createdAt: Date?
}

/// Schedule exception type
enum ScheduleExceptionType: String, Codable {
    case closed
    case modified
}

/// Response from GET /facilities
struct FacilitiesResponse: Codable {
    let facilities: [Facility]
}

/// Response from GET /facilities/:id/available-slots
struct AvailableSlotsResponse: Codable {
    let date: String
    let timeBlocks: [TimeBlock]
}
