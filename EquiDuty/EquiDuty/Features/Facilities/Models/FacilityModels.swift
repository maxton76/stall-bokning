//
//  FacilityModels.swift
//  EquiDuty
//
//  Facility data models matching API responses
//

import Foundation

// MARK: - Facility Type

/// Facility type matching API values (snake_case)
enum FacilityType: String, Codable, CaseIterable, Identifiable {
    case transport
    case waterTreadmill = "water_treadmill"
    case indoorArena = "indoor_arena"
    case outdoorArena = "outdoor_arena"
    case gallopingTrack = "galloping_track"
    case lungingRing = "lunging_ring"
    case paddock
    case solarium
    case jumpingYard = "jumping_yard"
    case treadmill
    case vibrationPlate = "vibration_plate"
    case pasture
    case walker
    case other

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .transport: String(localized: "facilities.type.transport")
        case .waterTreadmill: String(localized: "facilities.type.waterTreadmill")
        case .indoorArena: String(localized: "facilities.type.indoorArena")
        case .outdoorArena: String(localized: "facilities.type.outdoorArena")
        case .gallopingTrack: String(localized: "facilities.type.gallopingTrack")
        case .lungingRing: String(localized: "facilities.type.lungingRing")
        case .paddock: String(localized: "facilities.type.paddock")
        case .solarium: String(localized: "facilities.type.solarium")
        case .jumpingYard: String(localized: "facilities.type.jumpingYard")
        case .treadmill: String(localized: "facilities.type.treadmill")
        case .vibrationPlate: String(localized: "facilities.type.vibrationPlate")
        case .pasture: String(localized: "facilities.type.pasture")
        case .walker: String(localized: "facilities.type.walker")
        case .other: String(localized: "facilities.type.other")
        }
    }

    var icon: String {
        switch self {
        case .transport: "car.side"
        case .waterTreadmill: "drop.fill"
        case .indoorArena: "figure.equestrian.sports"
        case .outdoorArena: "sun.max.fill"
        case .gallopingTrack: "figure.run"
        case .lungingRing: "circle.dashed"
        case .paddock: "square.dashed"
        case .solarium: "light.max"
        case .jumpingYard: "arrow.up.forward"
        case .treadmill: "arrow.triangle.2.circlepath"
        case .vibrationPlate: "waveform.path"
        case .pasture: "leaf.fill"
        case .walker: "arrow.clockwise"
        case .other: "building.2"
        }
    }
}

// MARK: - Facility Day of Week

/// Day of week for facility schedule configuration (String raw values matching API)
enum FacilityDayOfWeek: String, Codable, CaseIterable, Identifiable {
    case monday, tuesday, wednesday, thursday, friday, saturday, sunday

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .monday: String(localized: "schedule.day.monday")
        case .tuesday: String(localized: "schedule.day.tuesday")
        case .wednesday: String(localized: "schedule.day.wednesday")
        case .thursday: String(localized: "schedule.day.thursday")
        case .friday: String(localized: "schedule.day.friday")
        case .saturday: String(localized: "schedule.day.saturday")
        case .sunday: String(localized: "schedule.day.sunday")
        }
    }

    var shortName: String {
        switch self {
        case .monday: String(localized: "schedule.day.mon")
        case .tuesday: String(localized: "schedule.day.tue")
        case .wednesday: String(localized: "schedule.day.wed")
        case .thursday: String(localized: "schedule.day.thu")
        case .friday: String(localized: "schedule.day.fri")
        case .saturday: String(localized: "schedule.day.sat")
        case .sunday: String(localized: "schedule.day.sun")
        }
    }
}

// MARK: - Time Slot Duration

/// Minimum time slot duration options
enum TimeSlotDuration: Int, Codable, CaseIterable, Identifiable {
    case fifteen = 15
    case thirty = 30
    case sixty = 60

    var id: Int { rawValue }

    var displayName: String {
        switch self {
        case .fifteen: String(localized: "facilities.form.duration.15min")
        case .thirty: String(localized: "facilities.form.duration.30min")
        case .sixty: String(localized: "facilities.form.duration.60min")
        }
    }
}

// MARK: - Duration Unit

/// Unit for max reservation duration
enum DurationUnit: String, CaseIterable, Identifiable {
    case hours
    case days

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .hours: String(localized: "facilities.form.unit.hours")
        case .days: String(localized: "facilities.form.unit.days")
        }
    }
}

// MARK: - Facility Status

/// Facility status
enum FacilityStatus: String, Codable, CaseIterable, Identifiable {
    case active
    case inactive
    case maintenance

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .active: String(localized: "facilities.status.active")
        case .inactive: String(localized: "facilities.status.inactive")
        case .maintenance: String(localized: "facilities.status.maintenance")
        }
    }

    var color: String {
        switch self {
        case .active: "green"
        case .inactive: "gray"
        case .maintenance: "orange"
        }
    }
}

// MARK: - Facility

/// A facility at a stable (arena, paddock, etc.)
struct Facility: Codable, Identifiable, Hashable {
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
    let planningWindowOpens: Int?
    let planningWindowCloses: Int?
    let maxHorsesPerReservation: Int?
    let minTimeSlotDuration: Int?
    let maxHoursPerReservation: Int?
    let createdAt: Date?
    let updatedAt: Date?
    let createdBy: String?
    let lastModifiedBy: String?

    /// Parsed facility type enum (falls back to .other)
    var facilityType: FacilityType {
        FacilityType(rawValue: type) ?? .other
    }

    static func == (lhs: Facility, rhs: Facility) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

// MARK: - Booking Rules

/// Booking rules for a facility
struct BookingRules: Codable, Hashable {
    let minDuration: Int?
    let maxDuration: Int?
    let advanceBookingDays: Int?
    let requiresApproval: Bool?
    let maxConcurrentBookings: Int?
    let allowRecurring: Bool?
}

// MARK: - Availability Schedule

/// Availability schedule for a facility
struct FacilityAvailabilitySchedule: Codable, Hashable {
    let weeklySchedule: WeeklySchedule?
    let exceptions: [ScheduleException]?
}

/// Weekly schedule configuration
struct WeeklySchedule: Codable, Hashable {
    let defaultTimeBlocks: [TimeBlock]?
    let days: [String: FacilityDaySchedule]?
}

/// A time block (from-to in HH:MM format)
struct TimeBlock: Codable, Hashable, Identifiable {
    var id: String { "\(from)-\(to)" }
    let from: String
    let to: String
}

/// Schedule for a specific day of the week
struct FacilityDaySchedule: Codable, Hashable {
    let available: Bool?
    let timeBlocks: [TimeBlock]?
}

/// Exception to the regular schedule (e.g., holidays, maintenance)
struct ScheduleException: Codable, Hashable, Identifiable {
    var id: String { date }
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

// MARK: - API Responses

/// Response from GET /facilities
struct FacilitiesResponse: Codable {
    let facilities: [Facility]
}

/// Response from GET /facilities/:id/available-slots
struct AvailableSlotsResponse: Codable {
    let date: String
    let timeBlocks: [TimeBlock]
}

/// Response from POST /facilities
struct CreateFacilityResponse: Codable {
    let id: String
}

/// Response from POST /facilities/:id/exceptions
struct ScheduleExceptionResponse: Codable {
    let success: Bool
    let exception: ScheduleException
}

// MARK: - API Requests

/// Request body for creating a facility
struct CreateFacilityRequest: Encodable {
    let stableId: String
    let name: String
    let type: String
    let description: String?
    let status: String
    let planningWindowOpens: Int
    let planningWindowCloses: Int
    let maxHorsesPerReservation: Int
    let minTimeSlotDuration: Int
    let maxHoursPerReservation: Int?
    let availabilitySchedule: EncodableAvailabilitySchedule?
}

/// Request body for updating a facility
struct UpdateFacilityRequest: Encodable {
    let name: String?
    let type: String?
    let description: String?
    let status: String?
    let planningWindowOpens: Int?
    let planningWindowCloses: Int?
    let maxHorsesPerReservation: Int?
    let minTimeSlotDuration: Int?
    let maxHoursPerReservation: Int?
    let availabilitySchedule: EncodableAvailabilitySchedule?
}

/// Request body for creating a schedule exception
struct CreateScheduleExceptionRequest: Encodable {
    let date: String
    let type: String
    let timeBlocks: [EncodableTimeBlock]?
    let reason: String?
}

// MARK: - Encodable Helpers

/// Encodable version of availability schedule for requests
struct EncodableAvailabilitySchedule: Encodable {
    let weeklySchedule: EncodableWeeklySchedule?
    let exceptions: [EncodableException]?
}

struct EncodableWeeklySchedule: Encodable {
    let defaultTimeBlocks: [EncodableTimeBlock]?
    let days: [String: EncodableDaySchedule]?
}

struct EncodableTimeBlock: Encodable {
    let from: String
    let to: String
}

struct EncodableDaySchedule: Encodable {
    let available: Bool
    let timeBlocks: [EncodableTimeBlock]?
}

struct EncodableException: Encodable {
    let date: String
    let type: String
    let timeBlocks: [EncodableTimeBlock]?
    let reason: String?
}

// MARK: - Factory

/// Create a default availability schedule (08:00–20:00, all days available)
func createDefaultSchedule() -> FacilityAvailabilitySchedule {
    let defaultBlock = TimeBlock(from: "08:00", to: "20:00")
    let weeklySchedule = WeeklySchedule(
        defaultTimeBlocks: [defaultBlock],
        days: Dictionary(
            uniqueKeysWithValues: FacilityDayOfWeek.allCases.map { day in
                (day.rawValue, FacilityDaySchedule(available: true, timeBlocks: nil))
            }
        )
    )
    return FacilityAvailabilitySchedule(weeklySchedule: weeklySchedule, exceptions: [])
}
