package com.equiduty.ui.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.equiduty.R
import com.equiduty.ui.navigation.Route

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    navController: NavController,
    onSignOut: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel()
) {
    val user by viewModel.currentUser.collectAsState()
    val selectedOrg by viewModel.selectedOrganization.collectAsState()
    val selectedStable by viewModel.selectedStable.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Inställningar") })
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(padding)
        ) {
            // User section
            user?.let { u ->
                ListItem(
                    headlineContent = { Text("${u.firstName} ${u.lastName}") },
                    supportingContent = { Text(u.email) },
                    leadingContent = {
                        Icon(Icons.Default.AccountCircle, contentDescription = null, modifier = Modifier.size(40.dp))
                    }
                )
                HorizontalDivider()
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Account
            SettingsItem(
                icon = Icons.Default.Person,
                title = "Konto",
                subtitle = "Namn, e-post, roll",
                onClick = { navController.navigate(Route.Account.route) }
            )

            // Organization
            SettingsItem(
                icon = Icons.Default.Business,
                title = "Organisation",
                subtitle = selectedOrg?.name ?: "Välj organisation",
                onClick = { navController.navigate(Route.OrganizationSelection.route) }
            )

            // Stable
            SettingsItem(
                icon = Icons.Default.Home,
                title = "Stall",
                subtitle = selectedStable?.name ?: "Välj stall",
                onClick = { navController.navigate(Route.StableSelection.route) }
            )

            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

            // Notifications
            SettingsItem(
                icon = Icons.Default.Notifications,
                title = "Notifikationer",
                subtitle = "E-post, push, SMS",
                onClick = { navController.navigate(Route.NotificationSettings.route) }
            )

            // Language
            SettingsItem(
                icon = Icons.Default.Language,
                title = "Språk",
                subtitle = "Svenska / English",
                onClick = { navController.navigate(Route.LanguageSettings.route) }
            )

            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

            // Legal
            val uriHandler = LocalUriHandler.current

            Text(
                text = stringResource(R.string.settings_legal),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 16.dp, top = 8.dp, bottom = 4.dp)
            )

            SettingsItem(
                icon = Icons.Default.PrivacyTip,
                title = stringResource(R.string.settings_privacy_policy),
                subtitle = "equiduty.se/privacy",
                onClick = { uriHandler.openUri("https://equiduty.se/privacy") }
            )

            SettingsItem(
                icon = Icons.Default.Gavel,
                title = stringResource(R.string.settings_terms_of_service),
                subtitle = "equiduty.se/terms",
                onClick = { uriHandler.openUri("https://equiduty.se/terms") }
            )

            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

            // Sign out
            ListItem(
                headlineContent = {
                    Text("Logga ut", color = MaterialTheme.colorScheme.error)
                },
                leadingContent = {
                    Icon(
                        Icons.AutoMirrored.Filled.ExitToApp,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.error
                    )
                },
                modifier = Modifier.clickable(onClick = onSignOut)
            )
        }
    }
}

@Composable
private fun SettingsItem(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit
) {
    ListItem(
        headlineContent = { Text(title) },
        supportingContent = { Text(subtitle) },
        leadingContent = { Icon(icon, contentDescription = null) },
        trailingContent = {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null)
        },
        modifier = Modifier.clickable(onClick = onClick)
    )
}
