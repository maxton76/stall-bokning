package com.equiduty.ui.routines

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.equiduty.domain.model.DailyNotes
import com.equiduty.domain.model.NotePriority
import com.equiduty.domain.model.RoutineStep
import com.equiduty.ui.routines.components.HorseStepCard
import com.equiduty.ui.routines.components.StepTimer

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoutineFlowScreen(
    navController: NavController,
    viewModel: RoutineFlowViewModel = hiltViewModel()
) {
    val flowState by viewModel.flowState.collectAsState()
    val instance by viewModel.instance.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(instance?.template?.name ?: "Rutin") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Tillbaka")
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
            when (val state = flowState) {
                is FlowState.Loading -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }
                is FlowState.DailyNotesAcknowledgment -> {
                    DailyNotesView(
                        notes = state.notes,
                        onAcknowledge = viewModel::acknowledgeDailyNotes
                    )
                }
                is FlowState.StepExecution -> {
                    StepExecutionView(
                        state = state,
                        viewModel = viewModel
                    )
                }
                is FlowState.Completing -> {
                    Column(
                        modifier = Modifier.align(Alignment.Center),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        CircularProgressIndicator()
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Slutför rutin...")
                    }
                }
                is FlowState.Completed -> {
                    Column(
                        modifier = Modifier.align(Alignment.Center),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            Icons.Default.CheckCircle,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Rutin slutförd!", style = MaterialTheme.typography.headlineSmall)
                        Spacer(modifier = Modifier.height(24.dp))
                        Button(onClick = { navController.popBackStack() }) {
                            Text("Tillbaka till rutiner")
                        }
                    }
                }
                is FlowState.Error -> {
                    Column(
                        modifier = Modifier.align(Alignment.Center),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            Icons.Default.Error,
                            contentDescription = null,
                            modifier = Modifier.size(48.dp),
                            tint = MaterialTheme.colorScheme.error
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(state.message, color = MaterialTheme.colorScheme.error)
                    }
                }
            }
        }
    }
}

@Composable
private fun DailyNotesView(
    notes: DailyNotes,
    onAcknowledge: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text("Dagens anteckningar", style = MaterialTheme.typography.headlineSmall)
        Spacer(modifier = Modifier.height(16.dp))

        if (notes.alerts.isNotEmpty()) {
            Text("Varningar", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.error)
            notes.alerts.forEach { alert ->
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = if (alert.priority == NotePriority.CRITICAL)
                            MaterialTheme.colorScheme.errorContainer
                        else MaterialTheme.colorScheme.surfaceVariant
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                ) {
                    Text(alert.message, modifier = Modifier.padding(12.dp))
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
        }

        if (notes.horseNotes.isNotEmpty()) {
            Text("Hästanteckningar", style = MaterialTheme.typography.titleMedium)
            notes.horseNotes.forEach { note ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(note.horseName, style = MaterialTheme.typography.titleSmall)
                        Text(note.note, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
        }

        notes.generalNotes?.let {
            Text("Allmänna anteckningar", style = MaterialTheme.typography.titleMedium)
            Text(it, style = MaterialTheme.typography.bodyMedium)
            Spacer(modifier = Modifier.height(16.dp))
        }

        Button(
            onClick = onAcknowledge,
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp)
        ) {
            Text("Jag har läst anteckningarna")
        }
    }
}

@Composable
private fun StepExecutionView(
    state: FlowState.StepExecution,
    viewModel: RoutineFlowViewModel
) {
    var showIncompleteAlert by remember { mutableStateOf(false) }
    var generalNotes by remember { mutableStateOf("") }
    val isLastStep = state.currentStepIndex == state.totalSteps - 1

    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        // Progress indicator
        Column(modifier = Modifier.padding(16.dp)) {
            LinearProgressIndicator(
                progress = { (state.currentStepIndex + 1).toFloat() / state.totalSteps },
                modifier = Modifier.fillMaxWidth()
            )
            Text(
                text = "Steg ${state.currentStepIndex + 1} av ${state.totalSteps}",
                style = MaterialTheme.typography.labelMedium,
                modifier = Modifier.padding(vertical = 8.dp)
            )

            // Horse completion progress (if horses in step)
            if (state.horses.isNotEmpty()) {
                LinearProgressIndicator(
                    progress = { state.getCompletedHorseCount().toFloat() / state.horses.size },
                    modifier = Modifier.fillMaxWidth()
                )
                Text(
                    text = "${state.getCompletedHorseCount()} av ${state.horses.size} hästar klara",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(vertical = 4.dp)
                )
            }
        }

        // Step info
        Column(modifier = Modifier.padding(horizontal = 16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    state.step.name,
                    style = MaterialTheme.typography.headlineSmall,
                    modifier = Modifier.weight(1f)
                )
                StepTimer(estimatedMinutes = state.step.estimatedMinutes)
            }

            state.step.description?.let {
                Spacer(modifier = Modifier.height(8.dp))
                Text(it, style = MaterialTheme.typography.bodyMedium)
            }

            if (state.step.allowPhotoEvidence) {
                Spacer(modifier = Modifier.height(8.dp))
                AssistChip(
                    onClick = {},
                    label = { Text("Foto tillåtet") },
                    leadingIcon = { Icon(Icons.Default.PhotoCamera, null, modifier = Modifier.size(18.dp)) }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Horse list
        if (state.horses.isNotEmpty()) {
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentPadding = PaddingValues(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(state.horses) { horse ->
                    HorseStepCard(
                        horse = horse,
                        progress = state.horseProgressMap[horse.id],
                        step = state.step,
                        onMarkDone = { horseId ->
                            viewModel.markHorseDone(horseId)
                        },
                        onSkip = { horseId, reason ->
                            viewModel.markHorseSkipped(horseId, reason)
                        },
                        onNotesChange = { horseId, notes ->
                            viewModel.updateHorseNotes(horseId, notes)
                        },
                        onFeedingConfirmedChange = if (state.step.showFeeding) {
                            { horseId, confirmed -> viewModel.updateFeedingConfirmation(horseId, confirmed) }
                        } else null,
                        onMedicationGiven = if (state.step.showMedication) {
                            { horseId -> viewModel.updateMedicationGiven(horseId) }
                        } else null,
                        onMedicationSkipped = if (state.step.showMedication) {
                            { horseId, reason -> viewModel.updateMedicationSkipped(horseId, reason) }
                        } else null,
                        onBlanketActionChange = if (state.step.showBlanketStatus) {
                            { horseId, action -> viewModel.updateBlanketAction(horseId, action) }
                        } else null
                    )
                }

                // General Notes Input (always shown at bottom of list)
                item {
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant
                        )
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                "Allmänna anteckningar för steget",
                                style = MaterialTheme.typography.titleSmall
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            OutlinedTextField(
                                value = generalNotes,
                                onValueChange = { generalNotes = it },
                                label = { Text("Anteckningar") },
                                placeholder = { Text("Lägg till allmänna anteckningar...") },
                                modifier = Modifier.fillMaxWidth(),
                                minLines = 2,
                                maxLines = 4
                            )
                        }
                    }
                }
            }
        } else {
            // No horses in step, show general notes prominently
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 16.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                OutlinedTextField(
                    value = generalNotes,
                    onValueChange = { generalNotes = it },
                    label = { Text("Anteckningar") },
                    placeholder = { Text("Lägg till anteckningar...") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 3,
                    maxLines = 6
                )
            }
        }

        // Action buttons
        Surface(
            shadowElevation = 8.dp,
            tonalElevation = 2.dp
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (state.step.allowPartialCompletion) {
                    OutlinedButton(
                        onClick = { viewModel.skipCurrentStep() },
                        modifier = Modifier.weight(1f).height(50.dp)
                    ) {
                        Text("Hoppa över steg")
                    }
                }
                Button(
                    onClick = {
                        if (state.canProceed()) {
                            viewModel.completeCurrentStep(generalNotes.ifEmpty { null })
                        } else {
                            showIncompleteAlert = true
                        }
                    },
                    modifier = Modifier.weight(1f).height(50.dp)
                ) {
                    Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(if (isLastStep) "Slutför rutin" else "Nästa steg")
                }
            }
        }
    }

    // Incomplete alert dialog
    if (showIncompleteAlert) {
        AlertDialog(
            onDismissRequest = { showIncompleteAlert = false },
            title = { Text("Ofullständiga hästar") },
            text = {
                Text("${state.getUnmarkedHorseCount()} hästar är inte markerade som klara eller överhoppade. Vill du markera alla som klara?")
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.markAllRemainingAsDone()
                        viewModel.completeCurrentStep(generalNotes.ifEmpty { null })
                        showIncompleteAlert = false
                    }
                ) {
                    Text("Markera alla som klara")
                }
            },
            dismissButton = {
                TextButton(onClick = { showIncompleteAlert = false }) {
                    Text("Avbryt")
                }
            }
        )
    }
}
