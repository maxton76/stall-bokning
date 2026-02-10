//
//  MainTabView.swift
//  EquiDuty
//
//  Main tab navigation for authenticated users
//
//  NAVIGATION PATTERN:
//  - Each tab maintains its own NavigationStack (iOS best practice for TabView)
//  - NavigationRouter.shared manages selectedTab for programmatic tab switching
//  - Deep links handled via router.handleDeepLink(_:)
//  - Use NavigationLink(value: AppDestination.xxx) + withAppNavigationDestinations()
//

import SwiftUI

/// Main tab bar navigation
struct MainTabView: View {
    /// Navigation router for programmatic navigation and deep linking
    @State private var router = NavigationRouter.shared
    /// Notification state
    @State private var notificationViewModel = NotificationViewModel()

    /// Tab metadata for display (titles and icons)
    private struct TabInfo {
        let title: String
        let icon: String
        let selectedIcon: String

        static func forTab(_ tab: AppTab) -> TabInfo {
            switch tab {
            case .today: return TabInfo(
                title: String(localized: "tab.today"),
                icon: "calendar",
                selectedIcon: "calendar.circle.fill"
            )
            case .horses: return TabInfo(
                title: String(localized: "tab.horses"),
                icon: "figure.equestrian.sports",
                selectedIcon: "figure.equestrian.sports"
            )
            case .feeding: return TabInfo(
                title: String(localized: "tab.feeding"),
                icon: "leaf.fill",
                selectedIcon: "leaf.fill"
            )
            case .routines: return TabInfo(
                title: String(localized: "tab.routines"),
                icon: "checklist",
                selectedIcon: "checklist.checked"
            )
            case .settings: return TabInfo(
                title: String(localized: "tab.settings"),
                icon: "gearshape.fill",
                selectedIcon: "gearshape.fill"
            )
            }
        }
    }

    var body: some View {
        TabView(selection: $router.selectedTab) {
            TodayView()
                .tabItem {
                    let info = TabInfo.forTab(.today)
                    Label(info.title, systemImage: router.selectedTab == .today ? info.selectedIcon : info.icon)
                }
                .tag(AppTab.today)

            HorseListView()
                .tabItem {
                    let info = TabInfo.forTab(.horses)
                    Label(info.title, systemImage: router.selectedTab == .horses ? info.selectedIcon : info.icon)
                }
                .tag(AppTab.horses)

            FeedingTodayView()
                .tabItem {
                    let info = TabInfo.forTab(.feeding)
                    Label(info.title, systemImage: router.selectedTab == .feeding ? info.selectedIcon : info.icon)
                }
                .tag(AppTab.feeding)

            RoutineListView()
                .tabItem {
                    let info = TabInfo.forTab(.routines)
                    Label(info.title, systemImage: router.selectedTab == .routines ? info.selectedIcon : info.icon)
                }
                .tag(AppTab.routines)

            SettingsView()
                .tabItem {
                    let info = TabInfo.forTab(.settings)
                    Label(info.title, systemImage: router.selectedTab == .settings ? info.selectedIcon : info.icon)
                }
                .tag(AppTab.settings)
        }
        .tint(.accentColor)
        .environment(notificationViewModel)
        .task {
            await notificationViewModel.refreshUnreadCount()
        }
    }
}

#Preview {
    MainTabView()
}
