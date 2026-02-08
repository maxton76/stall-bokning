package com.equiduty.ui.settings

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontStyle
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
    val notifications = prefs.notifications

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
            // Section 1: Kanaler (Channels)
            SectionHeader(title = "Kanaler")

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

            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

            // Section 2: Kategorier (Categories)
            SectionHeader(title = "Kategorier")

            NotificationToggle(
                title = "Pass & rutiner",
                subtitle = "Notiser om rutiner och schemaändringar",
                checked = notifications.routines,
                onCheckedChange = {
                    viewModel.updateNotifications(notifications.copy(routines = it))
                }
            )

            NotificationToggle(
                title = "Utfodring",
                subtitle = "Notiser om utfodringstider och ändringar",
                checked = notifications.feeding,
                onCheckedChange = {
                    viewModel.updateNotifications(notifications.copy(feeding = it))
                }
            )

            NotificationToggle(
                title = "Aktiviteter",
                subtitle = "Notiser om hästaktiviteter",
                checked = notifications.activities,
                onCheckedChange = {
                    viewModel.updateNotifications(notifications.copy(activities = it))
                }
            )

            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

            // Section 3: Tysta timmar (Quiet Hours)
            SectionHeader(title = "Tysta timmar")

            ListItem(
                headlineContent = { Text("Aktivera tysta timmar") },
                supportingContent = { Text("Stäng av notiser under natten") },
                trailingContent = {
                    Switch(
                        checked = false,
                        onCheckedChange = null,
                        enabled = false
                    )
                }
            )

            ListItem(
                headlineContent = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "22:00 – 07:00",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                supportingContent = {
                    Text(
                        text = "Standardtider för tysta timmar",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Outlined.Info,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.outline,
                    modifier = Modifier.size(16.dp)
                )
                Text(
                    text = "Fullständiga inställningar kommer snart",
                    style = MaterialTheme.typography.bodySmall,
                    fontStyle = FontStyle.Italic,
                    color = MaterialTheme.colorScheme.outline
                )
            }
        }
    }
}

@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleSmall,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
    )
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
