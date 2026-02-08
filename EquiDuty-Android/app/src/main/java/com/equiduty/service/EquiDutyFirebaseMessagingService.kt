package com.equiduty.service

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.net.Uri
import androidx.core.app.NotificationCompat
import com.equiduty.MainActivity
import com.equiduty.R
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import timber.log.Timber

class EquiDutyFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        Timber.d("New FCM token: $token")
        // Token will be registered when user logs in via NotificationRepository
    }

    override fun onMessageReceived(message: RemoteMessage) {
        Timber.d("FCM message received: ${message.data}")

        val title = message.data["title"] ?: message.notification?.title ?: return
        val body = message.data["body"] ?: message.notification?.body ?: ""
        val actionUrl = message.data["actionUrl"]
        val type = message.data["type"] ?: "system_alert"
        val priority = message.data["priority"] ?: "normal"

        val channelId = mapTypeToChannel(type)
        val notificationPriority = mapPriority(priority)

        val intent = if (actionUrl != null) {
            Intent(Intent.ACTION_VIEW, Uri.parse(actionUrl)).apply {
                setPackage(packageName)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
        } else {
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
        }

        val pendingIntent = PendingIntent.getActivity(
            this, System.currentTimeMillis().toInt(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(notificationPriority)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }

    private fun mapTypeToChannel(type: String): String = when (type) {
        "shift_reminder", "health_reminder", "health_overdue" -> "reminders"
        "activity_created", "activity_updated", "activity_cancelled",
        "shift_completed", "shift_assigned", "shift_unassigned", "shift_missed" -> "activity_updates"
        "daily_summary", "weekly_summary" -> "system"
        "membership_invite", "membership_invite_response",
        "selection_turn_started", "selection_process_completed" -> "membership"
        "trial_expiring", "subscription_expiring",
        "payment_failed", "payment_method_required" -> "billing"
        else -> "system"
    }

    private fun mapPriority(priority: String): Int = when (priority) {
        "urgent" -> NotificationCompat.PRIORITY_HIGH
        "high" -> NotificationCompat.PRIORITY_DEFAULT
        "low" -> NotificationCompat.PRIORITY_LOW
        else -> NotificationCompat.PRIORITY_DEFAULT
    }
}
