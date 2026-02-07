package com.equiduty.ui.routines

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.equiduty.data.repository.AuthRepository
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
class RoutineListViewModel @Inject constructor(
    private val routineRepository: RoutineRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    val templates = routineRepository.templates
    val isLoading = routineRepository.isLoading

    private val _instances = MutableStateFlow<List<RoutineInstance>>(emptyList())
    val instances: StateFlow<List<RoutineInstance>> = _instances.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    init {
        loadTemplates()
    }

    fun loadTemplates() {
        viewModelScope.launch {
            val orgId = authRepository.selectedOrganization.value?.id ?: return@launch
            val stableId = authRepository.selectedStable.value?.id ?: return@launch
            try {
                _error.value = null
                routineRepository.fetchTemplates(orgId)
                val today = java.time.LocalDate.now().toString()
                _instances.value = routineRepository.getInstances(stableId, today)
            } catch (e: Exception) {
                Timber.e(e, "Failed to load routines")
                _error.value = "Kunde inte ladda rutiner"
            }
        }
    }

    suspend fun startRoutine(instanceId: String): String? {
        return try {
            val started = routineRepository.startInstance(instanceId)
            started.id
        } catch (e: Exception) {
            Timber.e(e, "Failed to start routine")
            _error.value = "Kunde inte starta rutin"
            null
        }
    }
}
