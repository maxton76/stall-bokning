package com.equiduty.ui.horses

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.equiduty.domain.model.HealthRecord
import com.equiduty.domain.model.VaccinationRecord
import com.equiduty.ui.components.EmptyStateView

@Composable
fun HorseHealthTab(
    viewModel: HorseDetailViewModel,
    navController: NavController? = null
) {
    val vaccinations by viewModel.vaccinations.collectAsState()
    val healthRecords by viewModel.healthRecords.collectAsState()
    var selectedFilter by remember { mutableStateOf<String?>(null) }

    Column(modifier = Modifier.fillMaxSize()) {
        // Filter chips
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            FilterChip(
                selected = selectedFilter == null,
                onClick = { selectedFilter = null },
                label = { Text("Alla") }
            )
            FilterChip(
                selected = selectedFilter == "veterinary",
                onClick = { selectedFilter = "veterinary" },
                label = { Text("Veterinär") }
            )
            FilterChip(
                selected = selectedFilter == "farrier",
                onClick = { selectedFilter = "farrier" },
                label = { Text("Hovslagare") }
            )
            FilterChip(
                selected = selectedFilter == "dentist",
                onClick = { selectedFilter = "dentist" },
                label = { Text("Tandläkare") }
            )
        }

        val filteredRecords = if (selectedFilter == null) {
            healthRecords
        } else {
            healthRecords.filter { it.professionalType.value == selectedFilter }
        }

        if (vaccinations.isEmpty() && healthRecords.isEmpty()) {
            EmptyStateView(
                icon = Icons.Default.Vaccines,
                title = "Inga hälsojournaler",
                message = "Inga hälsojournaler har registrerats"
            )
        } else {
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Vaccinations section
                if (vaccinations.isNotEmpty()) {
                    item {
                        Text(
                            "Vaccinationer",
                            style = MaterialTheme.typography.titleMedium,
                            modifier = Modifier.padding(vertical = 8.dp)
                        )
                    }
                    items(vaccinations, key = { "vac_${it.id}" }) { record ->
                        VaccinationCard(record)
                    }
                }

                // Health records section
                if (filteredRecords.isNotEmpty()) {
                    item {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                "Hälsojournaler",
                                style = MaterialTheme.typography.titleMedium
                            )
                            navController?.let {
                                FilledTonalButton(
                                    onClick = {
                                        navController.navigate("health-record-form/${viewModel.horseId}")
                                    },
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                                ) {
                                    Icon(Icons.Default.Add, null, modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Ny")
                                }
                            }
                        }
                    }
                    items(filteredRecords, key = { "health_${it.id}" }) { record ->
                        HealthRecordCard(record)
                    }
                }
            }
        }
    }
}

@Composable
private fun VaccinationCard(record: VaccinationRecord) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = record.vaccinationRuleName,
                style = MaterialTheme.typography.titleSmall
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Datum: ${record.vaccinationDate}",
                style = MaterialTheme.typography.bodyMedium
            )
            record.veterinarianName?.let {
                Text(
                    text = "Veterinär: $it",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            record.notes?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
        }
    }
}

@Composable
private fun HealthRecordCard(record: HealthRecord) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = record.title,
                    style = MaterialTheme.typography.titleSmall
                )
                AssistChip(
                    onClick = {},
                    label = {
                        Text(
                            when (record.professionalType.value) {
                                "veterinary" -> "Vet"
                                "farrier" -> "Hov"
                                "dentist" -> "Tand"
                                else -> "Annat"
                            }
                        )
                    }
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = "Datum: ${record.date}",
                style = MaterialTheme.typography.bodyMedium
            )

            record.professionalName?.let {
                Text(
                    text = "Professionell: $it",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            record.diagnosis?.let {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Diagnos: $it",
                    style = MaterialTheme.typography.bodySmall
                )
            }

            record.treatment?.let {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Behandling: $it",
                    style = MaterialTheme.typography.bodySmall
                )
            }

            record.cost?.let {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Kostnad: ${it} kr",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            record.followupDate?.let {
                Spacer(modifier = Modifier.height(8.dp))
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.secondaryContainer
                    )
                ) {
                    Text(
                        text = "Uppföljning: $it",
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(8.dp),
                        color = MaterialTheme.colorScheme.onSecondaryContainer
                    )
                }
            }
        }
    }
}
