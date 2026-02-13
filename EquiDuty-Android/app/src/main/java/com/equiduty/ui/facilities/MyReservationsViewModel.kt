package com.equiduty.ui.facilities

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.equiduty.data.repository.AuthRepository
import com.equiduty.data.repository.FacilityReservationRepository
import com.equiduty.domain.model.FacilityReservation
import com.equiduty.domain.model.ReservationStatus
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import java.time.OffsetDateTime
import javax.inject.Inject

@HiltViewModel
class MyReservationsViewModel @Inject constructor(
    private val reservationRepository: FacilityReservationRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _upcomingReservations = MutableStateFlow<List<FacilityReservation>>(emptyList())
    val upcomingReservations: StateFlow<List<FacilityReservation>> = _upcomingReservations.asStateFlow()

    private val _pastReservations = MutableStateFlow<List<FacilityReservation>>(emptyList())
    val pastReservations: StateFlow<List<FacilityReservation>> = _pastReservations.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    init {
        loadReservations()
    }

    private fun loadReservations() {
        val userId = authRepository.currentUser.value?.uid ?: return
        val stableId = authRepository.selectedStable.value?.id ?: return

        viewModelScope.launch {
            try {
                reservationRepository.fetchReservations(stableId = stableId, userId = userId)
                val all = reservationRepository.reservations.value

                val now = OffsetDateTime.now()

                _upcomingReservations.value = all
                    .filter {
                        it.status in listOf(ReservationStatus.PENDING, ReservationStatus.CONFIRMED)
                    }
                    .sortedBy { it.startTime }

                _pastReservations.value = all
                    .filter {
                        it.status in listOf(
                            ReservationStatus.COMPLETED,
                            ReservationStatus.CANCELLED,
                            ReservationStatus.NO_SHOW,
                            ReservationStatus.REJECTED
                        )
                    }
                    .sortedByDescending { it.startTime }
            } catch (e: Exception) {
                Timber.e(e, "Failed to load reservations")
            } finally {
                _isLoading.value = false
            }
        }
    }
}
