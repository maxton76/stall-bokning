package com.equiduty.data.repository

import com.equiduty.data.remote.api.EquiDutyApi
import com.equiduty.data.remote.dto.PartialNotificationPreferencesDto
import com.equiduty.data.remote.dto.UpdatePreferencesDto
import com.equiduty.domain.model.NotificationPreferences
import com.equiduty.domain.model.UserPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SettingsRepository @Inject constructor(
    private val api: EquiDutyApi
) {
    private val _preferences = MutableStateFlow(UserPreferences.DEFAULTS)
    val preferences: StateFlow<UserPreferences> = _preferences.asStateFlow()

    suspend fun fetchPreferences() {
        try {
            val response = api.getUserPreferences()
            val dto = response.preferences
            _preferences.value = UserPreferences(
                defaultStableId = dto.defaultStableId,
                defaultOrganizationId = dto.defaultOrganizationId,
                language = dto.language,
                timezone = dto.timezone,
                notifications = NotificationPreferences(
                    email = dto.notifications.email,
                    push = dto.notifications.push,
                    routines = dto.notifications.routines,
                    feeding = dto.notifications.feeding,
                    activities = dto.notifications.activities
                ),
                updatedAt = dto.updatedAt
            )
        } catch (e: Exception) {
            Timber.e(e, "Failed to fetch preferences")
        }
    }

    suspend fun updateLanguage(language: String) {
        try {
            api.updateUserPreferences(UpdatePreferencesDto(language = language))
            _preferences.value = _preferences.value.copy(language = language)
        } catch (e: Exception) {
            Timber.e(e, "Failed to update language")
            throw e
        }
    }

    suspend fun updateNotifications(notifications: NotificationPreferences) {
        try {
            api.updateUserPreferences(
                UpdatePreferencesDto(
                    notifications = PartialNotificationPreferencesDto(
                        email = notifications.email,
                        push = notifications.push,
                        routines = notifications.routines,
                        feeding = notifications.feeding,
                        activities = notifications.activities
                    )
                )
            )
            _preferences.value = _preferences.value.copy(notifications = notifications)
        } catch (e: Exception) {
            Timber.e(e, "Failed to update notifications")
            throw e
        }
    }
}
