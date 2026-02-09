package com.equiduty.ui.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.equiduty.EquiDutyApp
import com.equiduty.MainActivity
import com.equiduty.util.findActivity

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LanguageSettingsScreen(
    navController: NavController,
    viewModel: SettingsViewModel = hiltViewModel()
) {
    val prefs by viewModel.preferences.collectAsState()
    val currentLanguage = prefs.language
    val context = LocalContext.current
    val activity = context.findActivity() as? MainActivity
    val app = context.applicationContext as? EquiDutyApp

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Språk") },
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
            LanguageOption(
                name = "Svenska",
                code = "sv",
                isSelected = currentLanguage == "sv",
                onClick = {
                    viewModel.updateLanguage("sv")
                    // Apply locale change immediately
                    app?.setLocale("sv")
                    // Recreate activity to apply changes throughout app
                    activity?.recreate()
                }
            )
            LanguageOption(
                name = "English",
                code = "en",
                isSelected = currentLanguage == "en",
                onClick = {
                    viewModel.updateLanguage("en")
                    // Apply locale change immediately
                    app?.setLocale("en")
                    // Recreate activity to apply changes throughout app
                    activity?.recreate()
                }
            )
        }
    }
}

@Composable
private fun LanguageOption(
    name: String,
    code: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    ListItem(
        headlineContent = { Text(name) },
        supportingContent = { Text(code) },
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
