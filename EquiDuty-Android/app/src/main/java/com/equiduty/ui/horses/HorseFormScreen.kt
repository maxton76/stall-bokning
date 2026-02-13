package com.equiduty.ui.horses

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.equiduty.ui.components.PhotoPicker

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HorseFormScreen(
    navController: NavController,
    viewModel: HorseFormViewModel = hiltViewModel()
) {
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()
    val isSaved by viewModel.isSaved.collectAsState()

    // State for equipment deletion confirmation
    var equipmentToDelete by remember { mutableStateOf<EquipmentItemData?>(null) }

    LaunchedEffect(isSaved) {
        if (isSaved) navController.popBackStack()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (viewModel.isEditing) "Redigera häst" else "Ny häst") },
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

            // Photos
            FormSection("Bilder")

            PhotoPicker(
                photoUrl = viewModel.coverPhotoUrl.value,
                onPhotoSelected = viewModel::onCoverPhotoSelected,
                onPhotoRemoved = viewModel::onCoverPhotoRemoved,
                label = "Omslagsbild",
                aspectRatio = 16f / 9f,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(16.dp))

            PhotoPicker(
                photoUrl = viewModel.avatarUrl.value,
                onPhotoSelected = viewModel::onAvatarSelected,
                onPhotoRemoved = viewModel::onAvatarRemoved,
                label = "Avatar",
                aspectRatio = 1f,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Basic info
            FormSection("Grundinformation")
            FormField("Namn *", viewModel.name)
            FormField("Ras", viewModel.breed)
            FormField("Färg", viewModel.color)
            FormField("Kön", viewModel.gender)
            FormField("Födelsedatum (ÅÅÅÅ-MM-DD)", viewModel.dateOfBirth)

            Spacer(modifier = Modifier.height(16.dp))

            // Physical
            FormSection("Fysiska mått")
            FormField("Mankhöjd (cm)", viewModel.withersHeight)

            Spacer(modifier = Modifier.height(16.dp))

            // Placement
            FormSection("Placering")
            FormField("Box", viewModel.boxLocation)
            FormField("Hage", viewModel.paddockLocation)

            Spacer(modifier = Modifier.height(16.dp))

            // Management
            FormSection("Hantering")
            FormField("Status", viewModel.status)
            FormField("Ankomstdatum (ÅÅÅÅ-MM-DD)", viewModel.arrivalDate)

            Text(
                text = "Användning",
                style = MaterialTheme.typography.labelMedium,
                modifier = Modifier.padding(vertical = 4.dp)
            )
            // Usage multi-select (simplified - just show as comma-separated for now)
            FormField("Användning (kommaseparerad)",
                mutableStateOf(viewModel.usageList.value.joinToString(", ")))

            Spacer(modifier = Modifier.height(16.dp))

            // Identification
            FormSection("Identifiering")
            FormField("UELN", viewModel.ueln)
            FormField("Chipnummer", viewModel.chipNumber)
            FormField("Förbundsnummer", viewModel.federationNumber)
            FormField("FEI passnummer", viewModel.feiPassNumber)
            FormField("FEI utgångsdatum (ÅÅÅÅ-MM-DD)", viewModel.feiExpiryDate)

            Spacer(modifier = Modifier.height(16.dp))

            // Pedigree
            FormSection("Härstamning")
            FormField("Fader", viewModel.sire)
            FormField("Moder", viewModel.dam)
            FormField("Morfader", viewModel.damsire)
            FormField("Uppfödare", viewModel.breeder)
            FormField("Studbook", viewModel.studbook)

            Spacer(modifier = Modifier.height(16.dp))

            // Equipment
            FormSection("Utrustning")
            viewModel.equipment.value.forEach { item ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(item.name, style = MaterialTheme.typography.bodyMedium)
                            item.location?.let {
                                Text(
                                    "Plats: $it",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                        IconButton(onClick = { equipmentToDelete = item }) {
                            Icon(Icons.Default.Close, "Ta bort")
                        }
                    }
                }
            }

            var showEquipmentDialog by remember { mutableStateOf(false) }
            if (showEquipmentDialog) {
                EquipmentDialog(
                    onDismiss = { showEquipmentDialog = false },
                    onAdd = { name, location, notes ->
                        viewModel.addEquipment(name, location, notes)
                        showEquipmentDialog = false
                    }
                )
            }

            OutlinedButton(
                onClick = { showEquipmentDialog = true },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Lägg till utrustning")
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Care
            FormSection("Skötsel")
            FormField("Speciella instruktioner", viewModel.specialInstructions, singleLine = false)
            FormField("Anteckningar", viewModel.notes, singleLine = false)

            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = viewModel::save,
                enabled = !isLoading && viewModel.name.value.isNotBlank(),
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
                    Text(if (viewModel.isEditing) "Spara ändringar" else "Skapa häst", fontSize = 16.sp)
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }

        // Equipment deletion confirmation dialog
        equipmentToDelete?.let { item ->
            AlertDialog(
                onDismissRequest = { equipmentToDelete = null },
                title = { Text("Ta bort utrustning") },
                text = { Text("Är du säker på att du vill ta bort ${item.name}?") },
                confirmButton = {
                    Button(
                        onClick = {
                            viewModel.removeEquipment(item)
                            equipmentToDelete = null
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.error
                        )
                    ) {
                        Text("Ta bort")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { equipmentToDelete = null }) {
                        Text("Avbryt")
                    }
                }
            )
        }
    }
}

@Composable
private fun FormSection(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleMedium,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(vertical = 8.dp)
    )
}

@Composable
private fun FormField(
    label: String,
    state: MutableState<String>,
    singleLine: Boolean = true
) {
    OutlinedTextField(
        value = state.value,
        onValueChange = { state.value = it },
        label = { Text(label) },
        singleLine = singleLine,
        minLines = if (singleLine) 1 else 3,
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
    )
}

@Composable
private fun EquipmentDialog(
    onDismiss: () -> Unit,
    onAdd: (name: String, location: String?, notes: String?) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var location by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = "Lägg till utrustning",
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.padding(bottom = 16.dp)
                )

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Namn *") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = location,
                    onValueChange = { location = it },
                    label = { Text("Plats") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("Anteckningar") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2,
                    singleLine = false
                )

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("Avbryt")
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            if (name.isNotBlank()) {
                                onAdd(
                                    name,
                                    location.ifBlank { null },
                                    notes.ifBlank { null }
                                )
                            }
                        },
                        enabled = name.isNotBlank()
                    ) {
                        Text("Lägg till")
                    }
                }
            }
        }
    }
}
