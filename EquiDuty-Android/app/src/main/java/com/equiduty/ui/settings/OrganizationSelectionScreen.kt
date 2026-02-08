package com.equiduty.ui.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.equiduty.domain.model.Organization

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrganizationSelectionScreen(
    navController: NavController,
    viewModel: SettingsViewModel = hiltViewModel()
) {
    val organizations by viewModel.organizations.collectAsState()
    val selectedOrg by viewModel.selectedOrganization.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Välj organisation") },
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
            if (organizations.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = androidx.compose.ui.Alignment.Center
                ) {
                    Text(
                        text = "Inga organisationer hittades",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else {
                organizations.forEach { org ->
                    OrganizationItem(
                        organization = org,
                        isSelected = org.id == selectedOrg?.id,
                        onClick = {
                            viewModel.selectOrganization(org.id)
                            navController.popBackStack()
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun OrganizationItem(
    organization: Organization,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    ListItem(
        headlineContent = { Text(organization.name) },
        supportingContent = { Text(organization.organizationType.name) },
        leadingContent = { Icon(Icons.Default.Business, contentDescription = null) },
        trailingContent = {
            if (isSelected) {
                Icon(
                    Icons.Default.Check,
                    contentDescription = "Valt",
                    tint = MaterialTheme.colorScheme.primary
                )
            }
        },
        modifier = Modifier.clickable(onClick = onClick)
    )
}
