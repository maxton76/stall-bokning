package com.equiduty.ui.featurerequests

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Undo
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import java.util.Locale
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.equiduty.R
import com.equiduty.domain.model.FeatureRequestCategory

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateFeatureRequestScreen(
    navController: NavController,
    viewModel: CreateFeatureRequestViewModel = hiltViewModel()
) {
    // Get device locale (similar to iOS implementation)
    val configuration = LocalConfiguration.current
    val deviceLanguage = remember {
        val locale = configuration.locales[0] ?: Locale.getDefault()
        if (locale.language == "en") "en" else "sv"
    }

    val title by viewModel.title.collectAsState()
    val description by viewModel.description.collectAsState()
    val selectedCategory by viewModel.selectedCategory.collectAsState()
    val isSubmitting by viewModel.isSubmitting.collectAsState()
    val isRefining by viewModel.isRefining.collectAsState()
    val isShowingRefined by viewModel.isShowingRefined.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val didCreate by viewModel.didCreate.collectAsState()

    var expanded by remember { mutableStateOf(false) }

    LaunchedEffect(didCreate) {
        if (didCreate) {
            navController.popBackStack()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.fr_create_title)) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.cancel))
                    }
                },
                actions = {
                    TextButton(
                        onClick = { viewModel.submit() },
                        enabled = viewModel.isValid && !isSubmitting
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp))
                        } else {
                            Text(stringResource(R.string.fr_submit))
                        }
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Title
            OutlinedTextField(
                value = title,
                onValueChange = { viewModel.setTitle(it) },
                label = { Text(stringResource(R.string.fr_form_title)) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                supportingText = {
                    if (title.isNotEmpty() && title.trim().length < 5) {
                        Text(stringResource(R.string.fr_validation_title_min))
                    }
                },
                isError = title.isNotEmpty() && title.trim().length < 5
            )

            // Description
            OutlinedTextField(
                value = description,
                onValueChange = { viewModel.setDescription(it) },
                label = { Text(stringResource(R.string.fr_form_description)) },
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 120.dp),
                minLines = 4,
                supportingText = {
                    if (description.isNotEmpty() && description.trim().length < 20) {
                        Text(stringResource(R.string.fr_validation_description_min))
                    }
                },
                isError = description.isNotEmpty() && description.trim().length < 20
            )

            // Category picker
            Box {
                OutlinedTextField(
                    value = stringResource(categoryDisplayRes(selectedCategory)),
                    onValueChange = {},
                    label = { Text(stringResource(R.string.fr_form_category)) },
                    modifier = Modifier.fillMaxWidth(),
                    readOnly = true,
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) }
                )
                DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                    FeatureRequestCategory.entries.forEach { cat ->
                        DropdownMenuItem(
                            text = { Text(stringResource(categoryDisplayRes(cat))) },
                            onClick = {
                                viewModel.setCategory(cat)
                                expanded = false
                            }
                        )
                    }
                }
                // Invisible overlay to capture clicks
                Surface(
                    modifier = Modifier
                        .matchParentSize(),
                    color = MaterialTheme.colorScheme.surface.copy(alpha = 0f),
                    onClick = { expanded = true }
                ) {}
            }

            // AI Refine / Revert buttons
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (isShowingRefined) {
                    OutlinedButton(
                        onClick = { viewModel.revertToOriginal() }
                    ) {
                        Icon(Icons.Default.Undo, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(stringResource(R.string.fr_revert_original))
                    }
                }

                FilledTonalButton(
                    onClick = { viewModel.refine(language = deviceLanguage) },
                    enabled = !isRefining && title.isNotBlank() && description.isNotBlank()
                ) {
                    if (isRefining) {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(stringResource(R.string.fr_refining))
                    } else {
                        Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(stringResource(R.string.fr_improve_ai))
                    }
                }
            }

            // Error message
            if (errorMessage != null) {
                Text(
                    text = errorMessage!!,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}

private fun categoryDisplayRes(category: FeatureRequestCategory): Int = when (category) {
    FeatureRequestCategory.IMPROVEMENT -> R.string.fr_category_improvement
    FeatureRequestCategory.NEW_FEATURE -> R.string.fr_category_new_feature
    FeatureRequestCategory.INTEGRATION -> R.string.fr_category_integration
    FeatureRequestCategory.BUG_FIX -> R.string.fr_category_bug_fix
    FeatureRequestCategory.OTHER -> R.string.fr_category_other
}
