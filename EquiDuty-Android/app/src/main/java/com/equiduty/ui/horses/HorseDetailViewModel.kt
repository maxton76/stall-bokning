package com.equiduty.ui.horses

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.equiduty.data.repository.HorseRepository
import com.equiduty.domain.model.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@HiltViewModel
class HorseDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val horseRepository: HorseRepository
) : ViewModel() {

    private val horseId: String = savedStateHandle["horseId"] ?: ""

    private val _horse = MutableStateFlow<Horse?>(null)
    val horse: StateFlow<Horse?> = _horse.asStateFlow()

    private val _vaccinations = MutableStateFlow<List<VaccinationRecord>>(emptyList())
    val vaccinations: StateFlow<List<VaccinationRecord>> = _vaccinations.asStateFlow()

    private val _team = MutableStateFlow<HorseTeam?>(null)
    val team: StateFlow<HorseTeam?> = _team.asStateFlow()

    private val _ownerships = MutableStateFlow<List<HorseOwnership>>(emptyList())
    val ownerships: StateFlow<List<HorseOwnership>> = _ownerships.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    init {
        loadHorse()
    }

    fun loadHorse() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                _horse.value = horseRepository.getHorse(horseId)
                _error.value = null
            } catch (e: Exception) {
                Timber.e(e, "Failed to load horse $horseId")
                _error.value = e.localizedMessage ?: "Kunde inte ladda häst"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun loadVaccinations() {
        viewModelScope.launch {
            try {
                _vaccinations.value = horseRepository.getVaccinationRecords(horseId)
            } catch (e: Exception) {
                Timber.w(e, "Failed to load vaccinations")
            }
        }
    }

    fun loadTeam() {
        viewModelScope.launch {
            try {
                _team.value = horseRepository.getTeam(horseId)
            } catch (e: Exception) {
                Timber.w(e, "Failed to load team")
            }
        }
    }

    fun loadOwnerships() {
        viewModelScope.launch {
            try {
                _ownerships.value = horseRepository.getOwnerships(horseId)
            } catch (e: Exception) {
                Timber.w(e, "Failed to load ownerships")
            }
        }
    }
}
