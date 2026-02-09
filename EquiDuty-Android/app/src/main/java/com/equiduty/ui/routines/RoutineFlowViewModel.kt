package com.equiduty.ui.routines

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.equiduty.data.remote.dto.CompleteStepDto
import com.equiduty.data.repository.AuthRepository
import com.equiduty.data.repository.HorseRepository
import com.equiduty.data.repository.RoutineRepository
import com.equiduty.domain.model.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import java.time.Instant
import javax.inject.Inject

sealed class FlowState {
    data object Loading : FlowState()
    data class DailyNotesAcknowledgment(val notes: DailyNotes) : FlowState()
    data class StepExecution(
        val currentStepIndex: Int,
        val step: RoutineStep,
        val totalSteps: Int,
        val horses: List<Horse>,
        val horseProgressMap: Map<String, HorseStepProgress>
    ) : FlowState() {
        fun canProceed(): Boolean {
            if (horses.isEmpty()) return true
            if (step.allowPartialCompletion) return true

            // All horses must be marked done or skipped
            return horses.all { horse ->
                val progress = horseProgressMap[horse.id]
                progress?.completed == true || progress?.skipped == true
            }
        }

        fun getUnmarkedHorseCount(): Int {
            return horses.count { horse ->
                val progress = horseProgressMap[horse.id]
                progress?.completed != true && progress?.skipped != true
            }
        }

        fun getCompletedHorseCount(): Int {
            return horses.count { horse ->
                val progress = horseProgressMap[horse.id]
                progress?.completed == true || progress?.skipped == true
            }
        }
    }
    data object Completing : FlowState()
    data object Completed : FlowState()
    data class Error(val message: String) : FlowState()
}

@HiltViewModel
class RoutineFlowViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val routineRepository: RoutineRepository,
    private val authRepository: AuthRepository,
    private val horseRepository: HorseRepository
) : ViewModel() {

    private val instanceId: String = savedStateHandle["instanceId"] ?: ""

    private val _flowState = MutableStateFlow<FlowState>(FlowState.Loading)
    val flowState: StateFlow<FlowState> = _flowState.asStateFlow()

    private val _instance = MutableStateFlow<RoutineInstance?>(null)
    val instance: StateFlow<RoutineInstance?> = _instance.asStateFlow()

    private val _dailyNotes = MutableStateFlow<DailyNotes?>(null)
    val dailyNotes: StateFlow<DailyNotes?> = _dailyNotes.asStateFlow()

    private var currentStepIndex = 0
    private var steps: List<RoutineStep> = emptyList()

    init {
        loadRoutine()
    }

    private fun loadRoutine() {
        viewModelScope.launch {
            _flowState.value = FlowState.Loading
            try {
                // First, get the current routine instance to check its status
                val instance = routineRepository.getInstance(instanceId)
                _instance.value = instance

                // Only start the routine if it's in scheduled status
                val finalInstance = if (instance.status == RoutineInstanceStatus.SCHEDULED) {
                    routineRepository.startInstance(instanceId)
                } else {
                    // Already started or in progress, just use existing instance
                    instance
                }
                _instance.value = finalInstance

                // Load daily notes
                val stableId = authRepository.selectedStable.value?.id
                if (stableId != null) {
                    val notes = routineRepository.getDailyNotes(
                        stableId = stableId,
                        date = java.time.LocalDate.now().toString()
                    )
                    _dailyNotes.value = notes

                    // Only show daily notes if routine hasn't been started yet
                    if (instance.status == RoutineInstanceStatus.SCHEDULED &&
                        notes != null &&
                        (notes.horseNotes.isNotEmpty() || notes.alerts.isNotEmpty())) {
                        _flowState.value = FlowState.DailyNotesAcknowledgment(notes)
                        return@launch
                    }
                }

                startStepExecution()
            } catch (e: Exception) {
                Timber.e(e, "Failed to load routine")
                _flowState.value = FlowState.Error("Kunde inte ladda rutin")
            }
        }
    }

    fun acknowledgeDailyNotes() {
        viewModelScope.launch {
            startStepExecution()
        }
    }

    private fun startStepExecution() {
        val instance = _instance.value
        val template = instance?.template

        if (template != null) {
            steps = template.steps.sortedBy { it.order }
        }

        // Find first incomplete step
        val progress = instance?.progress
        currentStepIndex = if (progress != null) {
            steps.indexOfFirst { step ->
                val stepProgress = progress.stepProgress[step.id]
                stepProgress?.status != StepStatus.COMPLETED
            }.takeIf { it >= 0 } ?: 0
        } else {
            0
        }

        moveToCurrentStep()
    }

    private fun moveToCurrentStep() {
        if (currentStepIndex < steps.size) {
            val step = steps[currentStepIndex]
            viewModelScope.launch {
                try {
                    val horses = loadHorsesForStep(step)
                    val existingProgress = _instance.value?.progress?.stepProgress?.get(step.id)
                    val horseProgressMap = existingProgress?.horseProgress?.mapValues { (_, v) -> v }
                        ?: horses.associate { horse ->
                            horse.id to HorseStepProgress(
                                horseId = horse.id,
                                horseName = horse.name,
                                completed = false,
                                skipped = false,
                                skipReason = null,
                                notes = null,
                                photoUrls = emptyList(),
                                feedingConfirmed = null,
                                medicationGiven = null,
                                medicationSkipped = null,
                                blanketAction = null,
                                completedAt = null,
                                completedBy = null
                            )
                        }

                    _flowState.value = FlowState.StepExecution(
                        currentStepIndex = currentStepIndex,
                        step = step,
                        totalSteps = steps.size,
                        horses = horses,
                        horseProgressMap = horseProgressMap
                    )
                } catch (e: Exception) {
                    Timber.e(e, "Failed to load horses for step")
                    _flowState.value = FlowState.Error("Kunde inte ladda hästar")
                }
            }
        } else {
            completeRoutine()
        }
    }

    private suspend fun loadHorsesForStep(step: RoutineStep): List<Horse> {
        val stableId = authRepository.selectedStable.value?.id ?: return emptyList()

        return when (step.horseContext) {
            RoutineStepHorseContext.ALL -> {
                // Ensure horses are fetched for the stable
                try {
                    horseRepository.fetchHorses(stableId)
                    horseRepository.horses.value
                } catch (e: Exception) {
                    Timber.e(e, "Failed to fetch all horses")
                    emptyList()
                }
            }
            RoutineStepHorseContext.SPECIFIC -> {
                val horseIds = step.horseFilter?.horseIds ?: emptyList()
                horseRepository.getHorsesByIds(horseIds)
            }
            RoutineStepHorseContext.GROUPS -> {
                val groupIds = step.horseFilter?.groupIds ?: emptyList()
                // First ensure horses are loaded
                try {
                    horseRepository.fetchHorses(stableId)
                } catch (e: Exception) {
                    Timber.e(e, "Failed to fetch horses for groups")
                }
                horseRepository.getHorsesByGroups(groupIds)
            }
            RoutineStepHorseContext.NONE -> emptyList()
        }
    }

    fun markHorseDone(horseId: String) {
        updateHorseProgress(horseId) { progress ->
            progress.copy(
                completed = true,
                skipped = false,
                completedAt = Instant.now().toString()
            )
        }
    }

    fun markHorseSkipped(horseId: String, reason: String) {
        updateHorseProgress(horseId) { progress ->
            progress.copy(
                completed = false,
                skipped = true,
                skipReason = reason.ifEmpty { null }
            )
        }
    }

    fun updateHorseNotes(horseId: String, notes: String) {
        updateHorseProgress(horseId) { progress ->
            progress.copy(notes = notes.ifEmpty { null })
        }
    }

    fun updateFeedingConfirmation(horseId: String, confirmed: Boolean) {
        updateHorseProgress(horseId) { progress ->
            progress.copy(feedingConfirmed = confirmed)
        }
    }

    fun updateMedicationGiven(horseId: String) {
        updateHorseProgress(horseId) { progress ->
            progress.copy(
                medicationGiven = true,
                medicationSkipped = false
            )
        }
    }

    fun updateMedicationSkipped(horseId: String, reason: String) {
        updateHorseProgress(horseId) { progress ->
            progress.copy(
                medicationGiven = false,
                medicationSkipped = true,
                skipReason = reason
            )
        }
    }

    fun updateBlanketAction(horseId: String, action: BlanketAction) {
        updateHorseProgress(horseId) { progress ->
            progress.copy(blanketAction = action)
        }
    }

    fun markAllRemainingAsDone() {
        val currentState = _flowState.value as? FlowState.StepExecution ?: return
        val updatedMap = currentState.horses.associate { horse ->
            val existing = currentState.horseProgressMap[horse.id]
            if (existing?.completed == true || existing?.skipped == true) {
                horse.id to existing
            } else {
                horse.id to (existing?.copy(
                    completed = true,
                    skipped = false,
                    completedAt = Instant.now().toString()
                ) ?: HorseStepProgress(
                    horseId = horse.id,
                    horseName = horse.name,
                    completed = true,
                    skipped = false,
                    skipReason = null,
                    notes = null,
                    photoUrls = emptyList(),
                    feedingConfirmed = null,
                    medicationGiven = null,
                    medicationSkipped = null,
                    blanketAction = null,
                    completedAt = Instant.now().toString(),
                    completedBy = null
                ))
            }
        }
        _flowState.value = currentState.copy(horseProgressMap = updatedMap)
    }

    private fun updateHorseProgress(
        horseId: String,
        update: (HorseStepProgress) -> HorseStepProgress
    ) {
        val currentState = _flowState.value as? FlowState.StepExecution ?: return
        val currentProgress = currentState.horseProgressMap[horseId]
            ?: HorseStepProgress(
                horseId = horseId,
                horseName = currentState.horses.find { it.id == horseId }?.name ?: "",
                completed = false,
                skipped = false,
                skipReason = null,
                notes = null,
                photoUrls = emptyList(),
                feedingConfirmed = null,
                medicationGiven = null,
                medicationSkipped = null,
                blanketAction = null,
                completedAt = null,
                completedBy = null
            )
        val updatedProgress = update(currentProgress)

        _flowState.value = currentState.copy(
            horseProgressMap = currentState.horseProgressMap + (horseId to updatedProgress)
        )
    }

    fun completeCurrentStep(notes: String? = null) {
        val step = steps.getOrNull(currentStepIndex) ?: return
        val currentState = _flowState.value as? FlowState.StepExecution

        viewModelScope.launch {
            try {
                val horseProgressDtoMap = currentState?.horseProgressMap?.mapValues { (_, progress) ->
                    com.equiduty.data.remote.dto.HorseStepProgressDto(
                        horseId = progress.horseId,
                        horseName = progress.horseName,
                        completed = progress.completed,
                        skipped = progress.skipped,
                        skipReason = progress.skipReason,
                        notes = progress.notes,
                        photoUrls = progress.photoUrls ?: emptyList(),
                        feedingConfirmed = progress.feedingConfirmed,
                        medicationGiven = progress.medicationGiven,
                        medicationSkipped = progress.medicationSkipped,
                        blanketAction = progress.blanketAction?.value,
                        completedAt = progress.completedAt,
                        completedBy = progress.completedBy
                    )
                } ?: emptyMap()

                val updated = routineRepository.completeStep(
                    instanceId = instanceId,
                    stepId = step.id,
                    body = CompleteStepDto(
                        horseProgress = horseProgressDtoMap,
                        generalNotes = notes,
                        photoUrls = emptyList() // TODO: Phase 6
                    )
                )
                _instance.value = updated
                currentStepIndex++
                moveToCurrentStep()
            } catch (e: Exception) {
                Timber.e(e, "Failed to complete step")
                _flowState.value = FlowState.Error("Kunde inte slutföra steg")
            }
        }
    }

    fun skipCurrentStep(reason: String? = null) {
        val step = steps.getOrNull(currentStepIndex) ?: return
        viewModelScope.launch {
            try {
                val updated = routineRepository.completeStep(
                    instanceId = instanceId,
                    stepId = step.id,
                    body = CompleteStepDto(
                        generalNotes = reason
                    )
                )
                _instance.value = updated
                currentStepIndex++
                moveToCurrentStep()
            } catch (e: Exception) {
                Timber.e(e, "Failed to skip step")
                _flowState.value = FlowState.Error("Kunde inte hoppa över steg")
            }
        }
    }

    private fun completeRoutine() {
        viewModelScope.launch {
            _flowState.value = FlowState.Completing
            try {
                routineRepository.completeInstance(instanceId)
                _flowState.value = FlowState.Completed
            } catch (e: Exception) {
                Timber.e(e, "Failed to complete routine")
                _flowState.value = FlowState.Error("Kunde inte slutföra rutin")
            }
        }
    }
}
