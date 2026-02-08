package com.equiduty.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context

object NotificationChannelManager {
    fun createChannels(context: Context) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val channels = listOf(
            NotificationChannel(
                "reminders",
                "Påminnelser",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Påminnelser om pass och hälsovård"
            },
            NotificationChannel(
                "activity_updates",
                "Aktiviteter",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Uppdateringar om aktiviteter och pass"
            },
            NotificationChannel(
                "health",
                "Hälsa",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Hälsorelaterade notiser"
            },
            NotificationChannel(
                "membership",
                "Medlemskap",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Inbjudningar och medlemsuppdateringar"
            },
            NotificationChannel(
                "billing",
                "Betalning",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Betalnings- och prenumerationsnotiser"
            },
            NotificationChannel(
                "system",
                "System",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Systemmeddelanden och sammanfattningar"
            }
        )

        channels.forEach { manager.createNotificationChannel(it) }
    }
}
