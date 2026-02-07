//
//  UserSettingsService.swift
//  EquiDuty
//
//  API-backed user settings service for cross-device preference sync.
//  Follows the same singleton @Observable pattern as PermissionService/SubscriptionService.
//

import Foundation
import Observation

@MainActor
@Observable
final class UserSettingsService {
    static let shared = UserSettingsService()

    // MARK: - Observable State

    private(set) var preferences: UserPreferences?
    private(set) var isLoading = false
    private(set) var error: Error?

    // MARK: - Dependencies

    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Fetch

    /// Fetch user preferences from API. Returns defaults if none exist server-side.
    func fetchPreferences() async {
        isLoading = true
        defer { isLoading = false }

        do {
            let response: UserPreferencesResponse = try await apiClient.get(
                APIEndpoints.settingsPreferences
            )
            self.preferences = response.preferences
            self.error = nil
        } catch {
            #if DEBUG
            print("⚠️ Failed to fetch user preferences: \(error)")
            #endif
            self.error = error
            // Keep existing preferences (or defaults) as fallback
            if self.preferences == nil {
                self.preferences = .defaults
            }
        }
    }

    // MARK: - Update

    /// Send a partial update to the API and refresh local state.
    func updatePreferences(_ updates: UpdatePreferencesInput) async throws {
        let response: UserPreferencesResponse = try await apiClient.patch(
            APIEndpoints.settingsPreferences,
            body: updates
        )
        self.preferences = response.preferences
    }

    // MARK: - Convenience Setters

    func setLanguage(_ lang: String) async throws {
        var input = UpdatePreferencesInput()
        input.language = lang
        try await updatePreferences(input)
    }

    func setTimezone(_ tz: String) async throws {
        var input = UpdatePreferencesInput()
        input.timezone = tz
        try await updatePreferences(input)
    }

    func setDefaultStable(_ id: String?) async throws {
        var input = UpdatePreferencesInput()
        input.defaultStableId = id
        try await updatePreferences(input)
    }

    func setDefaultOrganization(_ id: String?) async throws {
        var input = UpdatePreferencesInput()
        input.defaultOrganizationId = id
        try await updatePreferences(input)
    }

    func setNotifications(_ notifs: UpdatePreferencesInput.PartialNotificationPreferences) async throws {
        var input = UpdatePreferencesInput()
        input.notifications = notifs
        try await updatePreferences(input)
    }

    // MARK: - Clear

    /// Clear cached preferences (call on sign-out).
    func clearCache() {
        preferences = nil
        error = nil
    }
}
