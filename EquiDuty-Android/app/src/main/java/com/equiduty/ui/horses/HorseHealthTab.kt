package com.equiduty.ui.horses

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Vaccines
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.equiduty.domain.model.VaccinationRecord
import com.equiduty.ui.components.EmptyStateView

@Composable
fun HorseHealthTab(viewModel: HorseDetailViewModel) {
    val vaccinations by viewModel.vaccinations.collectAsState()

    if (vaccinations.isEmpty()) {
        EmptyStateView(
            icon = Icons.Default.Vaccines,
            title = "Inga vaccinationer",
            message = "Inga vaccinationsuppgifter har registrerats"
        )
    } else {
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(vaccinations, key = { it.id }) { record ->
                VaccinationCard(record)
            }
        }
    }
}

@Composable
private fun VaccinationCard(record: VaccinationRecord) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = record.vaccinationType,
                style = MaterialTheme.typography.titleSmall
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Datum: ${record.date}",
                style = MaterialTheme.typography.bodyMedium
            )
            record.nextDueDate?.let {
                Text(
                    text = "Nästa: $it",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            record.veterinarian?.let {
                Text(
                    text = "Veterinär: $it",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            record.clinic?.let {
                Text(
                    text = "Klinik: $it",
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
