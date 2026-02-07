package com.equiduty.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class RoutineStepHorseFilterDto(
    val horseIds: List<String>? = null,
    val groupIds: List<String>? = null,
    val locationIds: List<String>? = null,
    val excludeHorseIds: List<String>? = null
)

@Serializable
data class RoutineStepDto(
    val id: String,
    val order: Int,
    val name: String,
    val description: String? = null,
    val category: String,
    val icon: String? = null,
    val horseContext: String = "all",
    val horseFilter: RoutineStepHorseFilterDto? = null,
    val showFeeding: Boolean? = null,
    val showMedication: Boolean? = null,
    val showSpecialInstructions: Boolean? = null,
    val showBlanketStatus: Boolean? = null,
    val requiresConfirmation: Boolean = false,
    val allowPartialCompletion: Boolean = false,
    val allowPhotoEvidence: Boolean? = null,
    val estimatedMinutes: Int? = null,
    val feedingTimeId: String? = null
)

@Serializable
data class RoutineTemplateDto(
    val id: String,
    val organizationId: String,
    val stableId: String? = null,
    val name: String,
    val description: String? = null,
    val type: String = "custom",
    val icon: String? = null,
    val color: String? = null,
    val defaultStartTime: String = "07:00",
    val estimatedDuration: Int = 60,
    val steps: List<RoutineStepDto> = emptyList(),
    val requiresNotesRead: Boolean = false,
    val allowSkipSteps: Boolean = false,
    val pointsValue: Int = 1,
    val createdAt: String = "",
    val createdBy: String = "",
    val updatedAt: String = "",
    val updatedBy: String? = null,
    val isActive: Boolean = true
)

@Serializable
data class RoutineTemplatesResponseDto(
    val routineTemplates: List<RoutineTemplateDto>
)

@Serializable
data class HorseStepProgressDto(
    val horseId: String,
    val horseName: String = "",
    val completed: Boolean = false,
    val skipped: Boolean = false,
    val skipReason: String? = null,
    val notes: String? = null,
    val photoUrls: List<String>? = null,
    val feedingConfirmed: Boolean? = null,
    val medicationGiven: Boolean? = null,
    val medicationSkipped: Boolean? = null,
    val blanketAction: String? = null,
    val completedAt: String? = null,
    val completedBy: String? = null
)

@Serializable
data class StepProgressDto(
    val stepId: String,
    val status: String = "pending",
    val startedAt: String? = null,
    val completedAt: String? = null,
    val generalNotes: String? = null,
    val photoUrls: List<String>? = null,
    val horseProgress: Map<String, HorseStepProgressDto>? = null,
    val horsesCompleted: Int? = null,
    val horsesTotal: Int? = null
)

@Serializable
data class RoutineProgressDto(
    val stepsCompleted: Int = 0,
    val stepsTotal: Int = 0,
    val percentComplete: Double = 0.0,
    val stepProgress: Map<String, StepProgressDto> = emptyMap()
)

@Serializable
data class EmbeddedRoutineTemplateDto(
    val name: String,
    val description: String? = null,
    val type: String = "custom",
    val icon: String? = null,
    val color: String? = null,
    val estimatedDuration: Int = 60,
    val requiresNotesRead: Boolean = false,
    val allowSkipSteps: Boolean = false,
    val steps: List<RoutineStepDto> = emptyList()
)

@Serializable
data class RoutineInstanceDto(
    val id: String,
    val templateId: String,
    val templateName: String = "",
    val organizationId: String,
    val stableId: String,
    val stableName: String? = null,
    val template: EmbeddedRoutineTemplateDto? = null,
    val scheduledDate: String,
    val scheduledStartTime: String = "07:00",
    val estimatedDuration: Int = 60,
    val assignedTo: String? = null,
    val assignedToName: String? = null,
    val assignmentType: String = "unassigned",
    val assignedAt: String? = null,
    val assignedBy: String? = null,
    val status: String = "scheduled",
    val startedAt: String? = null,
    val startedBy: String? = null,
    val startedByName: String? = null,
    val completedAt: String? = null,
    val completedBy: String? = null,
    val completedByName: String? = null,
    val cancelledAt: String? = null,
    val cancelledBy: String? = null,
    val cancellationReason: String? = null,
    val currentStepId: String? = null,
    val currentStepOrder: Int? = null,
    val progress: RoutineProgressDto = RoutineProgressDto(),
    val pointsValue: Int = 1,
    val pointsAwarded: Int? = null,
    val isHolidayShift: Boolean? = null,
    val dailyNotesAcknowledged: Boolean = false,
    val dailyNotesAcknowledgedAt: String? = null,
    val notes: String? = null,
    val createdAt: String = "",
    val createdBy: String = "",
    val updatedAt: String = "",
    val updatedBy: String? = null
)

@Serializable
data class RoutineInstancesResponseDto(
    val routineInstances: List<RoutineInstanceDto>
)

@Serializable
data class CompleteStepDto(
    val horseProgress: Map<String, HorseStepProgressDto>? = null,
    val generalNotes: String? = null,
    val photoUrls: List<String>? = null
)

// ── Daily Notes ──────────────────────────────────────────────────

@Serializable
data class HorseDailyNoteDto(
    val id: String,
    val horseId: String,
    val horseName: String = "",
    val note: String,
    val priority: String = "info",
    val category: String? = null,
    val createdAt: String = "",
    val createdBy: String = "",
    val createdByName: String? = null
)

@Serializable
data class DailyAlertDto(
    val id: String,
    val title: String,
    val message: String,
    val priority: String = "info",
    val affectedHorseIds: List<String>? = null,
    val affectedHorseNames: List<String>? = null,
    val expiresAt: String? = null,
    val createdAt: String = "",
    val createdBy: String = "",
    val createdByName: String? = null
)

@Serializable
data class DailyNotesDto(
    val id: String,
    val organizationId: String,
    val stableId: String,
    val date: String,
    val generalNotes: String? = null,
    val weatherNotes: String? = null,
    val horseNotes: List<HorseDailyNoteDto> = emptyList(),
    val alerts: List<DailyAlertDto> = emptyList(),
    val createdAt: String = "",
    val updatedAt: String = "",
    val lastUpdatedBy: String = "",
    val lastUpdatedByName: String? = null
)

@Serializable
data class DailyNotesResponseDto(
    val dailyNotes: DailyNotesDto? = null
)
