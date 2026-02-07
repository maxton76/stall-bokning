package com.equiduty.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.equiduty.data.repository.AuthRepository
import com.equiduty.data.repository.SettingsRepository
import com.equiduty.domain.model.NotificationPreferences
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val settingsRepository: SettingsRepository
) : ViewModel() {

    val currentUser = authRepository.currentUser
    val organizations = authRepository.organizations
    val selectedOrganization = authRepository.selectedOrganization
    val selectedStable = authRepository.selectedStable
    val preferences = settingsRepository.preferences

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    init {
        viewModelScope.launch {
            settingsRepository.fetchPreferences()
        }
    }

    fun selectOrganization(orgId: String) {
        viewModelScope.launch {
            try {
                authRepository.selectOrganization(orgId)
            } catch (e: Exception) {
                Timber.e(e, "Failed to select organization")
                _error.value = e.localizedMessage ?: "Kunde inte byta organisation"
            }
        }
    }

    fun selectStable(stableId: String) {
        viewModelScope.launch {
            try {
                authRepository.selectStable(stableId)
            } catch (e: Exception) {
                Timber.e(e, "Failed to select stable")
                _error.value = e.localizedMessage ?: "Kunde inte byta stall"
            }
        }
    }

    fun updateLanguage(language: String) {
        viewModelScope.launch {
            try {
                settingsRepository.updateLanguage(language)
            } catch (e: Exception) {
                _error.value = e.localizedMessage ?: "Kunde inte uppdatera språk"
            }
        }
    }

    fun updateNotifications(notifications: NotificationPreferences) {
        viewModelScope.launch {
            try {
                settingsRepository.updateNotifications(notifications)
            } catch (e: Exception) {
                _error.value = e.localizedMessage ?: "Kunde inte uppdatera notiser"
            }
        }
    }

    fun clearError() {
        _error.value = null
    }
}
