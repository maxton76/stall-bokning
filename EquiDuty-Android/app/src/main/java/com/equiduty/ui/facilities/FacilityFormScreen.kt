package com.equiduty.ui.facilities

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.equiduty.R
import com.equiduty.domain.model.FacilityStatus
import com.equiduty.domain.model.FacilityType

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FacilityFormScreen(
    navController: NavController,
    viewModel: FacilityFormViewModel = hiltViewModel()
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
                title = {
                    Text(
                        if (viewModel.isEditing) stringResource(R.string.facility_form_edit_title)
                        else stringResource(R.string.facility_form_create_title)
                    )
                },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, stringResource(R.string.back))
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

            // ── Basic Info ────────────────────────────────────────
            FormSectionHeader(stringResource(R.string.facility_form_basic_info))

            OutlinedTextField(
                value = viewModel.name.value,
                onValueChange = { viewModel.name.value = it },
                label = { Text(stringResource(R.string.facility_form_name)) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
            )

            // Type dropdown
            FacilityTypeDropdown(
                selected = viewModel.type.value,
                onSelected = { viewModel.type.value = it }
            )

            OutlinedTextField(
                value = viewModel.description.value,
                onValueChange = { viewModel.description.value = it },
                label = { Text(stringResource(R.string.facility_form_description)) },
                singleLine = false,
                minLines = 2,
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
            )

            // Status dropdown
            FacilityStatusDropdown(
                selected = viewModel.status.value,
                onSelected = { viewModel.status.value = it }
            )

            Spacer(modifier = Modifier.height(16.dp))

            // ── Booking Rules ─────────────────────────────────────
            FormSectionHeader(stringResource(R.string.facility_form_booking_rules))

            StepperField(
                label = stringResource(R.string.facility_form_planning_opens),
                value = viewModel.planningWindowOpens.value,
                onValueChange = { viewModel.planningWindowOpens.value = it },
                min = 1, max = 90,
                suffix = stringResource(R.string.facility_form_days)
            )

            StepperField(
                label = stringResource(R.string.facility_form_planning_closes),
                value = viewModel.planningWindowCloses.value,
                onValueChange = { viewModel.planningWindowCloses.value = it },
                min = 0, max = 30,
                suffix = stringResource(R.string.facility_form_days)
            )

            StepperField(
                label = stringResource(R.string.facility_form_max_horses),
                value = viewModel.maxHorsesPerReservation.value,
                onValueChange = { viewModel.maxHorsesPerReservation.value = it },
                min = 1, max = 20
            )

            // Min time slot duration dropdown
            MinDurationDropdown(
                selected = viewModel.minTimeSlotDuration.value,
                onSelected = { viewModel.minTimeSlotDuration.value = it }
            )

            StepperField(
                label = stringResource(R.string.facility_form_max_duration),
                value = viewModel.maxHoursPerReservation.value,
                onValueChange = { viewModel.maxHoursPerReservation.value = it },
                min = 1, max = 12,
                suffix = stringResource(R.string.facility_form_hours)
            )

            Spacer(modifier = Modifier.height(16.dp))

            // ── Weekly Schedule ────────────────────────────────────
            FormSectionHeader(stringResource(R.string.facility_form_weekly_schedule))

            Text(
                text = stringResource(R.string.facility_form_default_hours),
                style = MaterialTheme.typography.labelLarge,
                modifier = Modifier.padding(vertical = 4.dp)
            )

            viewModel.defaultTimeBlocks.value.forEachIndexed { index, block ->
                TimeBlockRow(
                    block = block,
                    onFromChange = { viewModel.updateDefaultTimeBlock(block, it, block.to) },
                    onToChange = { viewModel.updateDefaultTimeBlock(block, block.from, it) },
                    onRemove = if (viewModel.defaultTimeBlocks.value.size > 1) {
                        { viewModel.removeDefaultTimeBlock(block) }
                    } else null
                )
            }

            TextButton(onClick = { viewModel.addDefaultTimeBlock() }) {
                Icon(Icons.Default.Add, null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text(stringResource(R.string.facility_form_add_time_block))
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Per-day schedule
            Text(
                text = stringResource(R.string.facility_form_per_day),
                style = MaterialTheme.typography.labelLarge,
                modifier = Modifier.padding(vertical = 4.dp)
            )

            FacilityFormViewModel.DAY_KEYS.forEach { day ->
                val daySchedule = viewModel.daySchedules.value[day] ?: EditableDaySchedule()
                DayScheduleRow(
                    day = day,
                    schedule = daySchedule,
                    onScheduleChange = { viewModel.updateDaySchedule(day, it) }
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // ── Exceptions ────────────────────────────────────────
            FormSectionHeader(stringResource(R.string.facility_form_exceptions))

            viewModel.exceptions.value.forEach { exception ->
                ExceptionItem(
                    exception = exception,
                    onRemove = { viewModel.removeException(exception) }
                )
            }

            var showExceptionDialog by remember { mutableStateOf(false) }
            if (showExceptionDialog) {
                AddExceptionDialog(
                    onDismiss = { showExceptionDialog = false },
                    onAdd = { exception ->
                        viewModel.addException(exception)
                        showExceptionDialog = false
                    }
                )
            }

            OutlinedButton(
                onClick = { showExceptionDialog = true },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.Add, null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text(stringResource(R.string.facility_form_add_exception))
            }

            Spacer(modifier = Modifier.height(24.dp))

            // ── Save Button ───────────────────────────────────────
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
                    Text(
                        if (viewModel.isEditing) stringResource(R.string.facility_form_save)
                        else stringResource(R.string.facility_form_create),
                        fontSize = 16.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

// ── Reusable Composables ────────────────────────────────────────

@Composable
private fun FormSectionHeader(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleMedium,
        color = MaterialTheme.colorScheme.primary,
        fontWeight = FontWeight.SemiBold,
        modifier = Modifier.padding(vertical = 8.dp)
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FacilityTypeDropdown(
    selected: FacilityType,
    onSelected: (FacilityType) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = it },
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
    ) {
        OutlinedTextField(
            value = selected.value.replace("_", " ").replaceFirstChar { it.uppercase() },
            onValueChange = {},
            readOnly = true,
            label = { Text(stringResource(R.string.facility_form_type)) },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
            modifier = Modifier.menuAnchor().fillMaxWidth()
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            FacilityType.entries.forEach { type ->
                DropdownMenuItem(
                    text = { Text(type.value.replace("_", " ").replaceFirstChar { it.uppercase() }) },
                    onClick = { onSelected(type); expanded = false }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FacilityStatusDropdown(
    selected: FacilityStatus,
    onSelected: (FacilityStatus) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    val statusLabel = @Composable { status: FacilityStatus ->
        when (status) {
            FacilityStatus.ACTIVE -> stringResource(R.string.active)
            FacilityStatus.INACTIVE -> stringResource(R.string.inactive)
            FacilityStatus.MAINTENANCE -> stringResource(R.string.facility_status_maintenance)
        }
    }

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = it },
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
    ) {
        OutlinedTextField(
            value = statusLabel(selected),
            onValueChange = {},
            readOnly = true,
            label = { Text(stringResource(R.string.facility_form_status)) },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
            modifier = Modifier.menuAnchor().fillMaxWidth()
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            FacilityStatus.entries.forEach { status ->
                DropdownMenuItem(
                    text = { Text(statusLabel(status)) },
                    onClick = { onSelected(status); expanded = false }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MinDurationDropdown(
    selected: Int,
    onSelected: (Int) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    val options = listOf(15, 30, 60)

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = it },
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
    ) {
        OutlinedTextField(
            value = "$selected ${stringResource(R.string.facility_form_minutes)}",
            onValueChange = {},
            readOnly = true,
            label = { Text(stringResource(R.string.facility_form_min_slot)) },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
            modifier = Modifier.menuAnchor().fillMaxWidth()
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { minutes ->
                DropdownMenuItem(
                    text = { Text("$minutes ${stringResource(R.string.facility_form_minutes)}") },
                    onClick = { onSelected(minutes); expanded = false }
                )
            }
        }
    }
}

@Composable
private fun StepperField(
    label: String,
    value: Int,
    onValueChange: (Int) -> Unit,
    min: Int = 0,
    max: Int = 100,
    suffix: String? = null
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.weight(1f)
        )
        OutlinedButton(
            onClick = { if (value > min) onValueChange(value - 1) },
            enabled = value > min,
            contentPadding = PaddingValues(0.dp),
            modifier = Modifier.size(36.dp)
        ) {
            Text("-")
        }
        Text(
            text = if (suffix != null) "$value $suffix" else "$value",
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.padding(horizontal = 16.dp)
        )
        OutlinedButton(
            onClick = { if (value < max) onValueChange(value + 1) },
            enabled = value < max,
            contentPadding = PaddingValues(0.dp),
            modifier = Modifier.size(36.dp)
        ) {
            Text("+")
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TimeBlockRow(
    block: EditableTimeBlock,
    onFromChange: (String) -> Unit,
    onToChange: (String) -> Unit,
    onRemove: (() -> Unit)?
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        TimePickerField(
            value = block.from,
            onValueChange = onFromChange,
            label = stringResource(R.string.facility_form_from),
            modifier = Modifier.weight(1f)
        )
        TimePickerField(
            value = block.to,
            onValueChange = onToChange,
            label = stringResource(R.string.facility_form_to),
            modifier = Modifier.weight(1f)
        )
        if (onRemove != null) {
            IconButton(onClick = onRemove) {
                Icon(Icons.Default.Close, stringResource(R.string.remove))
            }
        } else {
            Spacer(modifier = Modifier.size(48.dp))
        }
    }
}

@Composable
private fun TimePickerField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier
) {
    OutlinedTextField(
        value = value,
        onValueChange = { input ->
            // Simple HH:MM validation
            val cleaned = input.filter { it.isDigit() || it == ':' }
            if (cleaned.length <= 5) onValueChange(cleaned)
        },
        label = { Text(label) },
        singleLine = true,
        modifier = modifier,
        placeholder = { Text("HH:MM") }
    )
}

@Composable
private fun DayScheduleRow(
    day: String,
    schedule: EditableDaySchedule,
    onScheduleChange: (EditableDaySchedule) -> Unit
) {
    val dayLabel = getDayLabel(day)

    Column(modifier = Modifier.padding(vertical = 4.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = dayLabel,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.weight(1f)
            )
            Switch(
                checked = schedule.available,
                onCheckedChange = { onScheduleChange(schedule.copy(available = it)) }
            )
        }

        if (schedule.available) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(start = 16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = stringResource(R.string.facility_form_custom_hours),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.weight(1f)
                )
                Switch(
                    checked = schedule.useCustomHours,
                    onCheckedChange = { useCustom ->
                        onScheduleChange(
                            schedule.copy(
                                useCustomHours = useCustom,
                                timeBlocks = if (useCustom && schedule.timeBlocks.isEmpty()) {
                                    listOf(EditableTimeBlock())
                                } else schedule.timeBlocks
                            )
                        )
                    }
                )
            }

            if (schedule.useCustomHours) {
                schedule.timeBlocks.forEach { block ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(start = 16.dp, top = 4.dp, bottom = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        TimePickerField(
                            value = block.from,
                            onValueChange = { newFrom ->
                                onScheduleChange(
                                    schedule.copy(
                                        timeBlocks = schedule.timeBlocks.map {
                                            if (it.id == block.id) it.copy(from = newFrom) else it
                                        }
                                    )
                                )
                            },
                            label = stringResource(R.string.facility_form_from),
                            modifier = Modifier.weight(1f)
                        )
                        TimePickerField(
                            value = block.to,
                            onValueChange = { newTo ->
                                onScheduleChange(
                                    schedule.copy(
                                        timeBlocks = schedule.timeBlocks.map {
                                            if (it.id == block.id) it.copy(to = newTo) else it
                                        }
                                    )
                                )
                            },
                            label = stringResource(R.string.facility_form_to),
                            modifier = Modifier.weight(1f)
                        )
                        if (schedule.timeBlocks.size > 1) {
                            IconButton(onClick = {
                                onScheduleChange(
                                    schedule.copy(
                                        timeBlocks = schedule.timeBlocks.filterNot { it.id == block.id }
                                    )
                                )
                            }) {
                                Icon(Icons.Default.Close, stringResource(R.string.remove), modifier = Modifier.size(18.dp))
                            }
                        } else {
                            Spacer(modifier = Modifier.size(48.dp))
                        }
                    }
                }
                TextButton(
                    onClick = {
                        onScheduleChange(
                            schedule.copy(timeBlocks = schedule.timeBlocks + EditableTimeBlock())
                        )
                    },
                    modifier = Modifier.padding(start = 16.dp)
                ) {
                    Icon(Icons.Default.Add, null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(stringResource(R.string.facility_form_add_time_block), style = MaterialTheme.typography.bodySmall)
                }
            }
        }

        HorizontalDivider(modifier = Modifier.padding(top = 4.dp))
    }
}

@Composable
private fun ExceptionItem(
    exception: EditableException,
    onRemove: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(exception.date, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = if (exception.type == "closed") stringResource(R.string.facility_form_exception_closed)
                    else stringResource(R.string.facility_form_exception_modified),
                    style = MaterialTheme.typography.bodySmall,
                    color = if (exception.type == "closed") MaterialTheme.colorScheme.error
                    else MaterialTheme.colorScheme.tertiary
                )
                if (exception.reason.isNotBlank()) {
                    Text(
                        text = exception.reason,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            IconButton(onClick = onRemove) {
                Icon(Icons.Default.Close, stringResource(R.string.remove))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddExceptionDialog(
    onDismiss: () -> Unit,
    onAdd: (EditableException) -> Unit
) {
    var date by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("closed") }
    var reason by remember { mutableStateOf("") }
    var timeBlocks by remember { mutableStateOf(listOf(EditableTimeBlock())) }
    var typeExpanded by remember { mutableStateOf(false) }

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
                    text = stringResource(R.string.facility_form_add_exception),
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.padding(bottom = 16.dp)
                )

                OutlinedTextField(
                    value = date,
                    onValueChange = { date = it },
                    label = { Text(stringResource(R.string.facility_form_exception_date)) },
                    placeholder = { Text("YYYY-MM-DD") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                ExposedDropdownMenuBox(
                    expanded = typeExpanded,
                    onExpandedChange = { typeExpanded = it },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    OutlinedTextField(
                        value = if (type == "closed") stringResource(R.string.facility_form_exception_closed)
                        else stringResource(R.string.facility_form_exception_modified),
                        onValueChange = {},
                        readOnly = true,
                        label = { Text(stringResource(R.string.facility_form_exception_type)) },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(typeExpanded) },
                        modifier = Modifier.menuAnchor().fillMaxWidth()
                    )
                    ExposedDropdownMenu(expanded = typeExpanded, onDismissRequest = { typeExpanded = false }) {
                        DropdownMenuItem(
                            text = { Text(stringResource(R.string.facility_form_exception_closed)) },
                            onClick = { type = "closed"; typeExpanded = false }
                        )
                        DropdownMenuItem(
                            text = { Text(stringResource(R.string.facility_form_exception_modified)) },
                            onClick = { type = "modified"; typeExpanded = false }
                        )
                    }
                }

                if (type == "modified") {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = stringResource(R.string.facility_form_exception_hours),
                        style = MaterialTheme.typography.labelMedium
                    )
                    timeBlocks.forEach { block ->
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            TimePickerField(
                                value = block.from,
                                onValueChange = { newFrom ->
                                    timeBlocks = timeBlocks.map {
                                        if (it.id == block.id) it.copy(from = newFrom) else it
                                    }
                                },
                                label = stringResource(R.string.facility_form_from),
                                modifier = Modifier.weight(1f)
                            )
                            TimePickerField(
                                value = block.to,
                                onValueChange = { newTo ->
                                    timeBlocks = timeBlocks.map {
                                        if (it.id == block.id) it.copy(to = newTo) else it
                                    }
                                },
                                label = stringResource(R.string.facility_form_to),
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = reason,
                    onValueChange = { reason = it },
                    label = { Text(stringResource(R.string.facility_form_exception_reason)) },
                    singleLine = false,
                    minLines = 2,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(onClick = onDismiss) {
                        Text(stringResource(R.string.cancel))
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            if (date.isNotBlank()) {
                                onAdd(
                                    EditableException(
                                        date = date,
                                        type = type,
                                        timeBlocks = if (type == "modified") timeBlocks else emptyList(),
                                        reason = reason
                                    )
                                )
                            }
                        },
                        enabled = date.isNotBlank()
                    ) {
                        Text(stringResource(R.string.facility_form_add))
                    }
                }
            }
        }
    }
}

@Composable
private fun getDayLabel(day: String): String = when (day) {
    "monday" -> stringResource(R.string.facility_form_monday)
    "tuesday" -> stringResource(R.string.facility_form_tuesday)
    "wednesday" -> stringResource(R.string.facility_form_wednesday)
    "thursday" -> stringResource(R.string.facility_form_thursday)
    "friday" -> stringResource(R.string.facility_form_friday)
    "saturday" -> stringResource(R.string.facility_form_saturday)
    "sunday" -> stringResource(R.string.facility_form_sunday)
    else -> day
}
