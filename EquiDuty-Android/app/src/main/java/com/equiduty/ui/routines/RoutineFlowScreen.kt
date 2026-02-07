package com.equiduty.ui.routines

import androidx.compose.foundation.layout.*
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
                        step = state.step,
                        currentIndex = state.currentStepIndex,
                        totalSteps = state.totalSteps,
                        onComplete = { viewModel.completeCurrentStep() },
                        onSkip = { viewModel.skipCurrentStep() }
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
                        containerColor = if (alert.priority == NotePriority.HIGH)
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
                        Text(note.notes, style = MaterialTheme.typography.bodyMedium)
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
    step: RoutineStep,
    currentIndex: Int,
    totalSteps: Int,
    onComplete: () -> Unit,
    onSkip: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Progress indicator
        LinearProgressIndicator(
            progress = { (currentIndex + 1).toFloat() / totalSteps },
            modifier = Modifier.fillMaxWidth()
        )
        Text(
            text = "Steg ${currentIndex + 1} av $totalSteps",
            style = MaterialTheme.typography.labelMedium,
            modifier = Modifier.padding(vertical = 8.dp)
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Step info
        Text(step.name, style = MaterialTheme.typography.headlineSmall)
        step.description?.let {
            Spacer(modifier = Modifier.height(8.dp))
            Text(it, style = MaterialTheme.typography.bodyLarge)
        }

        if (step.requiresPhoto) {
            Spacer(modifier = Modifier.height(8.dp))
            AssistChip(
                onClick = {},
                label = { Text("Foto krävs") },
                leadingIcon = { Icon(Icons.Default.PhotoCamera, null, modifier = Modifier.size(18.dp)) }
            )
        }

        Spacer(modifier = Modifier.weight(1f))

        // Action buttons
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (step.isOptional) {
                OutlinedButton(
                    onClick = onSkip,
                    modifier = Modifier.weight(1f).height(50.dp)
                ) {
                    Text("Hoppa över")
                }
            }
            Button(
                onClick = onComplete,
                modifier = Modifier.weight(1f).height(50.dp)
            ) {
                Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Slutför steg")
            }
        }
    }
}
