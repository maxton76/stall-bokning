package com.equiduty.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class HealthRecordDto(
    val id: String,
    val horseId: String,
    val horseName: String? = null,
    val professionalType: String, // "veterinary", "farrier", "dentist", "other"
    val professionalName: String? = null,
    val date: String,
    val type: String, // "examination", "treatment", "surgery", "followup", "other"
    val title: String,
    val description: String? = null,
    val diagnosis: String? = null,
    val treatment: String? = null,
    val medications: List<String>? = null,
    val cost: Double? = null,
    val followupDate: String? = null,
    val followupNotes: String? = null,
    val attachments: List<String>? = null,
    val createdAt: String = "",
    val createdBy: String = "",
    val updatedAt: String = "",
    val updatedBy: String? = null
)

@Serializable
data class HealthRecordsResponseDto(
    val records: List<HealthRecordDto>
)

@Serializable
data class HealthRecordStatsDto(
    val totalRecords: Int,
    val recordsByType: Map<String, Int>,
    val recordsByProfessional: Map<String, Int>,
    val totalCost: Double,
    val lastVisit: String? = null,
    val upcomingFollowups: Int
)

@Serializable
data class HealthRecordStatsResponseDto(
    val stats: HealthRecordStatsDto
)

@Serializable
data class UpcomingFollowupDto(
    val recordId: String,
    val horseId: String,
    val horseName: String? = null,
    val professionalType: String,
    val followupDate: String,
    val followupNotes: String? = null,
    val originalTitle: String
)

@Serializable
data class UpcomingFollowupsResponseDto(
    val followups: List<UpcomingFollowupDto>
)

@Serializable
data class CreateHealthRecordDto(
    val horseId: String,
    val professionalType: String,
    val professionalName: String? = null,
    val date: String,
    val type: String,
    val title: String,
    val description: String? = null,
    val diagnosis: String? = null,
    val treatment: String? = null,
    val medications: List<String>? = null,
    val cost: Double? = null,
    val followupDate: String? = null,
    val followupNotes: String? = null,
    val attachments: List<String>? = null
)

@Serializable
data class UpdateHealthRecordDto(
    val professionalType: String? = null,
    val professionalName: String? = null,
    val date: String? = null,
    val type: String? = null,
    val title: String? = null,
    val description: String? = null,
    val diagnosis: String? = null,
    val treatment: String? = null,
    val medications: List<String>? = null,
    val cost: Double? = null,
    val followupDate: String? = null,
    val followupNotes: String? = null,
    val attachments: List<String>? = null
)
