//
//  FeedingModels.swift
//  EquiDuty
//
//  Domain models for feeding management
//

import Foundation

/// Feed category types
enum FeedCategory: String, Codable, CaseIterable {
    case roughage = "roughage"
    case concentrate = "concentrate"
    case supplement = "supplement"
    case medicine = "medicine"

    var displayName: String {
        switch self {
        case .roughage: return String(localized: "feed.category.roughage")
        case .concentrate: return String(localized: "feed.category.concentrate")
        case .supplement: return String(localized: "feed.category.supplement")
        case .medicine: return String(localized: "feed.category.medicine")
        }
    }

    var icon: String {
        switch self {
        case .roughage: return "leaf.fill"
        case .concentrate: return "cup.and.saucer.fill"
        case .supplement: return "pills.fill"
        case .medicine: return "cross.case.fill"
        }
    }
}

/// Quantity measurement units
enum QuantityMeasure: String, Codable, CaseIterable {
    case scoop = "scoop"
    case teaspoon = "teaspoon"
    case tablespoon = "tablespoon"
    case cup = "cup"
    case ml = "ml"
    case l = "l"
    case g = "g"
    case kg = "kg"
    case custom = "custom"

    var displayName: String {
        switch self {
        case .scoop: return String(localized: "measure.scoop")
        case .teaspoon: return String(localized: "measure.teaspoon")
        case .tablespoon: return String(localized: "measure.tablespoon")
        case .cup: return String(localized: "measure.cup")
        case .ml: return "ml"
        case .l: return "l"
        case .g: return "g"
        case .kg: return "kg"
        case .custom: return String(localized: "measure.custom")
        }
    }

    var abbreviation: String {
        switch self {
        case .scoop: return String(localized: "measure.scoop.abbr")
        case .teaspoon: return String(localized: "measure.teaspoon.abbr")
        case .tablespoon: return String(localized: "measure.tablespoon.abbr")
        case .cup: return String(localized: "measure.cup.abbr")
        case .ml: return "ml"
        case .l: return "l"
        case .g: return "g"
        case .kg: return "kg"
        case .custom: return ""
        }
    }
}

/// Feed type definition (e.g., "Müsli Plus", "Hay")
struct FeedType: Codable, Identifiable, Equatable {
    let id: String
    let stableId: String
    var name: String
    var brand: String
    var category: FeedCategory
    var quantityMeasure: QuantityMeasure
    var defaultQuantity: Double
    var warning: String?
    var isActive: Bool
    let createdBy: String
    let createdAt: Date
    let updatedAt: Date
}

/// Feeding time slot definition (e.g., "morning" at 07:00)
struct FeedingTime: Codable, Identifiable, Equatable {
    let id: String
    let stableId: String
    var name: String
    var time: String  // HH:mm format
    var sortOrder: Int
    var isActive: Bool
    let createdBy: String
    let createdAt: Date
    let updatedAt: Date

    /// Parsed time components
    var timeComponents: DateComponents? {
        let parts = time.split(separator: ":")
        guard parts.count == 2,
              let hour = Int(parts[0]),
              let minute = Int(parts[1]),
              (0...23).contains(hour),
              (0...59).contains(minute) else {
            return nil
        }
        return DateComponents(hour: hour, minute: minute)
    }
}

/// Horse feeding assignment
struct HorseFeeding: Codable, Identifiable, Equatable {
    let id: String
    let stableId: String
    let horseId: String
    let feedTypeId: String
    let feedingTimeId: String
    var quantity: Double
    var startDate: Date
    var endDate: Date?
    var notes: String?
    var isActive: Bool
    let createdBy: String
    let createdAt: Date
    let updatedAt: Date

    // Denormalized fields
    var feedTypeName: String
    var feedTypeCategory: FeedCategory
    var quantityMeasure: QuantityMeasure
    var horseName: String
    var feedingTimeName: String

    /// Formatted quantity string
    var formattedQuantity: String {
        let formatter = NumberFormatter()
        formatter.minimumFractionDigits = 0
        formatter.maximumFractionDigits = 1
        let quantityStr = formatter.string(from: NSNumber(value: quantity)) ?? "\(quantity)"
        return "\(quantityStr) \(quantityMeasure.abbreviation)"
    }

    /// Check if this feeding is valid for a specific date
    /// Returns true if the feeding's date range includes the target date
    func isValidFor(date: Date) -> Bool {
        let calendar = Calendar.current
        let dateStart = calendar.startOfDay(for: date)
        let feedingStart = calendar.startOfDay(for: startDate)

        // Start date must be on or before the target date
        guard feedingStart <= dateStart else { return false }

        // If endDate exists, it must be after the target date
        if let end = endDate {
            let feedingEnd = calendar.startOfDay(for: end)
            return dateStart <= feedingEnd
        }

        return true // No end date means ongoing
    }
}

/// Daily feeding log entry
struct FeedingLogEntry: Codable, Identifiable, Equatable {
    let id: String
    let stableId: String
    let horseId: String
    let feedingTimeId: String
    let date: Date
    var completed: Bool
    var completedBy: String?
    var completedByName: String?
    var completedAt: Date?
    var notes: String?

    // Denormalized
    var horseName: String
    var feedingTimeName: String
}

// MARK: - API Response Types

struct FeedTypesResponse: Codable {
    let feedTypes: [FeedType]
}

struct FeedingTimesResponse: Codable {
    let feedingTimes: [FeedingTime]
}

struct HorseFeedingsResponse: Codable {
    let horseFeedings: [HorseFeeding]
}

// MARK: - Daily Feeding View Model

/// Grouped feeding data for daily tracking view
struct DailyFeedingData: Identifiable {
    let id: String
    let feedingTime: FeedingTime
    var horses: [HorseFeedingStatus]

    var completedCount: Int {
        horses.filter { $0.isCompleted }.count
    }

    var totalCount: Int {
        horses.count
    }

    var progressPercent: Double {
        guard totalCount > 0 else { return 0 }
        return Double(completedCount) / Double(totalCount)
    }

    var isComplete: Bool {
        completedCount == totalCount
    }
}

/// Horse feeding status for daily view
struct HorseFeedingStatus: Identifiable {
    let id: String
    let horse: Horse
    let feedings: [HorseFeeding]
    var isCompleted: Bool
    var completedBy: String?
    var completedAt: Date?
    var notes: String?

    /// Combined feeding instructions
    var feedingInstructions: String {
        feedings.map { "\($0.feedTypeName): \($0.formattedQuantity)" }.joined(separator: ", ")
    }
}
