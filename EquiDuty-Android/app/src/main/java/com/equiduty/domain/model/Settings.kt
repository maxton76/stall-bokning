package com.equiduty.domain.model

/**
 * User preferences synced across devices
 * Matches backend UserPreferences type from packages/shared/src/types/userSettings.ts
 */
data class UserPreferences(
    val defaultStableId: String?,
    val defaultOrganizationId: String?,
    val language: String,
    val timezone: String,
    val notifications: NotificationPreferences,
    val updatedAt: String?
) {
    companion object {
        val DEFAULTS = UserPreferences(
            defaultStableId = null,
            defaultOrganizationId = null,
            language = "sv",
            timezone = "Europe/Stockholm",
            notifications = NotificationPreferences.DEFAULTS,
            updatedAt = null
        )
    }
}

/**
 * Notification preferences synced across devices
 * Matches backend UserNotificationPreferences type
 */
data class NotificationPreferences(
    val email: Boolean,
    val push: Boolean,
    val routines: Boolean,
    val feeding: Boolean,
    val activities: Boolean
) {
    companion object {
        val DEFAULTS = NotificationPreferences(
            email = true,
            push = false,
            routines = true,
            feeding = true,
            activities = true
        )
    }
}
