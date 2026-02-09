package com.equiduty.ui.today

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.equiduty.data.repository.ActivityRepository
import com.equiduty.data.repository.AuthRepository
import com.equiduty.data.repository.RoutineRepository
import com.equiduty.domain.model.ActivityInstance
import com.equiduty.domain.model.RoutineInstance
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import timber.log.Timber
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import javax.inject.Inject

enum class TimePeriod { DAY, WEEK, MONTH }

sealed class TodayItem {
    data class Activity(val instance: ActivityInstance) : TodayItem()
    data class Routine(val instance: RoutineInstance) : TodayItem()
}

@HiltViewModel
class TodayViewModel @Inject constructor(
    private val activityRepository: ActivityRepository,
    private val routineRepository: RoutineRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _selectedDate = MutableStateFlow(LocalDate.now())
    val selectedDate: StateFlow<LocalDate> = _selectedDate.asStateFlow()

    private val _period = MutableStateFlow(TimePeriod.DAY)
    val period: StateFlow<TimePeriod> = _period.asStateFlow()

    private val _showOnlyMine = MutableStateFlow(false)
    val showOnlyMine: StateFlow<Boolean> = _showOnlyMine.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _routines = MutableStateFlow<List<RoutineInstance>>(emptyList())

    // Fix 2: Include currentUser as a flow input so filtering is reactive
    val todayItems: StateFlow<List<TodayItem>> = combine(
        activityRepository.activities, _routines, _showOnlyMine, authRepository.currentUser
    ) { all, routs, onlyMine, user ->
        val userId = user?.uid

        val filteredActivities = if (onlyMine && userId != null) {
            all.filter { it.assignedTo == userId }
        } else all

        val filteredRoutines = if (onlyMine && userId != null) {
            routs.filter { it.assignedTo == userId }
        } else routs

        val combined = mutableListOf<TodayItem>()
        filteredActivities.forEach { combined.add(TodayItem.Activity(it)) }
        filteredRoutines.forEach { combined.add(TodayItem.Routine(it)) }

        // Sort by scheduled time
        combined.sortedBy { item ->
            when (item) {
                is TodayItem.Activity -> item.instance.scheduledTime ?: "23:59"
                is TodayItem.Routine -> item.instance.scheduledStartTime
            }
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Fix 1: Observe stable flow instead of calling loadData() directly in init
    init {
        viewModelScope.launch {
            authRepository.selectedStable
                .filterNotNull()
                .distinctUntilChanged { old, new -> old.id == new.id }
                .collect { loadData() }
        }
    }

    fun loadData() {
        viewModelScope.launch {
            val stableId = authRepository.selectedStable.value?.id
            if (stableId == null) {
                // Don't set error — init collector will trigger load when stable becomes available
                return@launch
            }
            val (start, end) = getDateRange()
            val fmt = DateTimeFormatter.ISO_LOCAL_DATE
            val today = LocalDate.now()

            // Fix 4: Independent error handling for activities vs routines
            try {
                _isLoading.value = true
                _error.value = null

                val errors = mutableListOf<String>()

                try {
                    activityRepository.fetchActivities(
                        stableId = stableId,
                        startDate = start.format(fmt),
                        endDate = end.format(fmt)
                    )
                } catch (e: Exception) {
                    Timber.e(e, "Failed to load activities")
                    errors.add("aktiviteter")
                }

                try {
                    val todayRoutines = routineRepository.getInstances(
                        stableId = stableId,
                        date = today.format(fmt)
                    )
                    _routines.value = todayRoutines
                } catch (e: Exception) {
                    Timber.e(e, "Failed to load routines")
                    errors.add("rutiner")
                }

                if (errors.isNotEmpty()) {
                    _error.value = "Kunde inte ladda ${errors.joinToString(" och ")}"
                }

                Timber.d("Loaded ${_routines.value.size} routines for today and ${activityRepository.activities.value.size} activities for period")
            } finally {
                _isLoading.value = false
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
