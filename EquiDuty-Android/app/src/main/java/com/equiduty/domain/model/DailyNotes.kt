package com.equiduty.domain.model

data class DailyNotes(
    val id: String,
    val organizationId: String,
    val stableId: String,
    val date: String,
    val generalNotes: String?,
    val weatherNotes: String?,
    val horseNotes: List<HorseDailyNote>,
    val alerts: List<DailyAlert>,
    val createdAt: String,
    val updatedAt: String,
    val lastUpdatedBy: String,
    val lastUpdatedByName: String?
)

data class HorseDailyNote(
    val id: String,
    val horseId: String,
    val horseName: String,
    val note: String,
    val priority: NotePriority,
    val category: DailyNoteCategory,
    val createdAt: String,
    val createdBy: String,
    val createdByName: String?
)

data class DailyAlert(
    val id: String,
    val title: String,
    val message: String,
    val priority: NotePriority,
    val affectedHorseIds: List<String>?,
    val affectedHorseNames: List<String>?,
    val expiresAt: String?,
    val createdAt: String,
    val createdBy: String,
    val createdByName: String?
)

enum class NotePriority(val value: String) {
    INFO("info"), WARNING("warning"), CRITICAL("critical");

    companion object {
        fun fromValue(value: String): NotePriority =
            entries.find { it.value == value } ?: INFO
    }
}

enum class DailyNoteCategory(val value: String) {
    MEDICATION("medication"), HEALTH("health"), FEEDING("feeding"),
    BLANKET("blanket"), BEHAVIOR("behavior"), OTHER("other");

    companion object {
        fun fromValue(value: String?): DailyNoteCategory =
            value?.let { v -> entries.find { it.value == v } } ?: OTHER
    }
}
