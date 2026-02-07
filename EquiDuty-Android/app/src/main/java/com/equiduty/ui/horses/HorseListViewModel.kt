package com.equiduty.ui.horses

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.equiduty.data.repository.AuthRepository
import com.equiduty.data.repository.HorseRepository
import com.equiduty.domain.model.Horse
import com.equiduty.domain.model.HorseStatus
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@HiltViewModel
class HorseListViewModel @Inject constructor(
    private val horseRepository: HorseRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    val horses = horseRepository.horses
    val isLoading = horseRepository.isLoading

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _showOnlyActive = MutableStateFlow(true)
    val showOnlyActive: StateFlow<Boolean> = _showOnlyActive.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    val filteredHorses: StateFlow<List<Horse>> = combine(
        horses, searchQuery, showOnlyActive
    ) { allHorses, query, activeOnly ->
        allHorses
            .filter { horse ->
                if (activeOnly) horse.status == HorseStatus.ACTIVE else true
            }
            .filter { horse ->
                if (query.isBlank()) true
                else horse.name.contains(query, ignoreCase = true) ||
                        (horse.breed?.contains(query, ignoreCase = true) == true)
            }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        loadHorses()
    }

    fun loadHorses() {
        viewModelScope.launch {
            val stableId = authRepository.selectedStable.value?.id ?: return@launch
            try {
                _error.value = null
                horseRepository.fetchHorses(stableId)
            } catch (e: Exception) {
                Timber.e(e, "Failed to load horses")
                _error.value = e.localizedMessage ?: "Kunde inte ladda hästar"
            }
        }
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun toggleActiveFilter() {
        _showOnlyActive.value = !_showOnlyActive.value
    }

    fun deleteHorse(horseId: String) {
        viewModelScope.launch {
            try {
                horseRepository.deleteHorse(horseId)
            } catch (e: Exception) {
                _error.value = e.localizedMessage ?: "Kunde inte ta bort häst"
            }
        }
    }
}
