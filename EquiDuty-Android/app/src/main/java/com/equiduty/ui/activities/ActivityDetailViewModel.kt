package com.equiduty.ui.activities

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.equiduty.data.repository.ActivityRepository
import com.equiduty.domain.model.ActivityInstance
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@HiltViewModel
class ActivityDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val activityRepository: ActivityRepository
) : ViewModel() {

    private val activityId: String = savedStateHandle["activityId"] ?: ""

    private val _activity = MutableStateFlow<ActivityInstance?>(null)
    val activity: StateFlow<ActivityInstance?> = _activity.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    init {
        loadActivity()
    }

    private fun loadActivity() {
        viewModelScope.launch {
            try {
                _activity.value = activityRepository.getActivity(activityId)
            } catch (e: Exception) {
                Timber.e(e, "Failed to load activity")
            } finally {
                _isLoading.value = false
            }
        }
    }
}
