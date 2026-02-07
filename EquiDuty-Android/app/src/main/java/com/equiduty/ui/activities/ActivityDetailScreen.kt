package com.equiduty.ui.activities

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.equiduty.domain.model.ActivityInstanceStatus
import com.equiduty.ui.components.StatusBadge
import com.equiduty.ui.navigation.Route

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActivityDetailScreen(
    navController: NavController,
    viewModel: ActivityDetailViewModel = hiltViewModel()
) {
    val activity by viewModel.activity.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(activity?.activityTypeName ?: "Aktivitet") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Tillbaka")
                    }
                },
                actions = {
                    activity?.let {
                        IconButton(
                            onClick = { navController.navigate(Route.ActivityForm.createRoute(it.id)) }
                        ) {
                            Icon(Icons.Default.Edit, "Redigera")
                        }
                    }
                }
            )
        }
    ) { padding ->
        if (isLoading && activity == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            activity?.let { act ->
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(padding)
                        .padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(act.activityTypeName, style = MaterialTheme.typography.headlineSmall)
                        StatusBadge(
                            text = when (act.status) {
                                ActivityInstanceStatus.PENDING -> "Väntande"
                                ActivityInstanceStatus.IN_PROGRESS -> "Pågår"
                                ActivityInstanceStatus.COMPLETED -> "Klar"
                                ActivityInstanceStatus.CANCELLED -> "Avbruten"
                                ActivityInstanceStatus.OVERDUE -> "Försenad"
                            },
                            color = when (act.status) {
                                ActivityInstanceStatus.PENDING -> MaterialTheme.colorScheme.outline
                                ActivityInstanceStatus.IN_PROGRESS -> MaterialTheme.colorScheme.primary
                                ActivityInstanceStatus.COMPLETED -> MaterialTheme.colorScheme.tertiary
                                ActivityInstanceStatus.CANCELLED -> MaterialTheme.colorScheme.outline
                                ActivityInstanceStatus.OVERDUE -> MaterialTheme.colorScheme.error
                            }
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    DetailRow("Kategori", act.activityTypeCategory.value)
                    DetailRow("Datum", act.scheduledDate)
                    act.scheduledTime?.let { time ->
                        DetailRow("Tid", buildString {
                            append(time)
                            act.duration?.let { append(" ($it min)") }
                        })
                    }
                    act.assignedToName?.let { DetailRow("Tilldelad", it) }

                    if (act.horseNames.isNotEmpty()) {
                        DetailRow("Hästar", act.horseNames.joinToString(", "))
                    }

                    act.notes?.let {
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Anteckningar", style = MaterialTheme.typography.titleSmall)
                        Text(it, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
    ) {
        Text(
            text = "$label: ",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(text = value, style = MaterialTheme.typography.bodyMedium)
    }
}
