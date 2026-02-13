package com.equiduty.ui.activities

import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.equiduty.data.remote.dto.CreateActivityDto
import com.equiduty.data.remote.dto.UpdateActivityDto
import com.equiduty.data.repository.ActivityRepository
import com.equiduty.data.repository.AuthRepository
import com.equiduty.ui.utils.DateValidation
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import java.time.LocalDate
import java.time.LocalTime
import java.time.LocalDateTime
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
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
    val date = mutableStateOf(LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE))
    val scheduledTime = mutableStateOf(
        LocalTime.now().plusHours(1).withMinute(0).format(DateTimeFormatter.ofPattern("HH:mm"))
    )
    val duration = mutableStateOf("60")
    val notes = mutableStateOf("")
    val selectedHorseIds = mutableStateOf<List<String>>(emptyList())
    val priority = mutableStateOf("normal")
    val contactName = mutableStateOf("")
    val contactPhone = mutableStateOf("")
    val contactEmail = mutableStateOf("")

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

    /**
     * Combine date (YYYY-MM-DD) and time (HH:mm) into ISO 8601 UTC string.
     * Converts from the device's local timezone to UTC.
     * Falls back to date-only if time is blank or unparseable.
     */
    private fun combineDateTimeIso(dateStr: String, timeStr: String): String {
        return try {
            val localDate = LocalDate.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE)
            if (timeStr.isNotBlank()) {
                val localTime = LocalTime.parse(timeStr, DateTimeFormatter.ofPattern("HH:mm"))
                LocalDateTime.of(localDate, localTime)
                    .atZone(java.time.ZoneId.systemDefault())
                    .toInstant()
                    .atOffset(ZoneOffset.UTC)
                    .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
            } else {
                "${dateStr}T00:00:00Z"
            }
        } catch (_: Exception) {
            dateStr
        }
    }

    fun save() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null

            try {
                // Validate date before processing
                if (!DateValidation.isValidDate(date.value)) {
                    _error.value = "Ogiltigt datum. Använd ÅÅÅÅ-MM-DD"
                    _isLoading.value = false
                    return@launch
                }

                val isoDate = combineDateTimeIso(date.value.trim(), scheduledTime.value.trim())
                if (isEditing) {
                    activityRepository.updateActivity(
                        activityId!!,
                        UpdateActivityDto(
                            activityType = activityType.value.trim().ifBlank { null },
                            date = isoDate,
                            scheduledTime = scheduledTime.value.trim().ifBlank { null },
                            duration = duration.value.trim().toIntOrNull(),
                            horseIds = selectedHorseIds.value.ifEmpty { null },
                            notes = notes.value.trim().ifBlank { null }
                        )
                    )
                } else {
                    val stableId = authRepository.selectedStable.value?.id ?: throw IllegalStateException("Inget stall valt")
                    activityRepository.createActivity(
                        CreateActivityDto(
                            stableId = stableId,
                            activityType = activityType.value.trim().ifBlank { "other" },
                            date = isoDate,
                            scheduledTime = scheduledTime.value.trim().ifBlank { null },
                            duration = duration.value.trim().toIntOrNull(),
                            horseIds = selectedHorseIds.value.ifEmpty { null },
                            notes = notes.value.trim().ifBlank { null }
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
