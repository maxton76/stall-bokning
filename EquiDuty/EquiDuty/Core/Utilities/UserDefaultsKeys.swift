//
//  UserDefaultsKeys.swift
//  EquiDuty
//
//  UserDefaults keys and helpers for app-wide settings persistence
//

import Foundation

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
