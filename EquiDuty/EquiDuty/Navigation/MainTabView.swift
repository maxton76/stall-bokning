//
//  MainTabView.swift
//  EquiDuty
//
//  Main tab navigation for authenticated users
//

import SwiftUI

/// Main tab bar navigation
struct MainTabView: View {
    @State private var selectedTab: Tab = .today

    enum Tab: String, CaseIterable {
        case today
        case horses
        case feeding
        case routines
        case settings

        var title: String {
            switch self {
            case .today: return String(localized: "tab.today")
            case .horses: return String(localized: "tab.horses")
            case .feeding: return String(localized: "tab.feeding")
            case .routines: return String(localized: "tab.routines")
            case .settings: return String(localized: "tab.settings")
            }
        }

        var icon: String {
            switch self {
            case .today: return "calendar"
            case .horses: return "pawprint.fill"
            case .feeding: return "leaf.fill"
            case .routines: return "checklist"
            case .settings: return "gearshape.fill"
            }
        }

        var selectedIcon: String {
            switch self {
            case .today: return "calendar.circle.fill"
            case .horses: return "pawprint.fill"
            case .feeding: return "leaf.fill"
            case .routines: return "checklist.checked"
            case .settings: return "gearshape.fill"
            }
        }
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            TodayView()
                .tabItem {
                    Label(Tab.today.title, systemImage: selectedTab == .today ? Tab.today.selectedIcon : Tab.today.icon)
                }
                .tag(Tab.today)

            HorseListView()
                .tabItem {
                    Label(Tab.horses.title, systemImage: selectedTab == .horses ? Tab.horses.selectedIcon : Tab.horses.icon)
                }
                .tag(Tab.horses)

            FeedingTodayView()
                .tabItem {
                    Label(Tab.feeding.title, systemImage: selectedTab == .feeding ? Tab.feeding.selectedIcon : Tab.feeding.icon)
                }
                .tag(Tab.feeding)

            RoutineListView()
                .tabItem {
                    Label(Tab.routines.title, systemImage: selectedTab == .routines ? Tab.routines.selectedIcon : Tab.routines.icon)
                }
                .tag(Tab.routines)

            SettingsView()
                .tabItem {
                    Label(Tab.settings.title, systemImage: selectedTab == .settings ? Tab.settings.selectedIcon : Tab.settings.icon)
                }
                .tag(Tab.settings)
        }
        .tint(.accentColor)
    }
}

#Preview {
    MainTabView()
}
