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
    case feeding
    case routines
    case settings
}

/// Navigation destinations for the app
enum AppDestination: Hashable {
    // Horses
    case horseDetail(horseId: String)
    case horseForm(horseId: String?)

    // Routines
    case routineFlow(instanceId: String)
    case routineDetail(templateId: String)

    // Feeding
    case feedingSchedule(stableId: String)
    case feedTypeList(stableId: String)

    // Activities
    case activityDetail(activityId: String)
    case activityForm(activityId: String?)

    // Settings
    case account
    case notificationSettings
    case languageSettings
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
    var feedingPath = NavigationPath()
    var routinesPath = NavigationPath()
    var settingsPath = NavigationPath()

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

    func navigateToAccount() {
        settingsPath.append(AppDestination.account)
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
        case .feeding:
            feedingPath.append(destination)
        case .routines:
            routinesPath.append(destination)
        case .settings:
            settingsPath.append(destination)
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
                navigateToHorseDetail(horseId)
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
            switchToTab(.feeding)
        case "routines":
            switchToTab(.routines)
        case "settings":
            switchToTab(.settings)
        default:
            break
        }
    }

    // MARK: - Reset

    func resetAll() {
        selectedTab = .today
        todayPath = NavigationPath()
        horsesPath = NavigationPath()
        feedingPath = NavigationPath()
        routinesPath = NavigationPath()
        settingsPath = NavigationPath()
    }

    func resetCurrentTabPath() {
        switch selectedTab {
        case .today:
            todayPath = NavigationPath()
        case .horses:
            horsesPath = NavigationPath()
        case .feeding:
            feedingPath = NavigationPath()
        case .routines:
            routinesPath = NavigationPath()
        case .settings:
            settingsPath = NavigationPath()
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
            case .routineFlow(let instanceId):
                RoutineFlowView(instanceId: instanceId)
            case .routineDetail(let templateId):
                RoutineDetailView(templateId: templateId)
            case .feedingSchedule(let stableId):
                FeedingScheduleView(stableId: stableId)
            case .feedTypeList(let stableId):
                FeedTypeListView(stableId: stableId)
            case .activityDetail(let activityId):
                ActivityDetailByIdView(activityId: activityId)
            case .activityForm(let activityId):
                ActivityFormView(activityId: activityId)
            case .account:
                AccountView()
            case .notificationSettings:
                NotificationSettingsView()
            case .languageSettings:
                LanguageSettingsView()
            case .stableSelection:
                StableSelectionView()
            case .organizationSelection:
                OrganizationSelectionView()
            }
        }
    }
}
