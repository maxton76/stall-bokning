//
//  UserDefaultsKeys.swift
//  EquiDuty
//
//  UserDefaults keys and helpers for app-wide settings persistence
//

import Foundation
import SwiftUI

/// User-selectable appearance theme
enum AppTheme: String, CaseIterable {
    case system
    case light
    case dark

    /// Maps to SwiftUI's ColorScheme (nil = follow system)
    var colorScheme: ColorScheme? {
        switch self {
        case .system: nil
        case .light: .light
        case .dark: .dark
        }
    }

    var displayName: String {
        switch self {
        case .system: String(localized: "appearance.option.system")
        case .light: String(localized: "appearance.option.light")
        case .dark: String(localized: "appearance.option.dark")
        }
    }
}

extension UserDefaults {
    private enum Keys {
        static let horsesShowOwnedOnly = "horses.showOwnedOnly"
    }

    /// Horse list toggle state - whether to show only owned horses or all stable horses
    /// Only relevant for users with privileged roles (administrator, stable_manager, groom)
    var horsesShowOwnedOnly: Bool {
        get { bool(forKey: Keys.horsesShowOwnedOnly) }
        set { set(newValue, forKey: Keys.horsesShowOwnedOnly) }
    }
}
