package com.equiduty.ui.routines.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.equiduty.domain.model.BlanketAction
import com.equiduty.domain.model.Horse
import com.equiduty.domain.model.HorseStepProgress
import com.equiduty.domain.model.RoutineStep

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HorseStepCard(
    horse: Horse,
    progress: HorseStepProgress?,
    step: RoutineStep,
    onMarkDone: (String) -> Unit,
    onSkip: (String, String) -> Unit,
    onNotesChange: (String, String) -> Unit,
    onFeedingConfirmedChange: ((String, Boolean) -> Unit)? = null,
    onMedicationGiven: ((String) -> Unit)? = null,
    onMedicationSkipped: ((String, String) -> Unit)? = null,
    onBlanketActionChange: ((String, BlanketAction) -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    var expanded by remember { mutableStateOf(false) }
    var notes by remember(progress?.notes) { mutableStateOf(progress?.notes ?: "") }
    var showSkipDialog by remember { mutableStateOf(false) }

    Card(
        onClick = { expanded = !expanded },
        modifier = modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(12.dp)
        ) {
            // Header Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Horse Avatar placeholder (could add Coil for photo)
                Surface(
                    modifier = Modifier.size(40.dp),
                    shape = MaterialTheme.shapes.small,
                    color = MaterialTheme.colorScheme.secondaryContainer
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            Icons.Default.Pets,
                            contentDescription = null,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.width(12.dp))

                // Horse Info
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = horse.name,
                        style = MaterialTheme.typography.titleMedium
                    )
                    // Placeholder for placement info - will be added when placement field exists
                    horse.horseGroupName?.let {
                        Text(
                            text = it,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Spacer(modifier = Modifier.width(8.dp))

                // Completion Badge
                CompletionBadge(progress)

                Spacer(modifier = Modifier.width(4.dp))

                // Expand Indicator
                Icon(
                    if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = if (expanded) "Dölj" else "Visa mer"
                )
            }

            // Expanded Content
            AnimatedVisibility(
                visible = expanded,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically()
            ) {
                Column(
                    modifier = Modifier.padding(top = 12.dp)
                ) {
                    // Notes Input
                    OutlinedTextField(
                        value = notes,
                        onValueChange = {
                            notes = it
                            onNotesChange(horse.id, it)
                        },
                        label = { Text("Anteckningar för ${horse.name}") },
                        placeholder = { Text("Lägg till anteckningar...") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2,
                        maxLines = 4
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    // Special Instructions if available
                    if (horse.hasSpecialInstructions == true && horse.specialInstructions != null) {
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.secondaryContainer
                            )
                        ) {
                            Row(
                                modifier = Modifier.padding(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.Info,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = horse.specialInstructions,
                                    style = MaterialTheme.typography.bodySmall
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    // Step-specific features
                    if (step.showFeeding && onFeedingConfirmedChange != null) {
                        FeedingConfirmationSection(
                            horse = horse,
                            isConfirmed = progress?.feedingConfirmed,
                            onConfirmedChange = { confirmed ->
                                onFeedingConfirmedChange(horse.id, confirmed)
                            }
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    if (step.showMedication && onMedicationGiven != null && onMedicationSkipped != null) {
                        MedicationTrackingSection(
                            horse = horse,
                            medicationGiven = progress?.medicationGiven,
                            medicationSkipped = progress?.medicationSkipped,
                            onMedicationGiven = { onMedicationGiven(horse.id) },
                            onMedicationSkipped = { reason -> onMedicationSkipped(horse.id, reason) }
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    if (step.showBlanketStatus && onBlanketActionChange != null) {
                        BlanketActionSelector(
                            horse = horse,
                            currentAction = progress?.blanketAction,
                            onActionSelected = { action ->
                                onBlanketActionChange(horse.id, action)
                            }
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    // Action Buttons
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = { onMarkDone(horse.id) },
                            modifier = Modifier.weight(1f),
                            enabled = progress?.completed != true
                        ) {
                            Icon(
                                Icons.Default.Check,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Klar")
                        }

                        OutlinedButton(
                            onClick = { showSkipDialog = true },
                            modifier = Modifier.weight(1f),
                            enabled = progress?.skipped != true
                        ) {
                            Icon(
                                Icons.Default.Close,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Hoppa över")
                        }
                    }
                }
            }
        }
    }

    // Skip Dialog
    if (showSkipDialog) {
        var skipReason by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { showSkipDialog = false },
            title = { Text("Hoppa över ${horse.name}") },
            text = {
                OutlinedTextField(
                    value = skipReason,
                    onValueChange = { skipReason = it },
                    label = { Text("Anledning (valfritt)") },
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        onSkip(horse.id, skipReason)
                        showSkipDialog = false
                    }
                ) {
                    Text("Bekräfta")
                }
            },
            dismissButton = {
                TextButton(onClick = { showSkipDialog = false }) {
                    Text("Avbryt")
                }
            }
        )
    }
}

@Composable
private fun CompletionBadge(progress: HorseStepProgress?) {
    when {
        progress?.completed == true -> {
            Surface(
                shape = MaterialTheme.shapes.small,
                color = MaterialTheme.colorScheme.primaryContainer
            ) {
                Icon(
                    Icons.Default.CheckCircle,
                    contentDescription = "Klar",
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier
                        .padding(4.dp)
                        .size(20.dp)
                )
            }
        }
        progress?.skipped == true -> {
            Surface(
                shape = MaterialTheme.shapes.small,
                color = MaterialTheme.colorScheme.errorContainer
            ) {
                Icon(
                    Icons.Default.Close,
                    contentDescription = "Överhoppad",
                    tint = MaterialTheme.colorScheme.error,
                    modifier = Modifier
                        .padding(4.dp)
                        .size(20.dp)
                )
            }
        }
        else -> {
            Surface(
                shape = MaterialTheme.shapes.small,
                color = MaterialTheme.colorScheme.surfaceVariant
            ) {
                Icon(
                    Icons.Default.Circle,
                    contentDescription = "Ej utförd",
                    tint = MaterialTheme.colorScheme.outline,
                    modifier = Modifier
                        .padding(4.dp)
                        .size(20.dp)
                )
            }
        }
    }
}
