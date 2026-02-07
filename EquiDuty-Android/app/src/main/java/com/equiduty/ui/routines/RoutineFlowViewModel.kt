package com.equiduty.ui.routines

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.equiduty.data.remote.dto.CompleteStepDto
import com.equiduty.data.repository.AuthRepository
import com.equiduty.data.repository.RoutineRepository
import com.equiduty.domain.model.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

sealed class FlowState {
    data object Loading : FlowState()
    data class DailyNotesAcknowledgment(val notes: DailyNotes) : FlowState()
    data class StepExecution(
        val currentStepIndex: Int,
        val step: RoutineStep,
        val totalSteps: Int
    ) : FlowState()
    data object Completing : FlowState()
    data object Completed : FlowState()
    data class Error(val message: String) : FlowState()
}

@HiltViewModel
class RoutineFlowViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val routineRepository: RoutineRepository,
    private val authRepository: AuthRepository
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
                // Start the routine instance to get full data including template/steps
                val started = routineRepository.startInstance(instanceId)
                _instance.value = started

                // Load daily notes
                val stableId = authRepository.selectedStable.value?.id
                if (stableId != null) {
                    val notes = routineRepository.getDailyNotes(
                        stableId = stableId,
                        date = java.time.LocalDate.now().toString()
                    )
                    _dailyNotes.value = notes

                    if (notes != null && (notes.horseNotes.isNotEmpty() || notes.alerts.isNotEmpty())) {
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
            _flowState.value = FlowState.StepExecution(
                currentStepIndex = currentStepIndex,
                step = steps[currentStepIndex],
                totalSteps = steps.size
            )
        } else {
            completeRoutine()
        }
    }

    fun completeCurrentStep(notes: String? = null) {
        val step = steps.getOrNull(currentStepIndex) ?: return
        viewModelScope.launch {
            try {
                val updated = routineRepository.completeStep(
                    instanceId = instanceId,
                    stepId = step.id,
                    body = CompleteStepDto(
                        generalNotes = notes
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
