//
//  NavigationRouter.swift
//  EquiDuty
//
//  Navigation path management for deep linking and programmatic navigation
//

import SwiftUI

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

    func navigateToAccount() {
        settingsPath.append(AppDestination.account)
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
                navigateToHorseDetail(horseId)
            }
        case "routine":
            if let instanceId = pathComponents.first {
                navigateToRoutineFlow(instanceId)
            }
        default:
            break
        }
    }

    // MARK: - Reset

    func resetAll() {
        horsesPath = NavigationPath()
        feedingPath = NavigationPath()
        routinesPath = NavigationPath()
        settingsPath = NavigationPath()
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
                ActivityDetailView(activityId: activityId)
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
