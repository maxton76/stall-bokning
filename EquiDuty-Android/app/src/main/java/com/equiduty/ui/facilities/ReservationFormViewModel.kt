package com.equiduty.ui.facilities

import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.equiduty.data.remote.dto.CheckConflictsDto
import com.equiduty.data.remote.dto.CreateReservationDto
import com.equiduty.data.remote.dto.UpdateReservationDto
import com.equiduty.data.repository.AuthRepository
import com.equiduty.data.repository.CapacityExceededException
import com.equiduty.data.repository.FacilityRepository
import com.equiduty.data.repository.FacilityReservationRepository
import com.equiduty.data.repository.HorseRepository
import com.equiduty.data.repository.SuggestedSlot
import com.equiduty.domain.model.Facility
import com.equiduty.domain.model.FacilityReservation
import com.equiduty.domain.model.Horse
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import java.time.LocalDate
import java.time.LocalTime
import java.time.LocalDateTime
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import javax.inject.Inject

@HiltViewModel
class ReservationFormViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val facilityRepository: FacilityRepository,
    private val reservationRepository: FacilityReservationRepository,
    private val horseRepository: HorseRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val reservationId: String? = savedStateHandle["reservationId"]
    private val preselectedFacilityId: String? = savedStateHandle["facilityId"]
    val isEditing = reservationId != null

    // Form fields
    val selectedFacilityId = mutableStateOf(preselectedFacilityId ?: "")
    val date = mutableStateOf(LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE))
    val startTime = mutableStateOf("")
    val endTime = mutableStateOf("")
    val selectedHorseIds = mutableStateOf<Set<String>>(emptySet())
    val externalHorseCount = mutableStateOf(0)
    val notes = mutableStateOf("")

    // Data
    private val _facilities = MutableStateFlow<List<Facility>>(emptyList())
    val facilities: StateFlow<List<Facility>> = _facilities.asStateFlow()

    private val _horses = MutableStateFlow<List<Horse>>(emptyList())
    val horses: StateFlow<List<Horse>> = _horses.asStateFlow()

    // State
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _isSaved = MutableStateFlow(false)
    val isSaved: StateFlow<Boolean> = _isSaved.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _hasConflicts = MutableStateFlow(false)
    val hasConflicts: StateFlow<Boolean> = _hasConflicts.asStateFlow()

    private val _remainingCapacity = MutableStateFlow<Int?>(null)
    val remainingCapacity: StateFlow<Int?> = _remainingCapacity.asStateFlow()

    private val _maxHorsesPerReservation = MutableStateFlow(1)
    val maxHorsesPerReservation: StateFlow<Int> = _maxHorsesPerReservation.asStateFlow()

    private val _suggestedSlots = MutableStateFlow<List<SuggestedSlot>>(emptyList())
    val suggestedSlots: StateFlow<List<SuggestedSlot>> = _suggestedSlots.asStateFlow()

    val canAddMoreHorses: Boolean
        get() = (selectedHorseIds.value.size + externalHorseCount.value) < (_remainingCapacity.value ?: _maxHorsesPerReservation.value)

    private var conflictCheckJob: Job? = null

    init {
        loadFormData()
        if (isEditing) loadExistingReservation()
    }

    private fun loadFormData() {
        val stableId = authRepository.selectedStable.value?.id ?: return
        viewModelScope.launch {
            facilityRepository.fetchFacilities(stableId)
            _facilities.value = facilityRepository.facilities.value
        }
        viewModelScope.launch {
            _horses.value = horseRepository.horses.value.ifEmpty {
                horseRepository.fetchHorses(stableId = stableId)
                horseRepository.horses.value
            }
            // Auto-select if only 1 horse
            if (_horses.value.size == 1) {
                selectedHorseIds.value = setOf(_horses.value.first().id)
            }
        }
    }

    private fun loadExistingReservation() {
        viewModelScope.launch {
            try {
                val reservation = reservationRepository.getReservation(reservationId!!) ?: return@launch
                selectedFacilityId.value = reservation.facilityId
                startTime.value = extractTime(reservation.startTime)
                endTime.value = extractTime(reservation.endTime)
                date.value = extractDate(reservation.startTime)
                selectedHorseIds.value = reservation.allHorseIds.toSet()
                notes.value = reservation.notes ?: ""
            } catch (e: Exception) {
                Timber.e(e, "Failed to load reservation")
            }
        }
    }

    fun toggleHorse(horseId: String) {
        val current = selectedHorseIds.value.toMutableSet()
        if (current.contains(horseId)) {
            current.remove(horseId)
        } else {
            if (!canAddMoreHorses) return
            current.add(horseId)
        }
        selectedHorseIds.value = current
    }

    fun removeHorse(horseId: String) {
        selectedHorseIds.value = selectedHorseIds.value - horseId
    }

    fun checkConflicts() {
        val facilityId = selectedFacilityId.value
        if (facilityId.isBlank() || startTime.value.isBlank() || endTime.value.isBlank()) return

        conflictCheckJob?.cancel()
        conflictCheckJob = viewModelScope.launch {
            delay(500) // debounce
            try {
                val result = reservationRepository.checkConflicts(
                    CheckConflictsDto(
                        facilityId = facilityId,
                        startTime = combineDateTimeIso(date.value, startTime.value),
                        endTime = combineDateTimeIso(date.value, endTime.value),
                        excludeReservationId = reservationId
                    )
                )
                _hasConflicts.value = result.hasConflicts
                result.maxHorsesPerReservation?.let { _maxHorsesPerReservation.value = it }
                result.remainingCapacity?.let { _remainingCapacity.value = it }
            } catch (e: Exception) {
                Timber.e(e, "Conflict check failed")
                // Fallback: allow up to max capacity
                _remainingCapacity.value = _maxHorsesPerReservation.value
            }
        }
    }

    fun save() {
        val stableId = authRepository.selectedStable.value?.id ?: return
        val stableName = authRepository.selectedStable.value?.name ?: ""
        val user = authRepository.currentUser.value ?: return
        val facility = _facilities.value.find { it.id == selectedFacilityId.value }
        val selectedHorses = _horses.value.filter { it.id in selectedHorseIds.value }
        val horseIdsList = selectedHorses.map { it.id }
        val horseNamesList = selectedHorses.map { it.name }
        // Legacy backward compat
        val legacyHorseId = horseIdsList.firstOrNull()
        val legacyHorseName = horseNamesList.firstOrNull()

        if (selectedFacilityId.value.isBlank() || date.value.isBlank() ||
            startTime.value.isBlank() || endTime.value.isBlank()
        ) {
            _error.value = "Fyll i alla obligatoriska fält"
            return
        }

        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            _suggestedSlots.value = emptyList()
            try {
                if (isEditing) {
                    reservationRepository.updateReservation(
                        reservationId!!,
                        UpdateReservationDto(
                            startTime = combineDateTimeIso(date.value, startTime.value),
                            endTime = combineDateTimeIso(date.value, endTime.value),
                            notes = notes.value.ifBlank { null },
                            horseId = legacyHorseId,
                            horseName = legacyHorseName,
                            horseIds = horseIdsList.ifEmpty { null },
                            horseNames = horseNamesList.ifEmpty { null },
                            externalHorseCount = if (externalHorseCount.value > 0) externalHorseCount.value else null
                        )
                    )
                } else {
                    reservationRepository.createReservation(
                        CreateReservationDto(
                            facilityId = selectedFacilityId.value,
                            facilityName = facility?.name,
                            facilityType = facility?.type?.value,
                            stableId = stableId,
                            stableName = stableName,
                            userId = user.uid,
                            userEmail = user.email,
                            userFullName = "${user.firstName} ${user.lastName}".trim(),
                            horseId = legacyHorseId,
                            horseName = legacyHorseName,
                            horseIds = horseIdsList.ifEmpty { null },
                            horseNames = horseNamesList.ifEmpty { null },
                            externalHorseCount = if (externalHorseCount.value > 0) externalHorseCount.value else null,
                            startTime = combineDateTimeIso(date.value, startTime.value),
                            endTime = combineDateTimeIso(date.value, endTime.value),
                            notes = notes.value.ifBlank { null }
                        )
                    )
                }
                _isSaved.value = true
            } catch (e: CapacityExceededException) {
                Timber.w(e, "Capacity exceeded")
                _error.value = e.message
                _suggestedSlots.value = e.suggestedSlots
            } catch (e: Exception) {
                Timber.e(e, "Failed to save reservation")
                _error.value = e.message ?: "Kunde inte spara bokningen"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun selectSuggestedSlot(slot: SuggestedSlot) {
        try {
            val start = java.time.OffsetDateTime.parse(slot.startTime)
            val end = java.time.OffsetDateTime.parse(slot.endTime)
            startTime.value = start.toLocalTime().format(DateTimeFormatter.ofPattern("HH:mm"))
            endTime.value = end.toLocalTime().format(DateTimeFormatter.ofPattern("HH:mm"))
            _suggestedSlots.value = emptyList()
            _error.value = null
            checkConflicts()
        } catch (e: Exception) {
            Timber.e(e, "Failed to parse suggested slot times")
        }
    }

    private fun combineDateTimeIso(dateStr: String, timeStr: String): String {
        val localDate = LocalDate.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE)
        val localTime = LocalTime.parse(timeStr, DateTimeFormatter.ofPattern("HH:mm"))
        return LocalDateTime.of(localDate, localTime)
            .atZone(java.time.ZoneId.systemDefault())
            .toInstant()
            .atOffset(ZoneOffset.UTC)
            .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
    }

    private fun extractTime(isoDateTime: String): String {
        return try {
            val dt = java.time.OffsetDateTime.parse(isoDateTime)
            dt.toLocalTime().format(DateTimeFormatter.ofPattern("HH:mm"))
        } catch (e: Exception) {
            ""
        }
    }

    private fun extractDate(isoDateTime: String): String {
        return try {
            val dt = java.time.OffsetDateTime.parse(isoDateTime)
            dt.toLocalDate().format(DateTimeFormatter.ISO_LOCAL_DATE)
        } catch (e: Exception) {
            LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
        }
    }
}
