package com.equiduty.ui.routines

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.equiduty.domain.model.RoutineInstanceStatus
import com.equiduty.ui.components.ErrorView
import com.equiduty.ui.components.LoadingIndicator
import com.equiduty.ui.components.StatusBadge

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoutineInstanceDetailScreen(
    navController: NavController,
    viewModel: RoutineInstanceDetailViewModel = hiltViewModel()
) {
    val instance by viewModel.instance.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()

    var showCancelDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(instance?.templateName ?: "Rutindetaljer") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Tillbaka")
                    }
                },
                actions = {
                    // Cancel button (only if not already cancelled or completed)
                    instance?.let { inst ->
                        if (inst.status != RoutineInstanceStatus.CANCELLED && inst.status != RoutineInstanceStatus.COMPLETED) {
                            IconButton(onClick = { showCancelDialog = true }) {
                                Icon(Icons.Default.Cancel, "Avbryt rutin")
                            }
                        }
                    }
                }
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when {
                isLoading -> LoadingIndicator()
                error != null -> ErrorView(error ?: "Ett fel uppstod")
                instance != null -> {
                    // Use safe let to avoid force unwraps
                    instance?.let { inst ->
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .verticalScroll(rememberScrollState())
                                .padding(16.dp)
                        ) {
                            // Status and basic info
                            Card(
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(
                                    modifier = Modifier.padding(16.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = inst.templateName,
                                            style = MaterialTheme.typography.titleLarge
                                        )
                                        StatusBadge(inst.status.value)
                                    }

                                    Spacer(modifier = Modifier.height(8.dp))

                                    Text("Datum: ${inst.scheduledDate}")
                                    Text("Starttid: ${inst.scheduledStartTime}")
                                    Text("Beräknad tid: ${inst.estimatedDuration} min")

                                    inst.assignedToName?.let {
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text("Tilldelad: $it")
                                    }

                                    inst.startedByName?.let {
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text("Startad av: $it")
                                        inst.startedAt?.let { time ->
                                            Text("Starttid: $time", style = MaterialTheme.typography.bodySmall)
                                        }
                                    }

                                    inst.completedByName?.let {
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text("Slutförd av: $it")
                                        inst.completedAt?.let { time ->
                                            Text("Sluttid: $time", style = MaterialTheme.typography.bodySmall)
                                        }
                                    }

                                    inst.cancellationReason?.let {
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Card(
                                            colors = CardDefaults.cardColors(
                                                containerColor = MaterialTheme.colorScheme.errorContainer
                                            )
                                        ) {
                                            Text(
                                                text = "Avbruten: $it",
                                                modifier = Modifier.padding(8.dp),
                                                color = MaterialTheme.colorScheme.onErrorContainer
                                            )
                                        }
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            // Progress
                            Card(
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(
                                    modifier = Modifier.padding(16.dp)
                                ) {
                                    Text(
                                        text = "Framsteg",
                                        style = MaterialTheme.typography.titleMedium
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))

                                    LinearProgressIndicator(
                                        progress = { (inst.progress.percentComplete / 100.0).toFloat() },
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        "${inst.progress.stepsCompleted}/${inst.progress.stepsTotal} steg",
                                        style = MaterialTheme.typography.bodySmall
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            // Action buttons
                            when (inst.status) {
                                RoutineInstanceStatus.SCHEDULED -> {
                                    Button(
                                        onClick = { viewModel.startRoutine() },
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Icon(Icons.Default.PlayArrow, null)
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("Starta rutin")
                                    }
                                }
                                RoutineInstanceStatus.STARTED,
                                RoutineInstanceStatus.IN_PROGRESS -> {
                                    Button(
                                        onClick = {
                                            // Navigate to routine flow
                                            navController.navigate("routine-flow/${inst.id}")
                                        },
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Icon(Icons.Default.PlayArrow, null)
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("Fortsätt rutin")
                                    }

                                    Spacer(modifier = Modifier.height(8.dp))

                                    OutlinedButton(
                                        onClick = { viewModel.completeRoutine() },
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Icon(Icons.Default.Check, null)
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("Slutför rutin")
                                    }
                                }
                                RoutineInstanceStatus.COMPLETED,
                                RoutineInstanceStatus.MISSED,
                                RoutineInstanceStatus.CANCELLED -> {
                                    // No actions for completed, missed, or cancelled routines
                                }
                            }
                        }
                    }
                }
            }
        }

        // Cancel dialog
        if (showCancelDialog) {
            CancelRoutineDialog(
                onDismiss = { showCancelDialog = false },
                onConfirm = { reason ->
                    viewModel.cancelRoutine(reason)
                    showCancelDialog = false
                }
            )
        }
    }
}

@Composable
private fun CancelRoutineDialog(
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit
) {
    var reason by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Avbryt rutin") },
        text = {
            Column {
                Text("Är du säker på att du vill avbryta denna rutin?")
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = reason,
                    onValueChange = { reason = it },
                    label = { Text("Anledning (valfritt)") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(reason) },
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.error
                )
            ) {
                Text("Avbryt rutin")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Stäng")
            }
        }
    )
}
