//
//  String+RelativeTime.swift
//  EquiDuty
//
//  Converts ISO 8601 date strings to relative time display
//

import Foundation

extension String {
    func relativeTime() -> String {
        let formatters: [ISO8601DateFormatter] = [
            {
                let f = ISO8601DateFormatter()
                f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                return f
            }(),
            {
                let f = ISO8601DateFormatter()
                f.formatOptions = [.withInternetDateTime]
                return f
            }()
        ]

        for formatter in formatters {
            if let date = formatter.date(from: self) {
                let rtf = RelativeDateTimeFormatter()
                rtf.unitsStyle = .short
                return rtf.localizedString(for: date, relativeTo: Date())
            }
        }
        return ""
    }
}
