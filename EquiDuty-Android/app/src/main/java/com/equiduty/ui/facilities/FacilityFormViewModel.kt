package com.equiduty.ui.facilities

import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.equiduty.data.remote.dto.AvailabilityScheduleDto
import com.equiduty.data.remote.dto.CreateFacilityDto
import com.equiduty.data.remote.dto.DayScheduleDto
import com.equiduty.data.remote.dto.ScheduleExceptionDto
import com.equiduty.data.remote.dto.TimeBlockDto
import com.equiduty.data.remote.dto.UpdateFacilityDto
import com.equiduty.data.remote.dto.WeeklyScheduleDto
import com.equiduty.data.repository.AuthRepository
import com.equiduty.data.repository.FacilityRepository
import com.equiduty.domain.model.FacilityStatus
import com.equiduty.domain.model.FacilityType
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import java.util.UUID
import javax.inject.Inject

// ── Helper data classes for form state ──────────────────────────

data class EditableTimeBlock(
    val id: String = UUID.randomUUID().toString(),
    val from: String = "08:00",
    val to: String = "20:00"
)

data class EditableDaySchedule(
    val available: Boolean = true,
    val useCustomHours: Boolean = false,
    val timeBlocks: List<EditableTimeBlock> = emptyList()
)

data class EditableException(
    val id: String = UUID.randomUUID().toString(),
    val date: String = "",
    val type: String = "closed",
    val timeBlocks: List<EditableTimeBlock> = emptyList(),
    val reason: String = ""
)

// ── ViewModel ───────────────────────────────────────────────────

@HiltViewModel
class FacilityFormViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val facilityRepository: FacilityRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val facilityId: String? = savedStateHandle["facilityId"]
    val isEditing = facilityId != null

    // Basic info
    val name = mutableStateOf("")
    val type = mutableStateOf(FacilityType.INDOOR_ARENA)
    val description = mutableStateOf("")
    val status = mutableStateOf(FacilityStatus.ACTIVE)

    // Booking rules
    val planningWindowOpens = mutableStateOf(14)
    val planningWindowCloses = mutableStateOf(1)
    val maxHorsesPerReservation = mutableStateOf(1)
    val minTimeSlotDuration = mutableStateOf(30)
    val maxHoursPerReservation = mutableStateOf(2)
    val maxDurationUnit = mutableStateOf("hours")

    // Weekly schedule
    val defaultTimeBlocks = mutableStateOf(listOf(EditableTimeBlock()))
    val daySchedules = mutableStateOf<Map<String, EditableDaySchedule>>(
        DAY_KEYS.associateWith { EditableDaySchedule() }
    )

    // Exceptions
    val exceptions = mutableStateOf<List<EditableException>>(emptyList())

    // State flows
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _isSaved = MutableStateFlow(false)
    val isSaved: StateFlow<Boolean> = _isSaved.asStateFlow()

    init {
        if (facilityId != null) {
            loadExistingFacility(facilityId)
        }
    }

    private fun loadExistingFacility(id: String) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val facility = facilityRepository.getFacility(id) ?: throw Exception("Facility not found")

                name.value = facility.name
                type.value = facility.type
                description.value = facility.description ?: ""
                status.value = facility.status

                // Booking rules
                planningWindowOpens.value = facility.planningWindowOpens ?: 14
                planningWindowCloses.value = facility.planningWindowCloses ?: 1
                maxHorsesPerReservation.value = facility.maxHorses ?: 1
                minTimeSlotDuration.value = facility.minSlotDuration ?: 30
                maxHoursPerReservation.value = facility.maxDuration ?: 2

                // Schedule
                facility.availabilitySchedule?.let { schedule ->
                    defaultTimeBlocks.value = schedule.weeklySchedule.defaultTimeBlocks.map {
                        EditableTimeBlock(from = it.from, to = it.to)
                    }.ifEmpty { listOf(EditableTimeBlock()) }

                    daySchedules.value = DAY_KEYS.associateWith { day ->
                        schedule.weeklySchedule.days[day]?.let { daySchedule ->
                            EditableDaySchedule(
                                available = daySchedule.available,
                                useCustomHours = daySchedule.timeBlocks.isNotEmpty(),
                                timeBlocks = daySchedule.timeBlocks.map {
                                    EditableTimeBlock(from = it.from, to = it.to)
                                }
                            )
                        } ?: EditableDaySchedule()
                    }

                    exceptions.value = schedule.exceptions.map { exc ->
                        EditableException(
                            date = exc.date,
                            type = exc.type,
                            timeBlocks = exc.timeBlocks.map {
                                EditableTimeBlock(from = it.from, to = it.to)
                            },
                            reason = exc.reason ?: ""
                        )
                    }
                }
            } catch (e: Exception) {
                Timber.e(e, "Failed to load facility")
                _error.value = "Kunde inte ladda anläggning"
            } finally {
                _isLoading.value = false
            }
        }
    }

    // ── Schedule editing helpers ────────────────────────────────

    fun addDefaultTimeBlock() {
        defaultTimeBlocks.value = defaultTimeBlocks.value + EditableTimeBlock()
    }

    fun removeDefaultTimeBlock(block: EditableTimeBlock) {
        if (defaultTimeBlocks.value.size > 1) {
            defaultTimeBlocks.value = defaultTimeBlocks.value.filterNot { it.id == block.id }
        }
    }

    fun updateDefaultTimeBlock(block: EditableTimeBlock, from: String, to: String) {
        defaultTimeBlocks.value = defaultTimeBlocks.value.map {
            if (it.id == block.id) it.copy(from = from, to = to) else it
        }
    }

    fun updateDaySchedule(day: String, schedule: EditableDaySchedule) {
        daySchedules.value = daySchedules.value.toMutableMap().apply { put(day, schedule) }
    }

    fun addException(exception: EditableException) {
        exceptions.value = exceptions.value + exception
    }

    fun removeException(exception: EditableException) {
        exceptions.value = exceptions.value.filterNot { it.id == exception.id }
    }

    // ── Save ────────────────────────────────────────────────────

    fun save() {
        if (name.value.isBlank()) {
            _error.value = "Namn krävs"
            return
        }

        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null

            try {
                val schedule = buildScheduleDto()

                if (isEditing) {
                    facilityRepository.updateFacility(
                        facilityId!!,
                        UpdateFacilityDto(
                            name = name.value.trim(),
                            type = type.value.value,
                            description = description.value.trim().ifBlank { null },
                            status = status.value.value,
                            planningWindowOpens = planningWindowOpens.value,
                            planningWindowCloses = planningWindowCloses.value,
                            maxHorsesPerReservation = maxHorsesPerReservation.value,
                            minTimeSlotDuration = minTimeSlotDuration.value,
                            maxHoursPerReservation = maxHoursPerReservation.value,
                            availabilitySchedule = schedule
                        )
                    )
                } else {
                    val stableId = authRepository.selectedStable.value?.id
                        ?: throw IllegalStateException("Inget stall valt")

                    facilityRepository.createFacility(
                        CreateFacilityDto(
                            stableId = stableId,
                            name = name.value.trim(),
                            type = type.value.value,
                            description = description.value.trim().ifBlank { null },
                            status = status.value.value,
                            planningWindowOpens = planningWindowOpens.value,
                            planningWindowCloses = planningWindowCloses.value,
                            maxHorsesPerReservation = maxHorsesPerReservation.value,
                            minTimeSlotDuration = minTimeSlotDuration.value,
                            maxHoursPerReservation = maxHoursPerReservation.value,
                            availabilitySchedule = schedule
                        )
                    )
                }

                _isSaved.value = true
            } catch (e: Exception) {
                Timber.e(e, "Failed to save facility")
                _error.value = e.localizedMessage ?: "Kunde inte spara anläggning"
            } finally {
                _isLoading.value = false
            }
        }
    }

    private fun buildScheduleDto(): AvailabilityScheduleDto {
        val daysMap = daySchedules.value
            .filter { (_, schedule) -> !schedule.available || schedule.useCustomHours }
            .mapValues { (_, schedule) ->
                DayScheduleDto(
                    available = schedule.available,
                    timeBlocks = if (schedule.useCustomHours && schedule.available) {
                        schedule.timeBlocks.map { TimeBlockDto(from = it.from, to = it.to) }
                    } else null
                )
            }

        return AvailabilityScheduleDto(
            weeklySchedule = WeeklyScheduleDto(
                defaultTimeBlocks = defaultTimeBlocks.value.map {
                    TimeBlockDto(from = it.from, to = it.to)
                },
                days = daysMap.ifEmpty { null }
            ),
            exceptions = exceptions.value.map { exc ->
                ScheduleExceptionDto(
                    date = exc.date,
                    type = exc.type,
                    timeBlocks = if (exc.type == "modified") {
                        exc.timeBlocks.map { TimeBlockDto(from = it.from, to = it.to) }
                    } else null,
                    reason = exc.reason.ifBlank { null }
                )
            }.ifEmpty { null }
        )
    }

    fun clearError() {
        _error.value = null
    }

    companion object {
        val DAY_KEYS = listOf("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")
    }
}
