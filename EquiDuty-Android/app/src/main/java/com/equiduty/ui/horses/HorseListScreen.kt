package com.equiduty.ui.horses

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.equiduty.domain.model.Horse
import com.equiduty.ui.components.EmptyStateView
import com.equiduty.ui.navigation.Route

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HorseListScreen(
    navController: NavController,
    viewModel: HorseListViewModel = hiltViewModel()
) {
    val horses by viewModel.filteredHorses.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val showOnlyActive by viewModel.showOnlyActive.collectAsState()
    val error by viewModel.error.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Hästar") },
                actions = {
                    IconButton(onClick = { viewModel.toggleActiveFilter() }) {
                        Icon(
                            if (showOnlyActive) Icons.Default.FilterAlt else Icons.Default.FilterAltOff,
                            contentDescription = "Filtrera"
                        )
                    }
                    IconButton(onClick = { navController.navigate(Route.HorseForm.createRoute()) }) {
                        Icon(Icons.Default.Add, contentDescription = "Lägg till häst")
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
            // Search bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = viewModel::setSearchQuery,
                placeholder = { Text("Sök hästar...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { viewModel.setSearchQuery("") }) {
                            Icon(Icons.Default.Clear, contentDescription = "Rensa")
                        }
                    }
                },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            )

            if (error != null) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = error ?: "",
                        modifier = Modifier.padding(16.dp),
                        color = MaterialTheme.colorScheme.onErrorContainer
                    )
                }
            }

            if (isLoading && horses.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else if (horses.isEmpty()) {
                EmptyStateView(
                    icon = Icons.Default.Pets,
                    title = "Inga hästar",
                    message = "Lägg till din första häst genom att trycka på +-knappen"
                )
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(horses, key = { it.id }) { horse ->
                        HorseCard(
                            horse = horse,
                            onClick = { navController.navigate(Route.HorseDetail.createRoute(horse.id)) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun HorseCard(
    horse: Horse,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.Pets,
                contentDescription = null,
                modifier = Modifier.size(40.dp),
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = horse.name,
                    style = MaterialTheme.typography.titleMedium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                horse.breed?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Text(
                    text = horse.color.value,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            if (horse.isOwner) {
                AssistChip(
                    onClick = {},
                    label = { Text("Ägare") },
                    modifier = Modifier.padding(start = 8.dp)
                )
            }
        }
    }
}
