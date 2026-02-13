package com.equiduty.domain.model

data class HealthRecord(
    val id: String,
    val horseId: String,
    val horseName: String?,
    val professionalType: HealthProfessionalType,
    val professionalName: String?,
    val date: String,
    val type: HealthRecordType,
    val title: String,
    val description: String?,
    val diagnosis: String?,
    val treatment: String?,
    val medications: List<String>?,
    val cost: Double?,
    val followupDate: String?,
    val followupNotes: String?,
    val attachments: List<String>?,
    val createdAt: String,
    val createdBy: String,
    val updatedAt: String,
    val updatedBy: String?
)

enum class HealthProfessionalType(val value: String) {
    VETERINARY("veterinary"),
    FARRIER("farrier"),
    DENTIST("dentist"),
    OTHER("other");

    companion object {
        fun fromValue(value: String): HealthProfessionalType =
            entries.find { it.value == value } ?: OTHER
    }
}

enum class HealthRecordType(val value: String) {
    EXAMINATION("examination"),
    TREATMENT("treatment"),
    SURGERY("surgery"),
    FOLLOWUP("followup"),
    OTHER("other");

    companion object {
        fun fromValue(value: String): HealthRecordType =
            entries.find { it.value == value } ?: OTHER
    }
}

data class HealthRecordStats(
    val totalRecords: Int,
    val recordsByType: Map<String, Int>,
    val recordsByProfessional: Map<String, Int>,
    val totalCost: Double,
    val lastVisit: String?,
    val upcomingFollowups: Int
)

data class UpcomingFollowup(
    val recordId: String,
    val horseId: String,
    val horseName: String?,
    val professionalType: HealthProfessionalType,
    val followupDate: String,
    val followupNotes: String?,
    val originalTitle: String
)
