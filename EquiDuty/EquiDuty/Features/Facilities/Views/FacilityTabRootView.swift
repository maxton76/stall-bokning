//
//  FacilityTabRootView.swift
//  EquiDuty
//
//  Root view for the Facilities tab with segmented navigation
//

import SwiftUI

/// Segments for the Facilities tab
enum FacilityTabSegment: String, CaseIterable {
    case browse
    case myBookings
    case analytics

    var label: String {
        switch self {
        case .browse: String(localized: "facilities.browse")
        case .myBookings: String(localized: "facilities.myBookings")
        case .analytics: String(localized: "facilities.analytics")
        }
    }
}

struct FacilityTabRootView: View {
    @State private var router = NavigationRouter.shared
    @State private var authService = AuthService.shared
    @State private var permissionService = PermissionService.shared
    @State private var selectedSegment: FacilityTabSegment = .browse
    @Environment(NotificationViewModel.self) private var notificationViewModel
    @State private var showNotificationCenter = false

    /// Whether the user has manager-level access (for analytics tab visibility)
    private var isManager: Bool {
        permissionService.hasPermission(.viewFinancialReports) || permissionService.isOrgOwner
    }

    private var availableSegments: [FacilityTabSegment] {
        if isManager {
            return FacilityTabSegment.allCases
        } else {
            return [.browse, .myBookings]
        }
    }

    var body: some View {
        NavigationStack(path: $router.facilitiesPath) {
            VStack(spacing: 0) {
                // Segmented control
                Picker(String(localized: "facilities.title"), selection: $selectedSegment) {
                    ForEach(availableSegments, id: \.self) { segment in
                        Text(segment.label).tag(segment)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                .padding(.top, EquiDutyDesign.Spacing.sm)

                // Content based on selected segment
                switch selectedSegment {
                case .browse:
                    FacilityListView()
                case .myBookings:
                    MyReservationsView()
                case .analytics:
                    FacilityAnalyticsView()
                }
            }
            .navigationTitle(String(localized: "facilities.title"))
            .notificationBellToolbar(viewModel: notificationViewModel, showNotificationCenter: $showNotificationCenter)
            .withAppNavigationDestinations()
        }
    }
}
