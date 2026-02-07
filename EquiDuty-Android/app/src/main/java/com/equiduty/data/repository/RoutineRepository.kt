package com.equiduty.data.repository

import com.equiduty.data.remote.api.EquiDutyApi
import com.equiduty.data.remote.dto.*
import com.equiduty.domain.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RoutineRepository @Inject constructor(
    private val api: EquiDutyApi
) {
    private val _templates = MutableStateFlow<List<RoutineTemplate>>(emptyList())
    val templates: StateFlow<List<RoutineTemplate>> = _templates.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    suspend fun fetchTemplates(orgId: String) {
        _isLoading.value = true
        try {
            val response = api.getRoutineTemplates(orgId = orgId)
            _templates.value = response.routineTemplates.map { it.toDomain() }
        } catch (e: Exception) {
            Timber.e(e, "Failed to fetch routine templates")
            throw e
        } finally {
            _isLoading.value = false
        }
    }

    suspend fun getInstances(stableId: String, date: String? = null): List<RoutineInstance> {
        val response = api.getRoutineInstances(stableId = stableId, date = date)
        return response.routineInstances.map { it.toDomain() }
    }

    suspend fun startInstance(instanceId: String): RoutineInstance {
        val response = api.startRoutineInstance(instanceId)
        return response.toDomain()
    }

    suspend fun completeStep(instanceId: String, stepId: String, body: CompleteStepDto): RoutineInstance {
        val response = api.completeRoutineStep(instanceId, stepId, body)
        return response.toDomain()
    }

    suspend fun completeInstance(instanceId: String): RoutineInstance {
        val response = api.completeRoutineInstance(instanceId)
        return response.toDomain()
    }

    suspend fun getDailyNotes(stableId: String, date: String): DailyNotes? {
        return try {
            val response = api.getDailyNotes(stableId = stableId, date = date)
            response.dailyNotes?.toDomain()
        } catch (e: Exception) {
            Timber.w(e, "Failed to load daily notes")
            null
        }
    }
}

// ── DTO → Domain Mappers ─────────────────────────────────────────

fun RoutineTemplateDto.toDomain(): RoutineTemplate = RoutineTemplate(
    id = id,
    organizationId = organizationId,
    stableId = stableId,
    name = name,
    description = description,
    type = RoutineType.fromValue(type),
    icon = icon,
    color = color,
    defaultStartTime = defaultStartTime,
    estimatedDuration = estimatedDuration,
    steps = steps.map { it.toDomain() },
    requiresNotesRead = requiresNotesRead,
    allowSkipSteps = allowSkipSteps,
    pointsValue = pointsValue,
    createdAt = createdAt,
    createdBy = createdBy,
    updatedAt = updatedAt,
    updatedBy = updatedBy,
    isActive = isActive
)

fun RoutineStepDto.toDomain(): RoutineStep = RoutineStep(
    id = id,
    order = order,
    name = name,
    description = description,
    category = RoutineCategory.fromValue(category),
    icon = icon,
    horseContext = RoutineStepHorseContext.fromValue(horseContext),
    horseFilter = horseFilter?.toDomain(),
    showFeeding = showFeeding ?: false,
    showMedication = showMedication ?: false,
    showSpecialInstructions = showSpecialInstructions ?: false,
    showBlanketStatus = showBlanketStatus ?: false,
    requiresConfirmation = requiresConfirmation,
    allowPartialCompletion = allowPartialCompletion,
    allowPhotoEvidence = allowPhotoEvidence ?: false,
    estimatedMinutes = estimatedMinutes,
    feedingTimeId = feedingTimeId
)

fun RoutineStepHorseFilterDto.toDomain(): RoutineStepHorseFilter = RoutineStepHorseFilter(
    horseIds = horseIds,
    groupIds = groupIds,
    locationIds = locationIds,
    excludeHorseIds = excludeHorseIds
)

fun EmbeddedRoutineTemplateDto.toDomain(): EmbeddedRoutineTemplate = EmbeddedRoutineTemplate(
    name = name,
    description = description,
    type = RoutineType.fromValue(type),
    icon = icon,
    color = color,
    estimatedDuration = estimatedDuration,
    requiresNotesRead = requiresNotesRead,
    allowSkipSteps = allowSkipSteps,
    steps = steps.map { it.toDomain() }
)

fun RoutineInstanceDto.toDomain(): RoutineInstance = RoutineInstance(
    id = id,
    templateId = templateId,
    templateName = templateName,
    organizationId = organizationId,
    stableId = stableId,
    stableName = stableName,
    template = template?.toDomain(),
    scheduledDate = scheduledDate,
    scheduledStartTime = scheduledStartTime,
    estimatedDuration = estimatedDuration,
    assignedTo = assignedTo,
    assignedToName = assignedToName,
    assignmentType = RoutineAssignmentType.fromValue(assignmentType),
    assignedAt = assignedAt,
    assignedBy = assignedBy,
    status = RoutineInstanceStatus.fromValue(status),
    startedAt = startedAt,
    startedBy = startedBy,
    startedByName = startedByName,
    completedAt = completedAt,
    completedBy = completedBy,
    completedByName = completedByName,
    cancelledAt = cancelledAt,
    cancelledBy = cancelledBy,
    cancellationReason = cancellationReason,
    currentStepId = currentStepId,
    currentStepOrder = currentStepOrder,
    progress = progress.toDomain(),
    pointsValue = pointsValue,
    pointsAwarded = pointsAwarded,
    isHolidayShift = isHolidayShift,
    dailyNotesAcknowledged = dailyNotesAcknowledged,
    dailyNotesAcknowledgedAt = dailyNotesAcknowledgedAt,
    notes = notes,
    createdAt = createdAt,
    createdBy = createdBy,
    updatedAt = updatedAt,
    updatedBy = updatedBy
)

fun RoutineProgressDto.toDomain(): RoutineProgress = RoutineProgress(
    stepsCompleted = stepsCompleted,
    stepsTotal = stepsTotal,
    percentComplete = percentComplete,
    stepProgress = stepProgress.mapValues { (key, v) ->
        StepProgress(
            stepId = key,
            status = StepStatus.fromValue(v.status),
            startedAt = v.startedAt,
            completedAt = v.completedAt,
            generalNotes = v.generalNotes,
            photoUrls = v.photoUrls,
            horseProgress = v.horseProgress?.mapValues { (_, hp) ->
                HorseStepProgress(
                    horseId = hp.horseId,
                    horseName = hp.horseName,
                    completed = hp.completed,
                    skipped = hp.skipped,
                    skipReason = hp.skipReason,
                    notes = hp.notes,
                    photoUrls = hp.photoUrls,
                    feedingConfirmed = hp.feedingConfirmed,
                    medicationGiven = hp.medicationGiven,
                    medicationSkipped = hp.medicationSkipped,
                    blanketAction = BlanketAction.fromValue(hp.blanketAction),
                    completedAt = hp.completedAt,
                    completedBy = hp.completedBy
                )
            },
            horsesCompleted = v.horsesCompleted,
            horsesTotal = v.horsesTotal
        )
    }
)

fun DailyNotesDto.toDomain(): DailyNotes = DailyNotes(
    id = id,
    organizationId = organizationId,
    stableId = stableId,
    date = date,
    generalNotes = generalNotes,
    weatherNotes = weatherNotes,
    horseNotes = horseNotes.map { it.toDomain() },
    alerts = alerts.map { it.toDomain() },
    createdAt = createdAt,
    updatedAt = updatedAt,
    lastUpdatedBy = lastUpdatedBy,
    lastUpdatedByName = lastUpdatedByName
)

fun HorseDailyNoteDto.toDomain(): HorseDailyNote = HorseDailyNote(
    id = id,
    horseId = horseId,
    horseName = horseName,
    note = note,
    priority = NotePriority.fromValue(priority),
    category = DailyNoteCategory.fromValue(category),
    createdAt = createdAt,
    createdBy = createdBy,
    createdByName = createdByName
)

fun DailyAlertDto.toDomain(): DailyAlert = DailyAlert(
    id = id,
    title = title,
    message = message,
    priority = NotePriority.fromValue(priority),
    affectedHorseIds = affectedHorseIds,
    affectedHorseNames = affectedHorseNames,
    expiresAt = expiresAt,
    createdAt = createdAt,
    createdBy = createdBy,
    createdByName = createdByName
)
