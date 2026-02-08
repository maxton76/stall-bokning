package com.equiduty.domain.model

data class AppNotification(
    val id: String,
    val userId: String,
    val type: NotificationType,
    val priority: NotificationPriority,
    val title: String,
    val body: String,
    val read: Boolean,
    val readAt: String?,
    val actionUrl: String?,
    val entityType: String?,
    val entityId: String?,
    val createdAt: String,
    val updatedAt: String
)

enum class NotificationType(val value: String) {
    SHIFT_REMINDER("shift_reminder"),
    SHIFT_ASSIGNED("shift_assigned"),
    SHIFT_UNASSIGNED("shift_unassigned"),
    SHIFT_COMPLETED("shift_completed"),
    SHIFT_MISSED("shift_missed"),
    HEALTH_REMINDER("health_reminder"),
    HEALTH_OVERDUE("health_overdue"),
    ACTIVITY_CREATED("activity_created"),
    ACTIVITY_UPDATED("activity_updated"),
    ACTIVITY_CANCELLED("activity_cancelled"),
    DAILY_SUMMARY("daily_summary"),
    WEEKLY_SUMMARY("weekly_summary"),
    SYSTEM_ALERT("system_alert"),
    SELECTION_TURN_STARTED("selection_turn_started"),
    SELECTION_PROCESS_COMPLETED("selection_process_completed"),
    MEMBERSHIP_INVITE("membership_invite"),
    MEMBERSHIP_INVITE_RESPONSE("membership_invite_response"),
    FEATURE_REQUEST_STATUS_CHANGE("feature_request_status_change"),
    FEATURE_REQUEST_ADMIN_RESPONSE("feature_request_admin_response"),
    TRIAL_EXPIRING("trial_expiring"),
    SUBSCRIPTION_EXPIRING("subscription_expiring"),
    PAYMENT_FAILED("payment_failed"),
    PAYMENT_METHOD_REQUIRED("payment_method_required"),
    UNKNOWN("unknown");

    companion object {
        fun fromValue(value: String): NotificationType =
            entries.find { it.value == value } ?: UNKNOWN
    }
}

enum class NotificationPriority(val value: String) {
    LOW("low"),
    NORMAL("normal"),
    HIGH("high"),
    URGENT("urgent");

    companion object {
        fun fromValue(value: String): NotificationPriority =
            entries.find { it.value == value } ?: NORMAL
    }
}
