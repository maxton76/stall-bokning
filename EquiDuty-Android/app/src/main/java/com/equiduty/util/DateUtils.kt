package com.equiduty.util

import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException

object DateUtils {
    private val isoFormatter = DateTimeFormatter.ISO_INSTANT
    private val dateFormatter = DateTimeFormatter.ISO_LOCAL_DATE
    private val stockholmZone = ZoneId.of("Europe/Stockholm")

    fun parseIso(dateString: String?): Instant? {
        if (dateString == null) return null
        return try {
            Instant.parse(dateString)
        } catch (e: DateTimeParseException) {
            null
        }
    }

    fun parseLocalDate(dateString: String?): LocalDate? {
        if (dateString == null) return null
        return try {
            LocalDate.parse(dateString, dateFormatter)
        } catch (e: DateTimeParseException) {
            null
        }
    }

    fun toLocalDateTime(instant: Instant?, zone: ZoneId = stockholmZone): LocalDateTime? {
        return instant?.atZone(zone)?.toLocalDateTime()
    }

    fun formatIso(instant: Instant): String = isoFormatter.format(instant)

    fun formatDate(date: LocalDate): String = dateFormatter.format(date)

    fun today(): LocalDate = LocalDate.now(stockholmZone)
}
