package com.equiduty.ui.facilities

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.equiduty.R
import com.equiduty.ui.facilities.components.TimeSlotPicker
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReservationFormScreen(
    navController: NavController,
    viewModel: ReservationFormViewModel = hiltViewModel()
) {
    val facilities by viewModel.facilities.collectAsState()
    val horses by viewModel.horses.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val isSaved by viewModel.isSaved.collectAsState()
    val error by viewModel.error.collectAsState()
    val hasConflicts by viewModel.hasConflicts.collectAsState()

    var showDatePicker by remember { mutableStateOf(false) }
    var showStartTimePicker by remember { mutableStateOf(false) }
    var showEndTimePicker by remember { mutableStateOf(false) }
    var showFacilityMenu by remember { mutableStateOf(false) }
    var showHorseMenu by remember { mutableStateOf(false) }

    val startTimePickerState = rememberTimePickerState()
    val endTimePickerState = rememberTimePickerState()
    val datePickerState = rememberDatePickerState()

    LaunchedEffect(isSaved) {
        if (isSaved) navController.popBackStack()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        if (viewModel.isEditing) stringResource(R.string.reservation_form_edit)
                        else stringResource(R.string.reservation_form_title)
                    )
                },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.back))
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Spacer(modifier = Modifier.height(8.dp))

            // Error
            if (error != null) {
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                    Text(
                        text = error!!,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }

            // Conflict warning
            if (hasConflicts) {
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                    Text(
                        text = stringResource(R.string.reservation_conflict_warning),
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }

            // Facility dropdown
            ExposedDropdownMenuBox(
                expanded = showFacilityMenu,
                onExpandedChange = { showFacilityMenu = it }
            ) {
                OutlinedTextField(
                    value = facilities.find { it.id == viewModel.selectedFacilityId.value }?.name ?: "",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text(stringResource(R.string.reservation_facility)) },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = showFacilityMenu) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor()
                )
                ExposedDropdownMenu(
                    expanded = showFacilityMenu,
                    onDismissRequest = { showFacilityMenu = false }
                ) {
                    facilities.forEach { facility ->
                        DropdownMenuItem(
                            text = { Text(facility.name) },
                            onClick = {
                                viewModel.selectedFacilityId.value = facility.id
                                showFacilityMenu = false
                                viewModel.checkConflicts()
                            }
                        )
                    }
                }
            }

            // Date picker
            OutlinedTextField(
                value = viewModel.date.value,
                onValueChange = {},
                readOnly = true,
                label = { Text(stringResource(R.string.reservation_date)) },
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { showDatePicker = true }
            )

            // Start time
            OutlinedTextField(
                value = viewModel.startTime.value,
                onValueChange = {},
                readOnly = true,
                label = { Text(stringResource(R.string.reservation_start_time)) },
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { showStartTimePicker = true }
            )

            // End time
            OutlinedTextField(
                value = viewModel.endTime.value,
                onValueChange = {},
                readOnly = true,
                label = { Text(stringResource(R.string.reservation_end_time)) },
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { showEndTimePicker = true }
            )

            // Horse dropdown
            ExposedDropdownMenuBox(
                expanded = showHorseMenu,
                onExpandedChange = { showHorseMenu = it }
            ) {
                OutlinedTextField(
                    value = horses.find { it.id == viewModel.selectedHorseId.value }?.name ?: "",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text(stringResource(R.string.reservation_horse)) },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = showHorseMenu) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor()
                )
                ExposedDropdownMenu(
                    expanded = showHorseMenu,
                    onDismissRequest = { showHorseMenu = false }
                ) {
                    // Empty option
                    DropdownMenuItem(
                        text = { Text("–") },
                        onClick = {
                            viewModel.selectedHorseId.value = ""
                            showHorseMenu = false
                        }
                    )
                    horses.forEach { horse ->
                        DropdownMenuItem(
                            text = { Text(horse.name) },
                            onClick = {
                                viewModel.selectedHorseId.value = horse.id
                                showHorseMenu = false
                            }
                        )
                    }
                }
            }

            // Notes
            OutlinedTextField(
                value = viewModel.notes.value,
                onValueChange = { viewModel.notes.value = it },
                label = { Text(stringResource(R.string.reservation_notes)) },
                minLines = 2,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Submit
            Button(
                onClick = viewModel::save,
                enabled = !isLoading && viewModel.selectedFacilityId.value.isNotBlank()
                        && viewModel.date.value.isNotBlank()
                        && viewModel.startTime.value.isNotBlank()
                        && viewModel.endTime.value.isNotBlank(),
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
                    Text(
                        if (viewModel.isEditing) stringResource(R.string.reservation_update)
                        else stringResource(R.string.reservation_submit),
                        fontSize = 16.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }

    // Date Picker Dialog
    if (showDatePicker) {
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    datePickerState.selectedDateMillis?.let { millis ->
                        val selectedDate = Instant.ofEpochMilli(millis)
                            .atZone(ZoneId.systemDefault())
                            .toLocalDate()
                        viewModel.date.value = selectedDate.format(DateTimeFormatter.ISO_LOCAL_DATE)
                        viewModel.checkConflicts()
                    }
                    showDatePicker = false
                }) { Text("OK") }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = false }) { Text(stringResource(R.string.cancel)) }
            }
        ) {
            DatePicker(state = datePickerState)
        }
    }

    // Time Picker Dialogs
    if (showStartTimePicker) {
        TimeSlotPicker(
            timePickerState = startTimePickerState,
            onDismiss = { showStartTimePicker = false },
            onConfirm = {
                viewModel.startTime.value = "%02d:%02d".format(startTimePickerState.hour, startTimePickerState.minute)
                showStartTimePicker = false
                viewModel.checkConflicts()
            }
        )
    }

    if (showEndTimePicker) {
        TimeSlotPicker(
            timePickerState = endTimePickerState,
            onDismiss = { showEndTimePicker = false },
            onConfirm = {
                viewModel.endTime.value = "%02d:%02d".format(endTimePickerState.hour, endTimePickerState.minute)
                showEndTimePicker = false
                viewModel.checkConflicts()
            }
        )
    }
}
