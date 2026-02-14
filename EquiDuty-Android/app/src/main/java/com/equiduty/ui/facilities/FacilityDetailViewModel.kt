package com.equiduty.ui.facilities

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.equiduty.data.repository.FacilityRepository
import com.equiduty.data.repository.FacilityReservationRepository
import com.equiduty.data.repository.ReservationListenerRepository
import com.equiduty.domain.model.Facility
import com.equiduty.domain.model.FacilityReservation
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.launch
import timber.log.Timber
import java.time.LocalDate
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import javax.inject.Inject

@HiltViewModel
class FacilityDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val facilityRepository: FacilityRepository,
    private val reservationRepository: FacilityReservationRepository,
    private val listenerRepository: ReservationListenerRepository
) : ViewModel() {

    private val facilityId: String = savedStateHandle["facilityId"] ?: ""

    private val _facility = MutableStateFlow<Facility?>(null)
    val facility: StateFlow<Facility?> = _facility.asStateFlow()

    private val _reservations = MutableStateFlow<List<FacilityReservation>>(emptyList())
    val reservations: StateFlow<List<FacilityReservation>> = _reservations.asStateFlow()

    private val _selectedDate = MutableStateFlow(LocalDate.now())
    val selectedDate: StateFlow<LocalDate> = _selectedDate.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    /**
     * Live reservations from Firestore listener, filtered to current facility + date.
     * Falls back to API-fetched reservations if listener has no data yet.
     */
    val liveReservations: StateFlow<List<FacilityReservation>> = combine(
        listenerRepository.liveReservations,
        _reservations,
        _selectedDate
    ) { live, apiFetched, date ->
        val source = live.ifEmpty { apiFetched }
        val dateStr = date.format(DateTimeFormatter.ISO_LOCAL_DATE)
        source.filter { reservation ->
            reservation.facilityId == facilityId &&
            reservation.startTime.startsWith(dateStr)
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        loadFacility()
        loadReservationsForDate()
    }

    private fun loadFacility() {
        viewModelScope.launch {
            try {
                val facility = facilityRepository.getFacility(facilityId)
                _facility.value = facility

                // Start real-time listener once we know the stableId
                facility?.stableId?.let { stableId ->
                    listenerRepository.startListening(stableId)
                }
            } catch (e: Exception) {
                Timber.e(e, "Failed to load facility")
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun loadReservationsForDate(date: LocalDate = _selectedDate.value) {
        _selectedDate.value = date
        viewModelScope.launch {
            try {
                val dateStr = date.format(DateTimeFormatter.ISO_LOCAL_DATE)
                reservationRepository.fetchReservations(
                    facilityId = facilityId,
                    startDate = dateStr,
                    endDate = dateStr
                )
                _reservations.value = reservationRepository.reservations.value
            } catch (e: Exception) {
                Timber.e(e, "Failed to load reservations for date")
            }
        }
    }

    fun navigateDate(days: Int) {
        val newDate = _selectedDate.value.plusDays(days.toLong())
        loadReservationsForDate(newDate)
    }

    override fun onCleared() {
        super.onCleared()
        listenerRepository.stopListening()
    }
}
