package com.equiduty.domain.model

data class RoutineTemplate(
    val id: String,
    val organizationId: String,
    val stableId: String?,
    val name: String,
    val description: String?,
    val type: RoutineType,
    val icon: String?,
    val color: String?,
    val defaultStartTime: String,
    val estimatedDuration: Int,
    val steps: List<RoutineStep>,
    val requiresNotesRead: Boolean,
    val allowSkipSteps: Boolean,
    val pointsValue: Int,
    val createdAt: String,
    val createdBy: String,
    val updatedAt: String,
    val updatedBy: String?,
    val isActive: Boolean
)

data class RoutineStep(
    val id: String,
    val order: Int,
    val name: String,
    val description: String?,
    val category: RoutineCategory,
    val icon: String?,
    val horseContext: RoutineStepHorseContext,
    val horseFilter: RoutineStepHorseFilter?,
    val showFeeding: Boolean,
    val showMedication: Boolean,
    val showSpecialInstructions: Boolean,
    val showBlanketStatus: Boolean,
    val requiresConfirmation: Boolean,
    val allowPartialCompletion: Boolean,
    val allowPhotoEvidence: Boolean,
    val estimatedMinutes: Int?,
    val feedingTimeId: String?
) {
    val displayIcon: String get() = icon ?: category.icon
}

data class RoutineStepHorseFilter(
    val horseIds: List<String>?,
    val groupIds: List<String>?,
    val locationIds: List<String>?,
    val excludeHorseIds: List<String>?
)

data class RoutineInstance(
    val id: String,
    val templateId: String,
    val templateName: String,
    val organizationId: String,
    val stableId: String,
    val stableName: String?,
    val template: EmbeddedRoutineTemplate?,
    val scheduledDate: String,
    val scheduledStartTime: String,
    val estimatedDuration: Int,
    val assignedTo: String?,
    val assignedToName: String?,
    val assignmentType: RoutineAssignmentType,
    val assignedAt: String?,
    val assignedBy: String?,
    val status: RoutineInstanceStatus,
    val startedAt: String?,
    val startedBy: String?,
    val startedByName: String?,
    val completedAt: String?,
    val completedBy: String?,
    val completedByName: String?,
    val cancelledAt: String?,
    val cancelledBy: String?,
    val cancellationReason: String?,
    val currentStepId: String?,
    val currentStepOrder: Int?,
    val progress: RoutineProgress,
    val pointsValue: Int,
    val pointsAwarded: Int?,
    val isHolidayShift: Boolean?,
    val dailyNotesAcknowledged: Boolean,
    val dailyNotesAcknowledgedAt: String?,
    val notes: String?,
    val createdAt: String,
    val createdBy: String,
    val updatedAt: String,
    val updatedBy: String?
)

data class EmbeddedRoutineTemplate(
    val name: String,
    val description: String?,
    val type: RoutineType,
    val icon: String?,
    val color: String?,
    val estimatedDuration: Int,
    val requiresNotesRead: Boolean,
    val allowSkipSteps: Boolean,
    val steps: List<RoutineStep>
)

data class RoutineProgress(
    val stepsCompleted: Int,
    val stepsTotal: Int,
    val percentComplete: Double,
    val stepProgress: Map<String, StepProgress>
) {
    val isComplete: Boolean get() = stepsCompleted == stepsTotal
}

data class StepProgress(
    val stepId: String,
    val status: StepStatus,
    val startedAt: String?,
    val completedAt: String?,
    val generalNotes: String?,
    val photoUrls: List<String>?,
    val horseProgress: Map<String, HorseStepProgress>?,
    val horsesCompleted: Int?,
    val horsesTotal: Int?
)

data class HorseStepProgress(
    val horseId: String,
    val horseName: String,
    val completed: Boolean,
    val skipped: Boolean,
    val skipReason: String?,
    val notes: String?,
    val photoUrls: List<String>?,
    val feedingConfirmed: Boolean?,
    val medicationGiven: Boolean?,
    val medicationSkipped: Boolean?,
    val blanketAction: BlanketAction?,
    val completedAt: String?,
    val completedBy: String?
)

enum class RoutineCategory(val value: String, val icon: String) {
    PREPARATION("preparation", "clipboard"),
    FEEDING("feeding", "leaf"),
    MEDICATION("medication", "pills"),
    BLANKET("blanket", "cloud_snow"),
    TURNOUT("turnout", "sun"),
    BRING_IN("bring_in", "house"),
    MUCKING("mucking", "trash"),
    WATER("water", "drop"),
    HEALTH_CHECK("health_check", "heart"),
    SAFETY("safety", "shield"),
    CLEANING("cleaning", "sparkles"),
    OTHER("other", "ellipsis");

    companion object {
        fun fromValue(value: String): RoutineCategory =
            entries.find { it.value == value } ?: OTHER
    }
}

enum class RoutineType(val value: String) {
    MORNING("morning"), MIDDAY("midday"), EVENING("evening"), CUSTOM("custom");

    companion object {
        fun fromValue(value: String): RoutineType =
            entries.find { it.value == value } ?: CUSTOM
    }
}

enum class RoutineStepHorseContext(val value: String) {
    ALL("all"), SPECIFIC("specific"), GROUPS("groups"), NONE("none");

    companion object {
        fun fromValue(value: String): RoutineStepHorseContext =
            entries.find { it.value == value } ?: ALL
    }
}

enum class RoutineInstanceStatus(val value: String) {
    SCHEDULED("scheduled"), STARTED("started"), IN_PROGRESS("in_progress"),
    COMPLETED("completed"), MISSED("missed"), CANCELLED("cancelled");

    companion object {
        fun fromValue(value: String): RoutineInstanceStatus =
            entries.find { it.value == value } ?: SCHEDULED
    }
}

enum class RoutineAssignmentType(val value: String) {
    AUTO("auto"), MANUAL("manual"),
    SELF_ASSIGNED("self"), UNASSIGNED("unassigned"), UNKNOWN("unknown");

    companion object {
        fun fromValue(value: String): RoutineAssignmentType =
            entries.find { it.value == value } ?: UNKNOWN
    }
}

enum class StepStatus(val value: String) {
    PENDING("pending"), IN_PROGRESS("in_progress"),
    COMPLETED("completed"), SKIPPED("skipped");

    companion object {
        fun fromValue(value: String): StepStatus =
            entries.find { it.value == value } ?: PENDING
    }
}

enum class BlanketAction(val value: String) {
    ON("on"), OFF("off"), UNCHANGED("unchanged");

    companion object {
        fun fromValue(value: String?): BlanketAction? =
            value?.let { v -> entries.find { it.value == v } }
    }
}
