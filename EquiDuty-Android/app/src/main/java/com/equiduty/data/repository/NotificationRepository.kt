package com.equiduty.data.repository

import android.content.Context
import android.provider.Settings
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.equiduty.data.remote.api.EquiDutyApi
import com.equiduty.data.remote.dto.RegisterFcmTokenDto
import com.equiduty.domain.model.AppNotification
import com.equiduty.domain.model.NotificationPriority
import com.equiduty.domain.model.NotificationType
import com.google.firebase.messaging.FirebaseMessaging
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.tasks.await
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

private val Context.fcmDataStore by preferencesDataStore(name = "fcm_prefs")

@Singleton
class NotificationRepository @Inject constructor(
    private val api: EquiDutyApi,
    @ApplicationContext private val context: Context
) {
    private val _notifications = MutableStateFlow<List<AppNotification>>(emptyList())
    val notifications: StateFlow<List<AppNotification>> = _notifications.asStateFlow()

    private val _unreadCount = MutableStateFlow(0)
    val unreadCount: StateFlow<Int> = _unreadCount.asStateFlow()

    private val fcmTokenKey = stringPreferencesKey("fcm_token")

    private fun getDeviceId(): String =
        Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)

    suspend fun fetchNotifications(limit: Int = 50, unreadOnly: Boolean = false) {
        try {
            val response = api.getNotifications(limit = limit, unreadOnly = unreadOnly)
            _notifications.value = response.notifications.map { dto ->
                AppNotification(
                    id = dto.id,
                    userId = dto.userId,
                    type = NotificationType.fromValue(dto.type),
                    priority = NotificationPriority.fromValue(dto.priority),
                    title = dto.title,
                    body = dto.body,
                    read = dto.read,
                    readAt = dto.readAt,
                    actionUrl = dto.actionUrl,
                    entityType = dto.entityType,
                    entityId = dto.entityId,
                    createdAt = dto.createdAt,
                    updatedAt = dto.updatedAt
                )
            }
            _unreadCount.value = _notifications.value.count { !it.read }
        } catch (e: Exception) {
            Timber.e(e, "Failed to fetch notifications")
        }
    }

    suspend fun markAsRead(notificationId: String) {
        try {
            api.markNotificationRead(notificationId)
            _notifications.value = _notifications.value.map {
                if (it.id == notificationId) it.copy(read = true) else it
            }
            _unreadCount.value = _notifications.value.count { !it.read }
        } catch (e: Exception) {
            Timber.e(e, "Failed to mark notification as read")
            throw e
        }
    }

    suspend fun markAllAsRead() {
        try {
            api.markAllNotificationsRead()
            _notifications.value = _notifications.value.map { it.copy(read = true) }
            _unreadCount.value = 0
        } catch (e: Exception) {
            Timber.e(e, "Failed to mark all as read")
            throw e
        }
    }

    suspend fun deleteNotification(notificationId: String) {
        try {
            api.deleteNotification(notificationId)
            _notifications.value = _notifications.value.filter { it.id != notificationId }
            _unreadCount.value = _notifications.value.count { !it.read }
        } catch (e: Exception) {
            Timber.e(e, "Failed to delete notification")
            throw e
        }
    }

    suspend fun clearRead() {
        try {
            api.clearReadNotifications()
            _notifications.value = _notifications.value.filter { !it.read }
        } catch (e: Exception) {
            Timber.e(e, "Failed to clear read notifications")
            throw e
        }
    }

    suspend fun registerFcmToken() {
        try {
            val token = FirebaseMessaging.getInstance().token.await()
            val deviceId = getDeviceId()
            api.registerFcmToken(RegisterFcmTokenDto(token = token, deviceId = deviceId, platform = "android"))
            context.fcmDataStore.edit { prefs -> prefs[fcmTokenKey] = token }
            Timber.d("FCM token registered: ${token.take(10)}...")
        } catch (e: Exception) {
            Timber.e(e, "Failed to register FCM token")
        }
    }

    suspend fun removeFcmToken() {
        try {
            val deviceId = getDeviceId()
            api.removeFcmToken(deviceId)
            context.fcmDataStore.edit { prefs -> prefs.remove(fcmTokenKey) }
            Timber.d("FCM token removed")
        } catch (e: Exception) {
            Timber.e(e, "Failed to remove FCM token")
        }
    }
}
