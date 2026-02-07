package com.equiduty.ui.horses

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun HorseInfoTab(viewModel: HorseDetailViewModel) {
    val horse by viewModel.horse.collectAsState()

    horse?.let { h ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            // Basic info
            SectionHeader("Grundinformation")
            InfoField("Namn", h.name)
            h.breed?.let { InfoField("Ras", it) }
            InfoField("Färg", h.color.value)
            h.gender?.let { InfoField("Kön", it.value) }
            h.dateOfBirth?.let { InfoField("Födelsedatum", it) }
            h.age?.let { InfoField("Ålder", "$it år") }
            h.withersHeight?.let { InfoField("Mankhöjd", "${it} cm") }
            h.usage?.let { usages ->
                if (usages.isNotEmpty()) {
                    InfoField("Användning", usages.joinToString(", ") { it.value })
                }
            }

            // Identification (level 3+)
            val accessLevel = h.accessLevel?.numericLevel ?: 1
            if (accessLevel >= 3) {
                val hasIdInfo = h.chipNumber != null || h.ueln != null || h.feiPassNumber != null
                if (hasIdInfo) {
                    Spacer(modifier = Modifier.height(16.dp))
                    SectionHeader("Identifiering")
                    h.ueln?.let { InfoField("UELN", it) }
                    h.chipNumber?.let { InfoField("Chipnummer", it) }
                    h.federationNumber?.let { InfoField("Förbundsnummer", it) }
                    h.feiPassNumber?.let { InfoField("FEI-pass", it) }
                }

                // Pedigree
                val hasPedigree = h.sire != null || h.dam != null
                if (hasPedigree) {
                    Spacer(modifier = Modifier.height(16.dp))
                    SectionHeader("Härstamning")
                    h.sire?.let { InfoField("Far", it) }
                    h.dam?.let { InfoField("Mor", it) }
                    h.damsire?.let { InfoField("Morfar", it) }
                    h.breeder?.let { InfoField("Uppfödare", it) }
                    h.studbook?.let { InfoField("Stamboksförening", it) }
                }
            }

            // Care instructions (level 2+)
            if (accessLevel >= 2) {
                h.specialInstructions?.let {
                    Spacer(modifier = Modifier.height(16.dp))
                    SectionHeader("Skötsel")
                    InfoField("Speciella instruktioner", it)
                }
            }

            // Equipment
            h.equipment?.let { equipmentList ->
                if (equipmentList.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(16.dp))
                    SectionHeader("Utrustning")
                    equipmentList.forEach { eq ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(eq.name, style = MaterialTheme.typography.bodyLarge)
                                eq.location?.let {
                                    Text("Plats: $it", style = MaterialTheme.typography.bodySmall)
                                }
                                eq.notes?.let {
                                    Text(it, style = MaterialTheme.typography.bodySmall)
                                }
                            }
                        }
                    }
                }
            }

            // Notes
            h.notes?.let {
                Spacer(modifier = Modifier.height(16.dp))
                SectionHeader("Anteckningar")
                Text(it, style = MaterialTheme.typography.bodyMedium)
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleMedium,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(bottom = 8.dp)
    )
}

@Composable
private fun InfoField(label: String, value: String) {
    Column(modifier = Modifier.padding(vertical = 4.dp)) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyLarge
        )
    }
}
