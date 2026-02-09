package com.equiduty.ui.today

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.size
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.equiduty.domain.model.ActivityInstance
import com.equiduty.domain.model.ActivityInstanceStatus
import com.equiduty.domain.model.RoutineInstance
import com.equiduty.domain.model.RoutineInstanceStatus
import com.equiduty.ui.components.EmptyStateView
import com.equiduty.ui.components.StatusBadge
import com.equiduty.ui.navigation.Route
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TodayScreen(
    navController: NavController,
    viewModel: TodayViewModel = hiltViewModel()
) {
    val todayItems by viewModel.todayItems.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val selectedDate by viewModel.selectedDate.collectAsState()
    val period by viewModel.period.collectAsState()
    val showOnlyMine by viewModel.showOnlyMine.collectAsState()
    val error by viewModel.error.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Idag") },
                actions = {
                    IconButton(onClick = { viewModel.toggleShowOnlyMine() }) {
                        Icon(
                            if (showOnlyMine) Icons.Default.Person else Icons.Default.People,
                            contentDescription = if (showOnlyMine) "Visa alla" else "Visa mina"
                        )
                    }
                    IconButton(onClick = { navController.navigate(Route.ActivityForm.createRoute()) }) {
                        Icon(Icons.Default.Add, contentDescription = "Ny aktivitet")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Date navigation
            DateNavigationHeader(
                date = selectedDate.format(DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM)),
                onPrevious = { viewModel.navigateDate(-1) },
                onNext = { viewModel.navigateDate(1) },
                onToday = viewModel::goToToday
            )

            // Period selector
            PeriodSelector(
                selected = period,
                onSelect = viewModel::setPeriod
            )

            if (error != null) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = error ?: "",
                            modifier = Modifier.weight(1f),
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                        TextButton(onClick = viewModel::loadData) {
                            Text("Försök igen")
                        }
                    }
                }
            }

            Box(modifier = Modifier.fillMaxSize()) {
                if (isLoading && todayItems.isEmpty()) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                } else if (todayItems.isEmpty()) {
                    EmptyStateView(
                        icon = Icons.Default.CalendarToday,
                        title = "Inga aktiviteter eller rutiner",
                        message = "Inga aktiviteter eller rutiner för vald period"
                    )
                } else {
                    LazyColumn(
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(todayItems, key = { item ->
                            when (item) {
                                is TodayItem.Activity -> "activity-${item.instance.id}"
                                is TodayItem.Routine -> "routine-${item.instance.id}"
                            }
                        }) { item ->
                            when (item) {
                                is TodayItem.Activity -> ActivityCard(
                                    activity = item.instance,
                                    onClick = { navController.navigate(Route.ActivityDetail.createRoute(item.instance.id)) }
                                )
                                is TodayItem.Routine -> RoutineCard(
                                    routine = item.instance,
                                    onClick = { navController.navigate(Route.RoutineFlow.createRoute(item.instance.id)) }
                                )
                            }
                        }
                    }
                }

                // Overlay indicator for subsequent loads (period/date changes)
                if (isLoading && todayItems.isNotEmpty()) {
                    LinearProgressIndicator(
                        modifier = Modifier
                            .fillMaxWidth()
                            .align(Alignment.TopCenter)
                    )
                }
            }
        }
    }
}

@Composable
private fun DateNavigationHeader(
    date: String,
    onPrevious: () -> Unit,
    onNext: () -> Unit,
    onToday: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        IconButton(onClick = onPrevious) {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, "Föregående")
        }
        TextButton(onClick = onToday) {
            Text(date, style = MaterialTheme.typography.titleMedium)
        }
        IconButton(onClick = onNext) {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, "Nästa")
        }
    }
}

@Composable
private fun PeriodSelector(
    selected: TimePeriod,
    onSelect: (TimePeriod) -> Unit
) {
    SingleChoiceSegmentedButtonRow(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp)
    ) {
        TimePeriod.entries.forEachIndexed { index, period ->
            SegmentedButton(
                selected = selected == period,
                onClick = { onSelect(period) },
                shape = SegmentedButtonDefaults.itemShape(index, TimePeriod.entries.size)
            ) {
                Text(
                    when (period) {
                        TimePeriod.DAY -> "Dag"
                        TimePeriod.WEEK -> "Vecka"
                        TimePeriod.MONTH -> "Månad"
                    }
                )
            }
        }
    }
}

@Composable
private fun ActivityCard(
    activity: ActivityInstance,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = activity.activityTypeName,
                    style = MaterialTheme.typography.titleSmall,
                    modifier = Modifier.weight(1f)
                )
                StatusBadge(
                    text = when (activity.status) {
                        ActivityInstanceStatus.PENDING -> "Väntande"
                        ActivityInstanceStatus.IN_PROGRESS -> "Pågår"
                        ActivityInstanceStatus.COMPLETED -> "Klar"
                        ActivityInstanceStatus.CANCELLED -> "Avbruten"
                        ActivityInstanceStatus.OVERDUE -> "Försenad"
                    },
                    color = when (activity.status) {
                        ActivityInstanceStatus.PENDING -> MaterialTheme.colorScheme.outline
                        ActivityInstanceStatus.IN_PROGRESS -> MaterialTheme.colorScheme.primary
                        ActivityInstanceStatus.COMPLETED -> MaterialTheme.colorScheme.tertiary
                        ActivityInstanceStatus.CANCELLED -> MaterialTheme.colorScheme.outline
                        ActivityInstanceStatus.OVERDUE -> MaterialTheme.colorScheme.error
                    }
                )
            }

            if (activity.horseNames.isNotEmpty()) {
                Text(
                    text = activity.horseNames.joinToString(", "),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }

            activity.assignedToName?.let {
                Text(
                    text = "Tilldelad: $it",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }

            if (activity.scheduledTime != null) {
                Text(
                    text = buildString {
                        append(activity.scheduledTime)
                        activity.duration?.let { append(" (${it} min)") }
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun RoutineCard(
    routine: RoutineInstance,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Checklist,
                        contentDescription = null,
                        modifier = Modifier
                            .padding(end = 8.dp)
                            .size(20.dp),
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = routine.templateName,
                        style = MaterialTheme.typography.titleSmall
                    )
                }
                StatusBadge(
                    text = when (routine.status) {
                        RoutineInstanceStatus.SCHEDULED -> "Schemalagd"
                        RoutineInstanceStatus.STARTED -> "Påbörjad"
                        RoutineInstanceStatus.IN_PROGRESS -> "Pågår"
                        RoutineInstanceStatus.COMPLETED -> "Klar"
                        RoutineInstanceStatus.MISSED -> "Missad"
                        RoutineInstanceStatus.CANCELLED -> "Avbruten"
                    },
                    color = when (routine.status) {
                        RoutineInstanceStatus.SCHEDULED -> MaterialTheme.colorScheme.outline
                        RoutineInstanceStatus.STARTED,
                        RoutineInstanceStatus.IN_PROGRESS -> MaterialTheme.colorScheme.primary
                        RoutineInstanceStatus.COMPLETED -> MaterialTheme.colorScheme.tertiary
                        RoutineInstanceStatus.MISSED -> MaterialTheme.colorScheme.error
                        RoutineInstanceStatus.CANCELLED -> MaterialTheme.colorScheme.outline
                    }
                )
            }

            routine.assignedToName?.let {
                Text(
                    text = "Tilldelad: $it",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }

            Text(
                text = "${routine.scheduledStartTime} (${routine.estimatedDuration} min)",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 2.dp)
            )

            // Show progress
            if (routine.status == RoutineInstanceStatus.IN_PROGRESS ||
                routine.status == RoutineInstanceStatus.STARTED) {
                LinearProgressIndicator(
                    progress = { (routine.progress.percentComplete / 100.0).toFloat() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp)
                )
                Text(
                    text = "${routine.progress.stepsCompleted} av ${routine.progress.stepsTotal} steg klara",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
        }
    }
}
