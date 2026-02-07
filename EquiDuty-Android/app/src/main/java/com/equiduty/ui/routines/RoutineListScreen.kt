package com.equiduty.ui.routines

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.equiduty.R
import com.equiduty.domain.model.RoutineInstance
import com.equiduty.domain.model.RoutineInstanceStatus
import com.equiduty.ui.components.EmptyStateView
import com.equiduty.ui.navigation.Route
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoutineListScreen(
    navController: NavController,
    viewModel: RoutineListViewModel = hiltViewModel()
) {
    val instances by viewModel.instances.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            TopAppBar(title = { Text(stringResource(R.string.routines_title)) })
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            if (error != null) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    Text(error ?: "", modifier = Modifier.padding(16.dp), color = MaterialTheme.colorScheme.onErrorContainer)
                }
            }

            if (isLoading && instances.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else if (instances.isEmpty()) {
                EmptyStateView(
                    icon = Icons.Default.Checklist,
                    title = stringResource(R.string.routines_empty_title),
                    message = stringResource(R.string.routines_empty_message)
                )
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(instances, key = { it.id }) { instance ->
                        RoutineInstanceCard(
                            instance = instance,
                            onStart = {
                                scope.launch {
                                    val startedId = viewModel.startRoutine(instance.id)
                                    if (startedId != null) {
                                        navController.navigate(Route.RoutineFlow.createRoute(startedId))
                                    }
                                }
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun RoutineInstanceCard(
    instance: RoutineInstance,
    onStart: () -> Unit
) {
    val canStart = instance.status == RoutineInstanceStatus.SCHEDULED

    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(instance.templateName, style = MaterialTheme.typography.titleMedium)
                    val stepsInfo = instance.template?.let {
                        "${it.steps.size} ${stringResource(R.string.routine_step_of, 0, it.steps.size).substringAfterLast(" ")}"
                    }
                    Text(
                        text = "${instance.scheduledStartTime}${stepsInfo?.let { " - $it" } ?: ""}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    if (instance.status != RoutineInstanceStatus.SCHEDULED) {
                        Text(
                            text = instance.status.value.replaceFirstChar { it.uppercase() },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
                if (canStart) {
                    Button(onClick = onStart) {
                        Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(stringResource(R.string.routine_start))
                    }
                }
            }
        }
    }
}
