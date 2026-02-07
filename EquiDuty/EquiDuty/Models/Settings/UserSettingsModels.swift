//
//  UserSettingsModels.swift
//  EquiDuty
//
//  Models for user preferences synced across devices via API.
//

import Foundation

/// Notification preference toggles synced to Firestore
struct NotificationPreferences: Codable {
    var email: Bool
    var push: Bool
    var routines: Bool
    var feeding: Bool
    var activities: Bool

    static let defaults = NotificationPreferences(
        email: true,
        push: false,
        routines: true,
        feeding: true,
        activities: true
    )
}

/// User preferences stored in users/{userId}/settings/preferences
struct UserPreferences: Codable {
    var defaultStableId: String?
    var defaultOrganizationId: String?
    var language: String
    var timezone: String
    var notifications: NotificationPreferences
    var updatedAt: String?

    static let defaults = UserPreferences(
        defaultStableId: nil,
        defaultOrganizationId: nil,
        language: "sv",
        timezone: "Europe/Stockholm",
        notifications: .defaults,
        updatedAt: nil
    )
}

/// API response wrapper
struct UserPreferencesResponse: Codable {
    let preferences: UserPreferences
}

/// Input for partial preference updates — all fields optional
struct UpdatePreferencesInput: Codable {
    var defaultStableId: String?
    var defaultOrganizationId: String?
    var language: String?
    var timezone: String?
    var notifications: PartialNotificationPreferences?

    /// Partial notification update (only include changed fields)
    struct PartialNotificationPreferences: Codable {
        var email: Bool?
        var push: Bool?
        var routines: Bool?
        var feeding: Bool?
        var activities: Bool?
    }
}
