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
    case manage
    case stables

    var label: String {
        switch self {
        case .browse: String(localized: "facilities.browse")
        case .myBookings: String(localized: "facilities.myBookings")
        case .manage: String(localized: "facilities.manage")
        case .stables: String(localized: "stables.segment.label")
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

    /// Whether the user can manage facilities
    private var canManage: Bool {
        permissionService.hasPermission(.manageFacilities) || permissionService.isOrgOwner
    }

    /// Whether the user can view the Stall segment
    private var canViewStables: Bool {
        permissionService.hasPermission(.createStables)
            || permissionService.hasPermission(.manageStableSettings)
            || permissionService.isOrgOwner
    }

    private var availableSegments: [FacilityTabSegment] {
        var segments: [FacilityTabSegment] = [.browse, .myBookings]
        if canManage {
            segments.append(.manage)
        }
        if canViewStables {
            segments.append(.stables)
        }
        return segments
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
                case .manage:
                    ManageFacilitiesView()
                case .stables:
                    StablesListView()
                }
            }
            .frame(maxHeight: .infinity, alignment: .top)
            .navigationTitle(String(localized: "facilities.title"))
            .notificationBellToolbar(viewModel: notificationViewModel, showNotificationCenter: $showNotificationCenter)
            .withAppNavigationDestinations()
        }
    }
}
