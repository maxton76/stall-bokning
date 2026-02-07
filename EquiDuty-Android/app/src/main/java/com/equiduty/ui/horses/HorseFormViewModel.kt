package com.equiduty.ui.horses

import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.equiduty.data.remote.dto.CreateHorseDto
import com.equiduty.data.remote.dto.UpdateHorseDto
import com.equiduty.data.repository.AuthRepository
import com.equiduty.data.repository.HorseRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@HiltViewModel
class HorseFormViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val horseRepository: HorseRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val horseId: String? = savedStateHandle["horseId"]
    val isEditing = horseId != null

    val name = mutableStateOf("")
    val breed = mutableStateOf("")
    val color = mutableStateOf("")
    val gender = mutableStateOf("")
    val dateOfBirth = mutableStateOf("")
    val withersHeight = mutableStateOf("")
    val usage = mutableStateOf("")
    val specialInstructions = mutableStateOf("")
    val notes = mutableStateOf("")

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _isSaved = MutableStateFlow(false)
    val isSaved: StateFlow<Boolean> = _isSaved.asStateFlow()

    init {
        if (horseId != null) {
            loadExistingHorse(horseId)
        }
    }

    private fun loadExistingHorse(id: String) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val horse = horseRepository.getHorse(id)
                name.value = horse.name
                breed.value = horse.breed ?: ""
                color.value = horse.color.value
                gender.value = horse.gender?.value ?: ""
                dateOfBirth.value = horse.dateOfBirth ?: ""
                withersHeight.value = horse.withersHeight?.toString() ?: ""
                usage.value = horse.usage?.firstOrNull()?.value ?: ""
                specialInstructions.value = horse.specialInstructions ?: ""
                notes.value = horse.notes ?: ""
            } catch (e: Exception) {
                _error.value = "Kunde inte ladda häst"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun save() {
        if (name.value.isBlank()) {
            _error.value = "Namn krävs"
            return
        }

        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                if (isEditing) {
                    horseRepository.updateHorse(
                        horseId!!,
                        UpdateHorseDto(
                            name = name.value,
                            breed = breed.value.ifBlank { null },
                            color = color.value.ifBlank { null },
                            gender = gender.value.ifBlank { null },
                            dateOfBirth = dateOfBirth.value.ifBlank { null },
                            withersHeight = withersHeight.value.toIntOrNull(),
                            usage = usage.value.ifBlank { null }?.let { listOf(it) },
                            specialInstructions = specialInstructions.value.ifBlank { null },
                            notes = notes.value.ifBlank { null }
                        )
                    )
                } else {
                    val stableId = authRepository.selectedStable.value?.id ?: throw IllegalStateException("Inget stall valt")
                    horseRepository.createHorse(
                        CreateHorseDto(
                            name = name.value,
                            currentStableId = stableId,
                            breed = breed.value.ifBlank { null },
                            color = color.value.ifBlank { "brown" },
                            gender = gender.value.ifBlank { null },
                            dateOfBirth = dateOfBirth.value.ifBlank { null },
                            withersHeight = withersHeight.value.toIntOrNull(),
                            usage = usage.value.ifBlank { null }?.let { listOf(it) },
                            specialInstructions = specialInstructions.value.ifBlank { null },
                            notes = notes.value.ifBlank { null }
                        )
                    )
                }
                _isSaved.value = true
            } catch (e: Exception) {
                Timber.e(e, "Failed to save horse")
                _error.value = e.localizedMessage ?: "Kunde inte spara häst"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun clearError() {
        _error.value = null
    }
}
