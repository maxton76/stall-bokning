package com.equiduty.ui.utils

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException

/**
 * Shared date validation utility for ISO 8601 date format (YYYY-MM-DD).
 *
 * Use this for all date inputs to ensure consistent validation before sending to API.
 */
object DateValidation {
    private val isoFormatter = DateTimeFormatter.ISO_LOCAL_DATE

    /**
     * Validates that a date string is in ISO 8601 format (YYYY-MM-DD).
     *
     * @param dateStr The date string to validate
     * @return true if valid or blank (blank = optional), false otherwise
     */
    fun isValidDate(dateStr: String): Boolean {
        if (dateStr.isBlank()) return true  // Optional dates are valid
        return try {
            LocalDate.parse(dateStr, isoFormatter)
            true
        } catch (e: DateTimeParseException) {
            false
        }
    }

    /**
     * Validates and returns the date string if valid, null otherwise.
     *
     * @param dateStr The date string to validate
     * @return The date string if valid or blank, null if invalid
     */
    fun validateDateOrNull(dateStr: String): String? {
        return if (dateStr.isBlank() || isValidDate(dateStr)) dateStr else null
    }

    /**
     * Validates multiple dates and returns error message if any are invalid.
     *
     * @param dates Map of field label to date string
     * @return Error message for first invalid date, or null if all valid
     */
    fun validateDates(dates: Map<String, String>): String? {
        for ((label, dateStr) in dates) {
            if (dateStr.isNotBlank() && !isValidDate(dateStr)) {
                return "Ogiltigt $label. Använd ÅÅÅÅ-MM-DD"
            }
        }
        return null
    }
}
