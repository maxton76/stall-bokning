package com.equiduty.ui.feeding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.equiduty.data.repository.AuthRepository
import com.equiduty.data.repository.FeedingRepository
import com.equiduty.domain.model.FeedType
import com.equiduty.domain.model.FeedingTime
import com.equiduty.domain.model.HorseFeeding
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

data class FeedingTimeGroup(
    val feedingTime: FeedingTime,
    val feedings: List<HorseFeeding>
)

@HiltViewModel
class FeedingViewModel @Inject constructor(
    private val feedingRepository: FeedingRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    val feedTypes: StateFlow<List<FeedType>> = feedingRepository.feedTypes
    val feedingTimes: StateFlow<List<FeedingTime>> = feedingRepository.feedingTimes
    val horseFeedings: StateFlow<List<HorseFeeding>> = feedingRepository.horseFeedings
    val isLoading: StateFlow<Boolean> = feedingRepository.isLoading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    val groupedFeedings: StateFlow<List<FeedingTimeGroup>> = combine(
        feedingTimes,
        horseFeedings
    ) { times, feedings ->
        val activeFeedings = feedings.filter { it.isActive }
        times.filter { it.isActive }
            .sortedBy { it.sortOrder }
            .map { time ->
                FeedingTimeGroup(
                    feedingTime = time,
                    feedings = activeFeedings
                        .filter { it.feedingTimeId == time.id }
                        .sortedBy { it.horseName }
                )
            }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        loadAll()
    }

    fun loadAll() {
        viewModelScope.launch {
            _error.value = null
            val stableId = authRepository.selectedStable.value?.id ?: return@launch
            val orgId = authRepository.selectedOrganization.value?.id ?: return@launch
            try {
                // Load all feeding data in parallel
                launch { feedingRepository.fetchFeedTypes(orgId) }
                launch { feedingRepository.fetchFeedingTimes(stableId) }
                launch { feedingRepository.fetchHorseFeedings(stableId) }
            } catch (e: Exception) {
                Timber.e(e, "Failed to load feeding data")
                _error.value = "Kunde inte ladda utfodringsdata"
            }
        }
    }

    suspend fun deleteFeedType(id: String): Boolean {
        return try {
            feedingRepository.deleteFeedType(id)
            true
        } catch (e: Exception) {
            Timber.e(e, "Failed to delete feed type")
            _error.value = "Kunde inte ta bort fodertyp"
            false
        }
    }
}
