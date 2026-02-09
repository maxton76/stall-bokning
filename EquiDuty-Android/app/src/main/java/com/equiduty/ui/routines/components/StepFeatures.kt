package com.equiduty.ui.routines.components

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

@Composable
fun FeedingConfirmationSection(
    horse: Horse,
    isConfirmed: Boolean?,
    onConfirmedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.secondaryContainer
        ),
        modifier = modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.Restaurant,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.secondary,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Utfodring",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSecondaryContainer
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // TODO: Load actual feeding info from backend when available
            Text(
                text = "Bekräfta att ${horse.name} har fått mat enligt schema",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSecondaryContainer
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Checkbox(
                    checked = isConfirmed == true,
                    onCheckedChange = onConfirmedChange
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = "Utfodring bekräftad",
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }
    }
}

@Composable
fun MedicationTrackingSection(
    horse: Horse,
    medicationGiven: Boolean?,
    medicationSkipped: Boolean?,
    onMedicationGiven: () -> Unit,
    onMedicationSkipped: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var showSkipDialog by remember { mutableStateOf(false) }

    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.tertiaryContainer
        ),
        modifier = modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.Medication,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.tertiary,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Medicinering",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onTertiaryContainer
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // TODO: Load actual medication info from backend when available
            Text(
                text = "Bekräfta medicinering för ${horse.name}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onTertiaryContainer
            )

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = onMedicationGiven,
                    modifier = Modifier.weight(1f),
                    enabled = medicationGiven != true
                ) {
                    Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Given")
                }

                OutlinedButton(
                    onClick = { showSkipDialog = true },
                    modifier = Modifier.weight(1f),
                    enabled = medicationSkipped != true
                ) {
                    Icon(Icons.Default.Close, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Hoppa över")
                }
            }
        }
    }

    // Skip medication dialog
    if (showSkipDialog) {
        var skipReason by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { showSkipDialog = false },
            title = { Text("Hoppa över medicinering") },
            text = {
                OutlinedTextField(
                    value = skipReason,
                    onValueChange = { skipReason = it },
                    label = { Text("Anledning") },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("Ange varför medicineringen hoppas över...") }
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        onMedicationSkipped(skipReason)
                        showSkipDialog = false
                    },
                    enabled = skipReason.isNotEmpty()
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
fun BlanketActionSelector(
    horse: Horse,
    currentAction: BlanketAction?,
    onActionSelected: (BlanketAction) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        ),
        modifier = modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.Checkroom,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Täcke",
                    style = MaterialTheme.typography.titleSmall
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Välj täckeåtgärd för ${horse.name}",
                style = MaterialTheme.typography.bodyMedium
            )

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = currentAction == BlanketAction.ON,
                    onClick = { onActionSelected(BlanketAction.ON) },
                    label = { Text("Ta på") },
                    modifier = Modifier.weight(1f)
                )

                FilterChip(
                    selected = currentAction == BlanketAction.OFF,
                    onClick = { onActionSelected(BlanketAction.OFF) },
                    label = { Text("Ta av") },
                    modifier = Modifier.weight(1f)
                )

                FilterChip(
                    selected = currentAction == BlanketAction.UNCHANGED,
                    onClick = { onActionSelected(BlanketAction.UNCHANGED) },
                    label = { Text("Oförändrat") },
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}
