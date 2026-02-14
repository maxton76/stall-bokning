package com.equiduty.ui.facilities

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.equiduty.data.repository.AuthRepository
import com.equiduty.data.repository.FacilityRepository
import com.equiduty.domain.model.Facility
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@HiltViewModel
class ManageFacilitiesViewModel @Inject constructor(
    private val facilityRepository: FacilityRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _facilities = MutableStateFlow<List<Facility>>(emptyList())
    val facilities: StateFlow<List<Facility>> = _facilities.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    init {
        loadFacilities()
    }

    fun loadFacilities() {
        val stableId = authRepository.selectedStable.value?.id ?: return
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                facilityRepository.fetchFacilities(stableId)
                _facilities.value = facilityRepository.facilities.value
            } catch (e: Exception) {
                Timber.e(e, "Failed to load facilities")
                _error.value = "Kunde inte ladda anläggningar"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun deleteFacility(facility: Facility) {
        viewModelScope.launch {
            try {
                facilityRepository.deleteFacility(facility.id)
                _facilities.value = _facilities.value.filterNot { it.id == facility.id }
            } catch (e: Exception) {
                Timber.e(e, "Failed to delete facility ${facility.id}")
                _error.value = "Kunde inte ta bort anläggningen"
            }
        }
    }

    fun clearError() {
        _error.value = null
    }
}
