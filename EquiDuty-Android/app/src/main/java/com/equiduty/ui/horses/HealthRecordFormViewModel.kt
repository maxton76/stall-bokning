package com.equiduty.ui.horses

import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.equiduty.data.remote.dto.CreateHealthRecordDto
import com.equiduty.data.remote.dto.UpdateHealthRecordDto
import com.equiduty.data.repository.HealthRecordRepository
import com.equiduty.ui.utils.DateValidation
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@HiltViewModel
class HealthRecordFormViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val healthRecordRepository: HealthRecordRepository
) : ViewModel() {

    private val horseId: String = savedStateHandle["horseId"] ?: ""
    private val recordId: String? = savedStateHandle["recordId"]
    val isEditing = recordId != null

    val professionalType = mutableStateOf("veterinary")
    val professionalName = mutableStateOf("")
    val date = mutableStateOf("")
    val type = mutableStateOf("examination")
    val title = mutableStateOf("")
    val description = mutableStateOf("")
    val diagnosis = mutableStateOf("")
    val treatment = mutableStateOf("")
    val medications = mutableStateOf("")
    val cost = mutableStateOf("")
    val followupDate = mutableStateOf("")
    val followupNotes = mutableStateOf("")

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _isSaved = MutableStateFlow(false)
    val isSaved: StateFlow<Boolean> = _isSaved.asStateFlow()

    val costError = mutableStateOf<String?>(null)

    init {
        if (recordId != null) {
            // TODO: Load existing record for editing
        }
    }

    fun save() {
        if (title.value.isBlank()) {
            _error.value = "Titel krävs"
            return
        }

        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            costError.value = null

            try {
                // Validate dates before sending to API
                val dateError = DateValidation.validateDates(
                    mapOf(
                        "datum" to date.value,
                        "uppföljningsdatum" to followupDate.value
                    )
                )
                if (dateError != null) {
                    _error.value = dateError
                    _isLoading.value = false
                    return@launch
                }

                // Validate and parse cost if provided
                val parsedCost = if (cost.value.isNotBlank()) {
                    cost.value.toDoubleOrNull()?.also {
                        if (it < 0) {
                            costError.value = "Kostnaden måste vara ett positivt tal"
                            _error.value = "Kostnaden måste vara ett positivt tal"
                            _isLoading.value = false
                            return@launch
                        }
                    } ?: run {
                        costError.value = "Ogiltig kostnad. Ange ett tal (ex: 1500.50)"
                        _error.value = "Ogiltig kostnad. Ange ett tal (ex: 1500.50)"
                        _isLoading.value = false
                        return@launch
                    }
                } else null

                // Sanitize and validate medications
                val medicationList = medications.value
                    .split(",")
                    .map { it.trim() }
                    .filter { it.isNotBlank() }
                    .take(50)  // Limit to 50 medications
                    .map { med ->
                        // Sanitize: remove dangerous characters, limit length
                        med.take(100).replace(Regex("[<>\"']"), "")
                    }

                if (isEditing && recordId != null) {
                    healthRecordRepository.updateHealthRecord(
                        recordId,
                        UpdateHealthRecordDto(
                            professionalType = professionalType.value.trim(),
                            professionalName = professionalName.value.trim().ifBlank { null },
                            date = date.value.trim(),
                            type = type.value.trim(),
                            title = title.value.trim(),
                            description = description.value.trim().ifBlank { null },
                            diagnosis = diagnosis.value.trim().ifBlank { null },
                            treatment = treatment.value.trim().ifBlank { null },
                            medications = medicationList.ifEmpty { null },
                            cost = parsedCost,
                            followupDate = followupDate.value.trim().ifBlank { null },
                            followupNotes = followupNotes.value.trim().ifBlank { null }
                        )
                    )
                } else {
                    healthRecordRepository.createHealthRecord(
                        CreateHealthRecordDto(
                            horseId = horseId,
                            professionalType = professionalType.value.trim(),
                            professionalName = professionalName.value.trim().ifBlank { null },
                            date = date.value.trim(),
                            type = type.value.trim(),
                            title = title.value.trim(),
                            description = description.value.trim().ifBlank { null },
                            diagnosis = diagnosis.value.trim().ifBlank { null },
                            treatment = treatment.value.trim().ifBlank { null },
                            medications = medicationList.ifEmpty { null },
                            cost = parsedCost,
                            followupDate = followupDate.value.trim().ifBlank { null },
                            followupNotes = followupNotes.value.trim().ifBlank { null }
                        )
                    )
                }
                _isSaved.value = true
            } catch (e: Exception) {
                Timber.e(e, "Failed to save health record")
                _error.value = e.localizedMessage ?: "Kunde inte spara hälsojournal"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun clearError() {
        _error.value = null
    }
}
