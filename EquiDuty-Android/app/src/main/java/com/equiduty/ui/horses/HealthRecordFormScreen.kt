package com.equiduty.ui.horses

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HealthRecordFormScreen(
    navController: NavController,
    viewModel: HealthRecordFormViewModel = hiltViewModel()
) {
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()
    val isSaved by viewModel.isSaved.collectAsState()

    LaunchedEffect(isSaved) {
        if (isSaved) navController.popBackStack()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (viewModel.isEditing) "Redigera hälsojournal" else "Ny hälsojournal") },
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
                .verticalScroll(rememberScrollState())
                .padding(padding)
                .padding(horizontal = 16.dp)
        ) {
            Spacer(modifier = Modifier.height(8.dp))

            if (error != null) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = error ?: "",
                        modifier = Modifier.padding(16.dp),
                        color = MaterialTheme.colorScheme.onErrorContainer
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
            }

            // Professional info
            Text("Professionell typ", style = MaterialTheme.typography.labelMedium)
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(
                    selected = viewModel.professionalType.value == "veterinary",
                    onClick = { viewModel.professionalType.value = "veterinary" },
                    label = { Text("Veterinär") },
                    modifier = Modifier.weight(1f)
                )
                FilterChip(
                    selected = viewModel.professionalType.value == "farrier",
                    onClick = { viewModel.professionalType.value = "farrier" },
                    label = { Text("Hovslagare") },
                    modifier = Modifier.weight(1f)
                )
            }
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(
                    selected = viewModel.professionalType.value == "dentist",
                    onClick = { viewModel.professionalType.value = "dentist" },
                    label = { Text("Tandläkare") },
                    modifier = Modifier.weight(1f)
                )
                FilterChip(
                    selected = viewModel.professionalType.value == "other",
                    onClick = { viewModel.professionalType.value = "other" },
                    label = { Text("Annat") },
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = viewModel.professionalName.value,
                onValueChange = { viewModel.professionalName.value = it },
                label = { Text("Professionell namn") },
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = viewModel.date.value,
                onValueChange = { viewModel.date.value = it },
                label = { Text("Datum (ÅÅÅÅ-MM-DD) *") },
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Record type
            Text("Typ av besök", style = MaterialTheme.typography.labelMedium)
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(
                    selected = viewModel.type.value == "examination",
                    onClick = { viewModel.type.value = "examination" },
                    label = { Text("Undersökning") },
                    modifier = Modifier.weight(1f)
                )
                FilterChip(
                    selected = viewModel.type.value == "treatment",
                    onClick = { viewModel.type.value = "treatment" },
                    label = { Text("Behandling") },
                    modifier = Modifier.weight(1f)
                )
            }
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(
                    selected = viewModel.type.value == "surgery",
                    onClick = { viewModel.type.value = "surgery" },
                    label = { Text("Kirurgi") },
                    modifier = Modifier.weight(1f)
                )
                FilterChip(
                    selected = viewModel.type.value == "followup",
                    onClick = { viewModel.type.value = "followup" },
                    label = { Text("Uppföljning") },
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Details
            OutlinedTextField(
                value = viewModel.title.value,
                onValueChange = { viewModel.title.value = it },
                label = { Text("Titel *") },
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = viewModel.description.value,
                onValueChange = { viewModel.description.value = it },
                label = { Text("Beskrivning") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 3,
                singleLine = false
            )

            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = viewModel.diagnosis.value,
                onValueChange = { viewModel.diagnosis.value = it },
                label = { Text("Diagnos") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2,
                singleLine = false
            )

            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = viewModel.treatment.value,
                onValueChange = { viewModel.treatment.value = it },
                label = { Text("Behandling") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2,
                singleLine = false
            )

            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = viewModel.medications.value,
                onValueChange = { viewModel.medications.value = it },
                label = { Text("Mediciner (kommaseparerad)") },
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = viewModel.cost.value,
                onValueChange = { viewModel.cost.value = it },
                label = { Text("Kostnad (kr)") },
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Followup
            Text("Uppföljning", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = viewModel.followupDate.value,
                onValueChange = { viewModel.followupDate.value = it },
                label = { Text("Uppföljningsdatum (ÅÅÅÅ-MM-DD)") },
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = viewModel.followupNotes.value,
                onValueChange = { viewModel.followupNotes.value = it },
                label = { Text("Uppföljningsanteckningar") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2,
                singleLine = false
            )

            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = viewModel::save,
                enabled = !isLoading && viewModel.title.value.isNotBlank() && viewModel.date.value.isNotBlank(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text(if (viewModel.isEditing) "Spara ändringar" else "Skapa journal", fontSize = 16.sp)
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
