package com.equiduty.ui.notifications

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel

@Composable
fun NotificationBadge(
    onClick: () -> Unit,
    viewModel: NotificationViewModel = hiltViewModel()
) {
    val unreadCount by viewModel.unreadCount.collectAsState()

    IconButton(onClick = onClick) {
        BadgedBox(
            badge = {
                if (unreadCount > 0) {
                    Badge { Text(if (unreadCount > 99) "99+" else unreadCount.toString()) }
                }
            }
        ) {
            Icon(Icons.Default.Notifications, contentDescription = "Notiser")
        }
    }
}
