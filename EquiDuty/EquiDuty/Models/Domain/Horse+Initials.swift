//
//  Horse+Initials.swift
//  EquiDuty
//
//  Extension for generating initials from horse names
//  Used for avatar displays when photos are not available
//

import Foundation

extension Horse {
    /// Generates initials from the horse's name
    ///
    /// Logic:
    /// - Single word: First letter only (e.g., "Bella" → "B")
    /// - Multiple words: First letter of first word + first letter of last word (e.g., "Golden Arrow" → "GA")
    /// - Special characters: Handles hyphens and non-letter characters (e.g., "Star-Dancer" → "SD")
    /// - Empty names: Returns empty string (shouldn't happen with required field)
    ///
    /// Examples:
    /// - "Golden Arrow" → "GA"
    /// - "Bella" → "B"
    /// - "Silver Star Magic" → "SM"
    /// - "Star-Dancer" → "SD"
    var initials: String {
        let components = name.split(separator: " ")
        let firstInitial = components.first?.first.map(String.init) ?? ""
        let lastInitial = components.count > 1
            ? components.last?.first.map(String.init) ?? ""
            : ""
        return "\(firstInitial)\(lastInitial)".uppercased()
    }
}
