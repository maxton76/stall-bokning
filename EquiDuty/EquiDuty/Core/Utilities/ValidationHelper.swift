//
//  ValidationHelper.swift
//  EquiDuty
//
//  Form validation helpers
//

import Foundation

struct ValidationError: Identifiable {
    let id = UUID()
    let field: String
    let message: String
}

enum ValidationHelper {
    /// Validate template name
    static func validateTemplateName(_ name: String) -> ValidationError? {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)

        if trimmed.isEmpty {
            return ValidationError(
                field: "name",
                message: String(localized: "errors.validation.field_required")
            )
        }

        if trimmed.count < 3 {
            return ValidationError(
                field: "name",
                message: String(localized: "errors.validation.name_too_short")
            )
        }

        return nil
    }

    /// Validate template has at least one step
    static func validateTemplateSteps(_ steps: [Any]) -> ValidationError? {
        if steps.isEmpty {
            return ValidationError(
                field: "steps",
                message: String(localized: "errors.validation.steps_required")
            )
        }
        return nil
    }

    /// Validate schedule date range
    static func validateDateRange(start: Date, end: Date) -> ValidationError? {
        if end <= start {
            return ValidationError(
                field: "endDate",
                message: String(localized: "errors.validation.date_range")
            )
        }

        let calendar = Calendar.current
        let days = calendar.dateComponents([.day], from: start, to: end).day ?? 0

        if days > 90 {
            return ValidationError(
                field: "endDate",
                message: String(localized: "errors.validation.date_range_too_long")
            )
        }

        return nil
    }

    /// Validate days of week selection for weekly schedules
    static func validateRepeatDays(_ days: [Int]?) -> ValidationError? {
        guard let days = days else { return nil }

        if days.isEmpty {
            return ValidationError(
                field: "repeatDays",
                message: String(localized: "errors.validation.days_required")
            )
        }

        return nil
    }
}
