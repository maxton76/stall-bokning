package com.equiduty.ui.routines

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.equiduty.data.repository.RoutineRepository
import com.equiduty.domain.model.RoutineInstance
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@HiltViewModel
class RoutineInstanceDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val routineRepository: RoutineRepository
) : ViewModel() {

    private val instanceId: String = savedStateHandle["instanceId"] ?: ""

    private val _instance = MutableStateFlow<RoutineInstance?>(null)
    val instance: StateFlow<RoutineInstance?> = _instance.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    init {
        loadInstance()
    }

    private fun loadInstance() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                _instance.value = routineRepository.getInstance(instanceId)
            } catch (e: Exception) {
                Timber.e(e, "Failed to load routine instance")
                _error.value = "Kunde inte ladda rutin"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun startRoutine() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                _instance.value = routineRepository.startInstance(instanceId)
            } catch (e: Exception) {
                Timber.e(e, "Failed to start routine")
                _error.value = "Kunde inte starta rutin"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun completeRoutine() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                _instance.value = routineRepository.completeInstance(instanceId)
            } catch (e: Exception) {
                Timber.e(e, "Failed to complete routine")
                _error.value = "Kunde inte slutföra rutin"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun cancelRoutine(reason: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                _instance.value = routineRepository.cancelInstance(
                    instanceId,
                    reason.ifBlank { "Ingen anledning angiven" }
                )
            } catch (e: Exception) {
                Timber.e(e, "Failed to cancel routine")
                _error.value = "Kunde inte avbryta rutin"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun refresh() {
        loadInstance()
    }
}
