package com.equiduty.ui.facilities

import androidx.lifecycle.SavedStateHandle
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
import javax.inject.Inject

@HiltViewModel
class ReservationDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val reservationRepository: FacilityReservationRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val reservationId: String = savedStateHandle["reservationId"] ?: ""

    private val _reservation = MutableStateFlow<FacilityReservation?>(null)
    val reservation: StateFlow<FacilityReservation?> = _reservation.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _isCancelled = MutableStateFlow(false)
    val isCancelled: StateFlow<Boolean> = _isCancelled.asStateFlow()

    val canCancel: Boolean
        get() {
            val res = _reservation.value ?: return false
            return res.status in listOf(ReservationStatus.PENDING, ReservationStatus.CONFIRMED)
        }

    val canEdit: Boolean
        get() {
            val res = _reservation.value ?: return false
            val currentUserId = authRepository.currentUser.value?.uid
            return res.userId == currentUserId && res.status == ReservationStatus.PENDING
        }

    init {
        loadReservation()
    }

    private fun loadReservation() {
        viewModelScope.launch {
            try {
                _reservation.value = reservationRepository.getReservation(reservationId)
            } catch (e: Exception) {
                Timber.e(e, "Failed to load reservation")
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun cancelReservation() {
        viewModelScope.launch {
            try {
                _isLoading.value = true
                reservationRepository.cancelReservation(reservationId)
                _isCancelled.value = true
            } catch (e: Exception) {
                Timber.e(e, "Failed to cancel reservation")
            } finally {
                _isLoading.value = false
            }
        }
    }
}
