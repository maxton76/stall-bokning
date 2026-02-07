package com.equiduty.ui.settings

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationSettingsScreen(
    navController: NavController,
    viewModel: SettingsViewModel = hiltViewModel()
) {
    val prefs by viewModel.preferences.collectAsState()
    val notifications = prefs.notificationPreferences

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Notifikationer") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Tillbaka")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            NotificationToggle(
                title = "E-post",
                subtitle = "Få notifikationer via e-post",
                checked = notifications.email,
                onCheckedChange = {
                    viewModel.updateNotifications(notifications.copy(email = it))
                }
            )
            NotificationToggle(
                title = "Push-notiser",
                subtitle = "Få push-notiser på enheten",
                checked = notifications.push,
                onCheckedChange = {
                    viewModel.updateNotifications(notifications.copy(push = it))
                }
            )
            NotificationToggle(
                title = "SMS",
                subtitle = "Få SMS-notiser",
                checked = notifications.sms,
                onCheckedChange = {
                    viewModel.updateNotifications(notifications.copy(sms = it))
                }
            )
            NotificationToggle(
                title = "Telegram",
                subtitle = "Få notiser via Telegram",
                checked = notifications.telegram,
                onCheckedChange = {
                    viewModel.updateNotifications(notifications.copy(telegram = it))
                }
            )
        }
    }
}

@Composable
private fun NotificationToggle(
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    ListItem(
        headlineContent = { Text(title) },
        supportingContent = { Text(subtitle) },
        trailingContent = {
            Switch(checked = checked, onCheckedChange = onCheckedChange)
        }
    )
}
