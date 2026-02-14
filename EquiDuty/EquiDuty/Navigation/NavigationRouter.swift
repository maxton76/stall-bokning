//
//  NavigationRouter.swift
//  EquiDuty
//
//  Navigation path management for deep linking and programmatic navigation
//

import SwiftUI

/// Tab identifiers for programmatic tab switching
enum AppTab: String, CaseIterable {
    case today
    case horses
    case routines
    case facilities
    case more
}

/// Navigation destinations for the app
enum AppDestination: Hashable {
    // Horses
    case horseDetail(horseId: String)
    case horseForm(horseId: String?)
    case horseHistory(horseId: String)

    // Routines
    case routineFlow(instanceId: String)
    case routineDetail(templateId: String)
    case routineTemplates
    case routineTemplate(id: String)
    case routineSchedules
    case routineSchedule(id: String)

    // Feeding
    case feeding
    case feedingSchedule(stableId: String)
    case feedTypeList(stableId: String)

    // Activities
    case activityDetail(activityId: String)
    case activityForm(activityId: String?)

    // Selection Processes
    case selectionProcessDetail(processId: String)
    case createSelectionProcess(stableId: String, organizationId: String)

    // Facilities
    case facilityDetail(facilityId: String)
    case facilityReservationDetail(reservationId: String)

    // Feature Requests
    case featureRequests
    case featureRequestDetail(requestId: String)

    // Settings
    case settings
    case account
    case notificationSettings
    case languageSettings
    case appearanceSettings
    case stableSelection
    case organizationSelection
}

/// Navigation router for programmatic navigation
@MainActor
@Observable
final class NavigationRouter {
    static let shared = NavigationRouter()

    /// Currently selected tab - observed by MainTabView
    var selectedTab: AppTab = .today

    /// Navigation paths for each tab
    var todayPath = NavigationPath()
    var horsesPath = NavigationPath()
    var routinesPath = NavigationPath()
    var facilitiesPath = NavigationPath()
    var morePath = NavigationPath()

    private init() {}

    // MARK: - Navigation Methods

    func navigateToHorseDetail(_ horseId: String) {
        horsesPath.append(AppDestination.horseDetail(horseId: horseId))
    }

    func navigateToHorseForm(_ horseId: String? = nil) {
        horsesPath.append(AppDestination.horseForm(horseId: horseId))
    }

    func navigateToRoutineFlow(_ instanceId: String) {
        routinesPath.append(AppDestination.routineFlow(instanceId: instanceId))
    }

    func navigateToActivityDetail(_ activityId: String) {
        todayPath.append(AppDestination.activityDetail(activityId: activityId))
    }

    func navigateToFacilityDetail(_ facilityId: String) {
        facilitiesPath.append(AppDestination.facilityDetail(facilityId: facilityId))
    }

    func navigateToAccount() {
        morePath.append(AppDestination.account)
    }

    func navigateToFeatureRequests() {
        morePath.append(AppDestination.featureRequests)
    }

    func navigateToFeatureRequestDetail(_ requestId: String) {
        morePath.append(AppDestination.featureRequestDetail(requestId: requestId))
    }

    // MARK: - Tab Switching

    func switchToTab(_ tab: AppTab) {
        selectedTab = tab
    }

    func switchToTabAndNavigate(_ tab: AppTab, destination: AppDestination) {
        selectedTab = tab
        switch tab {
        case .today:
            todayPath.append(destination)
        case .horses:
            horsesPath.append(destination)
        case .routines:
            routinesPath.append(destination)
        case .facilities:
            facilitiesPath.append(destination)
        case .more:
            morePath.append(destination)
        }
    }

    // MARK: - Deep Link Handling

    func handleDeepLink(_ url: URL) {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true),
              let host = components.host else {
            return
        }

        let pathComponents = components.path.split(separator: "/").map(String.init)

        switch host {
        case "horse":
            if let horseId = pathComponents.first {
                switchToTab(.horses)
                if pathComponents.count > 1 && pathComponents[1] == "history" {
                    horsesPath.append(AppDestination.horseHistory(horseId: horseId))
                } else {
                    navigateToHorseDetail(horseId)
                }
            }
        case "routine":
            if let instanceId = pathComponents.first {
                switchToTab(.routines)
                navigateToRoutineFlow(instanceId)
            }
        case "activity":
            if let activityId = pathComponents.first {
                switchToTab(.today)
                navigateToActivityDetail(activityId)
            }
        case "today":
            switchToTab(.today)
        case "horses":
            switchToTab(.horses)
        case "feeding":
            switchToTab(.more)
            morePath.append(AppDestination.feeding)
        case "routines":
            switchToTab(.routines)
        case "facilities":
            switchToTab(.facilities)
        case "facility":
            if let facilityId = pathComponents.first {
                switchToTab(.facilities)
                navigateToFacilityDetail(facilityId)
            }
        case "feature-requests":
            switchToTab(.more)
            navigateToFeatureRequests()
        case "feature-request":
            if let requestId = pathComponents.first {
                switchToTab(.more)
                navigateToFeatureRequests()
                navigateToFeatureRequestDetail(requestId)
            }
        case "settings":
            switchToTab(.more)
            morePath.append(AppDestination.settings)
        default:
            break
        }
    }

    // MARK: - Reset

    func resetAll() {
        selectedTab = .today
        todayPath = NavigationPath()
        horsesPath = NavigationPath()
        routinesPath = NavigationPath()
        facilitiesPath = NavigationPath()
        morePath = NavigationPath()
    }

    func resetCurrentTabPath() {
        switch selectedTab {
        case .today:
            todayPath = NavigationPath()
        case .horses:
            horsesPath = NavigationPath()
        case .routines:
            routinesPath = NavigationPath()
        case .facilities:
            facilitiesPath = NavigationPath()
        case .more:
            morePath = NavigationPath()
        }
    }
}

// MARK: - Navigation Destination View Modifier

extension View {
    func withAppNavigationDestinations() -> some View {
        self.navigationDestination(for: AppDestination.self) { destination in
            switch destination {
            case .horseDetail(let horseId):
                HorseDetailView(horseId: horseId)
            case .horseForm(let horseId):
                HorseFormView(horseId: horseId)
            case .horseHistory(let horseId):
                HorseDetailView(horseId: horseId, initialTab: .history)
            case .routineFlow(let instanceId):
                RoutineFlowView(instanceId: instanceId)
            case .routineDetail(let templateId):
                RoutineDetailView(templateId: templateId)
            case .routineTemplates:
                SchemaView() // Opens Schema view (tab will need to switch to templates)
            case .routineTemplate(_):
                SchemaView() // Opens Schema view with specific template
            case .routineSchedules:
                SchemaView() // Opens Schema view (tab will need to switch to schedules)
            case .routineSchedule(_):
                SchemaView() // Opens Schema view with specific schedule
            case .selectionProcessDetail(let processId):
                SelectionProcessDetailView(processId: processId)
            case .createSelectionProcess(let stableId, let organizationId):
                CreateSelectionProcessView(stableId: stableId, organizationId: organizationId) {}
            case .feeding:
                FeedingTodayView()
            case .feedingSchedule(let stableId):
                FeedingScheduleView(stableId: stableId)
            case .feedTypeList(let stableId):
                FeedTypeListView(stableId: stableId)
            case .activityDetail(let activityId):
                ActivityDetailByIdView(activityId: activityId)
            case .activityForm(let activityId):
                ActivityFormView(activityId: activityId)
            case .facilityDetail(let facilityId):
                FacilityDetailView(facilityId: facilityId)
            case .facilityReservationDetail(let reservationId):
                ReservationDetailView(reservationId: reservationId)
            case .featureRequests:
                FeatureRequestListView()
            case .featureRequestDetail(let requestId):
                FeatureRequestDetailView(requestId: requestId)
            case .settings:
                SettingsView()
            case .account:
                AccountView()
            case .notificationSettings:
                NotificationSettingsView()
            case .languageSettings:
                LanguageSettingsView()
            case .appearanceSettings:
                AppearanceSettingsView()
            case .stableSelection:
                StableSelectionView()
            case .organizationSelection:
                OrganizationSelectionView()
            }
        }
    }
}
