package com.equiduty.ui.activities

import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.equiduty.data.remote.dto.CreateActivityDto
import com.equiduty.data.remote.dto.UpdateActivityDto
import com.equiduty.data.repository.ActivityRepository
import com.equiduty.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@HiltViewModel
class ActivityFormViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val activityRepository: ActivityRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val activityId: String? = savedStateHandle["activityId"]
    val isEditing = activityId != null

    val activityType = mutableStateOf("")
    val date = mutableStateOf("")
    val scheduledTime = mutableStateOf("")
    val duration = mutableStateOf("")
    val notes = mutableStateOf("")

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _isSaved = MutableStateFlow(false)
    val isSaved: StateFlow<Boolean> = _isSaved.asStateFlow()

    init {
        if (activityId != null) {
            loadExisting(activityId)
        }
    }

    private fun loadExisting(id: String) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val activity = activityRepository.getActivity(id)
                activityType.value = activity.activityTypeCategory.value
                date.value = activity.scheduledDate
                scheduledTime.value = activity.scheduledTime ?: ""
                duration.value = activity.duration?.toString() ?: ""
                notes.value = activity.notes ?: ""
            } catch (e: Exception) {
                _error.value = "Kunde inte ladda aktivitet"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun save() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                if (isEditing) {
                    activityRepository.updateActivity(
                        activityId!!,
                        UpdateActivityDto(
                            activityType = activityType.value.ifBlank { null },
                            date = date.value.ifBlank { null },
                            scheduledTime = scheduledTime.value.ifBlank { null },
                            duration = duration.value.toIntOrNull(),
                            notes = notes.value.ifBlank { null }
                        )
                    )
                } else {
                    val stableId = authRepository.selectedStable.value?.id ?: throw IllegalStateException("Inget stall valt")
                    activityRepository.createActivity(
                        CreateActivityDto(
                            stableId = stableId,
                            activityType = activityType.value.ifBlank { "other" },
                            date = date.value,
                            scheduledTime = scheduledTime.value.ifBlank { null },
                            duration = duration.value.toIntOrNull(),
                            notes = notes.value.ifBlank { null }
                        )
                    )
                }
                _isSaved.value = true
            } catch (e: Exception) {
                Timber.e(e, "Failed to save activity")
                _error.value = e.localizedMessage ?: "Kunde inte spara aktivitet"
            } finally {
                _isLoading.value = false
            }
        }
    }
}
