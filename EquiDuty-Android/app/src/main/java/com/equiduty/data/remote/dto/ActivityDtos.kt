package com.equiduty.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class ActivityInstanceDto(
    val id: String,
    val organizationId: String? = null,
    val stableId: String? = null,
    val stableName: String? = null,
    val activityTypeConfigId: String? = null,
    val activityType: String? = null,
    val activityTypeName: String? = null,
    val activityTypeColor: String? = null,
    val type: String? = null,
    // API uses "date" or "scheduledDate"
    val date: String? = null,
    val scheduledDate: String? = null,
    val scheduledTime: String? = null,
    val duration: Int? = null,
    // Horse assignment - API can send single or array
    val horseId: String? = null,
    val horseName: String? = null,
    val horseIds: List<String>? = null,
    val horseNames: List<String>? = null,
    val assignedTo: String? = null,
    val assignedToName: String? = null,
    val status: String = "pending",
    val startedAt: String? = null,
    val completedAt: String? = null,
    val completedBy: String? = null,
    val completedByName: String? = null,
    // Notes - API uses "note" (singular) or "notes"
    val note: String? = null,
    val notes: String? = null,
    val photoUrls: List<String>? = null,
    val contactId: String? = null,
    val contactName: String? = null,
    val createdAt: String = "",
    val lastModifiedAt: String? = null,
    val updatedAt: String? = null,
    val createdBy: String = ""
) {
    /** Normalized scheduled date from either date or scheduledDate */
    val resolvedDate: String get() = date ?: scheduledDate ?: ""

    /** Normalized horse IDs from single or array */
    val resolvedHorseIds: List<String>
        get() = horseIds?.takeIf { it.isNotEmpty() }
            ?: listOfNotNull(horseId)

    /** Normalized horse names from single or array */
    val resolvedHorseNames: List<String>
        get() = horseNames?.takeIf { it.isNotEmpty() }
            ?: listOfNotNull(horseName)

    /** Normalized notes from note or notes */
    val resolvedNotes: String? get() = notes ?: note

    /** Normalized updatedAt */
    val resolvedUpdatedAt: String get() = updatedAt ?: lastModifiedAt ?: createdAt
}

@Serializable
data class ActivityInstancesResponseDto(
    val activities: List<ActivityInstanceDto>
)

@Serializable
data class CreateActivityDto(
    val stableId: String,
    val activityType: String? = null,
    val date: String,
    val scheduledTime: String? = null,
    val duration: Int? = null,
    val horseIds: List<String>? = null,
    val assignedTo: String? = null,
    val notes: String? = null,
    val contactId: String? = null
)

@Serializable
data class UpdateActivityDto(
    val activityType: String? = null,
    val date: String? = null,
    val scheduledTime: String? = null,
    val duration: Int? = null,
    val horseIds: List<String>? = null,
    val assignedTo: String? = null,
    val notes: String? = null,
    val status: String? = null
)
