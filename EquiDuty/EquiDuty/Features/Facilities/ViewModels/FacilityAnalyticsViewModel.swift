//
//  FacilityAnalyticsViewModel.swift
//  EquiDuty
//
//  ViewModel for facility analytics dashboard
//

import Foundation

/// Date range presets for analytics
enum AnalyticsDateRangePreset: String, CaseIterable {
    case last7Days
    case last30Days
    case last90Days

    var label: String {
        switch self {
        case .last7Days: String(localized: "analytics.last7Days")
        case .last30Days: String(localized: "analytics.last30Days")
        case .last90Days: String(localized: "analytics.last90Days")
        }
    }

    var daysBack: Int {
        switch self {
        case .last7Days: 7
        case .last30Days: 30
        case .last90Days: 90
        }
    }
}

@MainActor
@Observable
final class FacilityAnalyticsViewModel {
    // MARK: - State

    var analytics: FacilityAnalytics?
    var isLoading = false
    var errorMessage: String?
    var selectedPreset: AnalyticsDateRangePreset = .last30Days

    // MARK: - Dependencies

    private let service = FacilityReservationService.shared
    private let authService = AuthService.shared

    // MARK: - Computed

    var stableId: String? {
        authService.selectedStable?.id
    }

    var metrics: AnalyticsMetrics? {
        analytics?.metrics
    }

    var utilization: [FacilityUtilization] {
        analytics?.facilityUtilization ?? []
    }

    var topUsers: [TopUser] {
        analytics?.topUsers ?? []
    }

    var peakHourFormatted: String? {
        guard let hour = metrics?.peakHour else { return nil }
        return String(format: "%02d:00", hour)
    }

    var noShowRateFormatted: String {
        guard let rate = metrics?.noShowRate else { return "0%" }
        return String(format: "%.0f%%", rate * 100)
    }

    // MARK: - Actions

    func loadData() async {
        guard let stableId else { return }

        isLoading = true
        errorMessage = nil

        let calendar = Calendar.current
        let endDate = Date()
        let startDate = calendar.date(byAdding: .day, value: -selectedPreset.daysBack, to: endDate) ?? endDate

        do {
            analytics = try await service.getAnalytics(stableId: stableId, startDate: startDate, endDate: endDate)
            isLoading = false
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
        }
    }

    func changePreset(_ preset: AnalyticsDateRangePreset) async {
        selectedPreset = preset
        await loadData()
    }
}
