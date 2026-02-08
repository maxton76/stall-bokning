package com.equiduty.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class NotificationsResponseDto(
    val notifications: List<NotificationDto>
)

@Serializable
data class NotificationDto(
    val id: String,
    val userId: String,
    val type: String,
    val priority: String,
    val title: String,
    val body: String,
    val read: Boolean,
    val readAt: String? = null,
    val actionUrl: String? = null,
    val entityType: String? = null,
    val entityId: String? = null,
    val createdAt: String,
    val updatedAt: String
)

@Serializable
data class RegisterFcmTokenDto(
    val token: String,
    val deviceId: String,
    val platform: String = "android"
)
