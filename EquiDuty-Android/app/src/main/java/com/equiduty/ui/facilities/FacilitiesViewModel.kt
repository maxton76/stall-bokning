package com.equiduty.ui.facilities

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.equiduty.data.repository.AuthRepository
import com.equiduty.data.repository.FacilityRepository
import com.equiduty.data.repository.FacilityReservationRepository
import com.equiduty.data.repository.PermissionRepository
import com.equiduty.domain.model.Facility
import com.equiduty.domain.model.FacilityReservation
import com.equiduty.domain.model.FacilityType
import com.equiduty.domain.model.ReservationStatus
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import timber.log.Timber
import java.time.OffsetDateTime
import javax.inject.Inject

@HiltViewModel
class FacilitiesViewModel @Inject constructor(
    private val facilityRepository: FacilityRepository,
    private val reservationRepository: FacilityReservationRepository,
    private val authRepository: AuthRepository,
    val permissionRepository: PermissionRepository
) : ViewModel() {

    val facilities: StateFlow<List<Facility>> = facilityRepository.facilities
    val isLoading: StateFlow<Boolean> = facilityRepository.isLoading

    private val _selectedTypeFilter = MutableStateFlow<FacilityType?>(null)
    val selectedTypeFilter: StateFlow<FacilityType?> = _selectedTypeFilter.asStateFlow()

    private val _upcomingReservations = MutableStateFlow<List<FacilityReservation>>(emptyList())
    val upcomingReservations: StateFlow<List<FacilityReservation>> = _upcomingReservations.asStateFlow()

    val filteredFacilities: StateFlow<List<Facility>> = combine(
        facilities, _selectedTypeFilter
    ) { facilities, typeFilter ->
        if (typeFilter == null) facilities
        else facilities.filter { it.type == typeFilter }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        loadData()
    }

    fun loadData() {
        val stableId = authRepository.selectedStable.value?.id ?: return
        val userId = authRepository.currentUser.value?.uid ?: return

        viewModelScope.launch {
            facilityRepository.fetchFacilities(stableId)
        }

        viewModelScope.launch {
            try {
                val now = OffsetDateTime.now()
                reservationRepository.fetchReservations(
                    stableId = stableId,
                    userId = userId,
                    startDate = now.toLocalDate().toString()
                )
                _upcomingReservations.value = reservationRepository.reservations.value
                    .filter { it.status in listOf(ReservationStatus.PENDING, ReservationStatus.CONFIRMED) }
                    .sortedBy { it.startTime }
                    .take(10)
            } catch (e: Exception) {
                Timber.e(e, "Failed to load upcoming reservations")
            }
        }
    }

    fun setTypeFilter(type: FacilityType?) {
        _selectedTypeFilter.value = type
    }
}
