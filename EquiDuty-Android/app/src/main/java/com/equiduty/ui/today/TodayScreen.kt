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
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.equiduty.domain.model.ActivityInstance
import com.equiduty.domain.model.ActivityInstanceStatus
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
    val activities by viewModel.activities.collectAsState()
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

            if (isLoading && activities.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else if (activities.isEmpty()) {
                EmptyStateView(
                    icon = Icons.Default.CalendarToday,
                    title = "Inga aktiviteter",
                    message = "Inga aktiviteter för vald period"
                )
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(activities, key = { it.id }) { activity ->
                        ActivityCard(
                            activity = activity,
                            onClick = { navController.navigate(Route.ActivityDetail.createRoute(activity.id)) }
                        )
                    }
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
