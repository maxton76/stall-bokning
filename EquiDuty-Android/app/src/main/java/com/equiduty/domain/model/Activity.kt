package com.equiduty.domain.model

data class ActivityInstance(
    val id: String,
    val organizationId: String?,
    val stableId: String?,
    val stableName: String?,
    val activityTypeId: String?,
    val activityTypeName: String,
    val activityTypeCategory: ActivityTypeCategory,
    val activityTypeColor: String?,
    val scheduledDate: String,
    val scheduledTime: String?,
    val duration: Int?,
    val horseIds: List<String>,
    val horseNames: List<String>,
    val assignedTo: String?,
    val assignedToName: String?,
    val status: ActivityInstanceStatus,
    val startedAt: String?,
    val completedAt: String?,
    val completedBy: String?,
    val completedByName: String?,
    val notes: String?,
    val photoUrls: List<String>?,
    val contactId: String?,
    val contactName: String?,
    val createdAt: String,
    val updatedAt: String,
    val createdBy: String
)

enum class ActivityInstanceStatus(val value: String) {
    PENDING("pending"),
    IN_PROGRESS("in_progress"),
    COMPLETED("completed"),
    CANCELLED("cancelled"),
    OVERDUE("overdue");

    companion object {
        fun fromValue(value: String): ActivityInstanceStatus =
            entries.find { it.value == value } ?: PENDING
    }
}

enum class ActivityTypeCategory(val value: String) {
    HEALTH("health"), TRAINING("training"), FARRIER("farrier"),
    VETERINARY("veterinary"), DENTAL("dental"), OTHER("other");

    companion object {
        fun fromValue(value: String?): ActivityTypeCategory {
            if (value == null) return OTHER
            return when (value.lowercase()) {
                "dentist", "dental" -> DENTAL
                "farrier", "hovslagare" -> FARRIER
                "veterinary", "vet", "veterinär" -> VETERINARY
                "training", "träning" -> TRAINING
                "health", "hälsa" -> HEALTH
                else -> OTHER
            }
        }
    }
}
