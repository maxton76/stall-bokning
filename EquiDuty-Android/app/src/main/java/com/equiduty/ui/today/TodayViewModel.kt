package com.equiduty.ui.today

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.equiduty.data.repository.ActivityRepository
import com.equiduty.data.repository.AuthRepository
import com.equiduty.domain.model.ActivityInstance
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import timber.log.Timber
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import javax.inject.Inject

enum class TimePeriod { DAY, WEEK, MONTH }

@HiltViewModel
class TodayViewModel @Inject constructor(
    private val activityRepository: ActivityRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    val isLoading = activityRepository.isLoading

    private val _selectedDate = MutableStateFlow(LocalDate.now())
    val selectedDate: StateFlow<LocalDate> = _selectedDate.asStateFlow()

    private val _period = MutableStateFlow(TimePeriod.DAY)
    val period: StateFlow<TimePeriod> = _period.asStateFlow()

    private val _showOnlyMine = MutableStateFlow(false)
    val showOnlyMine: StateFlow<Boolean> = _showOnlyMine.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    val activities: StateFlow<List<ActivityInstance>> = combine(
        activityRepository.activities, _showOnlyMine
    ) { all, onlyMine ->
        if (onlyMine) {
            val userId = authRepository.currentUser.value?.uid
            all.filter { it.assignedTo == userId }
        } else {
            all
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            val stableId = authRepository.selectedStable.value?.id ?: return@launch
            val (start, end) = getDateRange()
            val fmt = DateTimeFormatter.ISO_LOCAL_DATE
            try {
                _error.value = null
                activityRepository.fetchActivities(
                    stableId = stableId,
                    startDate = start.format(fmt),
                    endDate = end.format(fmt)
                )
            } catch (e: Exception) {
                Timber.e(e, "Failed to load today data")
                _error.value = "Kunde inte ladda data"
            }
        }
    }

    fun navigateDate(offset: Int) {
        _selectedDate.value = when (_period.value) {
            TimePeriod.DAY -> _selectedDate.value.plusDays(offset.toLong())
            TimePeriod.WEEK -> _selectedDate.value.plusWeeks(offset.toLong())
            TimePeriod.MONTH -> _selectedDate.value.plusMonths(offset.toLong())
        }
        loadData()
    }

    fun setPeriod(period: TimePeriod) {
        _period.value = period
        loadData()
    }

    fun toggleShowOnlyMine() {
        _showOnlyMine.value = !_showOnlyMine.value
    }

    fun goToToday() {
        _selectedDate.value = LocalDate.now()
        loadData()
    }

    private fun getDateRange(): Pair<LocalDate, LocalDate> {
        val date = _selectedDate.value
        return when (_period.value) {
            TimePeriod.DAY -> date to date
            TimePeriod.WEEK -> {
                val start = date.minusDays(date.dayOfWeek.value.toLong() - 1)
                start to start.plusDays(6)
            }
            TimePeriod.MONTH -> {
                val start = date.withDayOfMonth(1)
                start to start.plusMonths(1).minusDays(1)
            }
        }
    }
}
