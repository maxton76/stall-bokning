package com.equiduty.ui.feeding

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.equiduty.domain.model.FeedCategory
import com.equiduty.domain.model.FeedType
import com.equiduty.domain.model.HorseFeeding
import com.equiduty.ui.components.EmptyStateView

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedingScreen(
    navController: NavController,
    viewModel: FeedingViewModel = hiltViewModel()
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Dagens utfodring", "Fodertyper")

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Utfodring") })
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            TabRow(selectedTabIndex = selectedTab) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = { Text(title) }
                    )
                }
            }

            when (selectedTab) {
                0 -> FeedingTodayTab(viewModel = viewModel)
                1 -> FeedTypeListTab(viewModel = viewModel)
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun FeedingTodayTab(viewModel: FeedingViewModel) {
    val groupedFeedings by viewModel.groupedFeedings.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()

    if (error != null) {
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                error ?: "",
                modifier = Modifier.padding(16.dp),
                color = MaterialTheme.colorScheme.onErrorContainer
            )
        }
    }

    if (isLoading && groupedFeedings.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
    } else if (groupedFeedings.isEmpty() || groupedFeedings.all { it.feedings.isEmpty() }) {
        EmptyStateView(
            icon = Icons.Default.Restaurant,
            title = "Ingen utfodring",
            message = "Inga utfodringsscheman har skapats för detta stall"
        )
    } else {
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            groupedFeedings.forEach { group ->
                if (group.feedings.isNotEmpty()) {
                    stickyHeader {
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            color = MaterialTheme.colorScheme.surface,
                            tonalElevation = 2.dp
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 8.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = group.feedingTime.name,
                                    style = MaterialTheme.typography.titleMedium
                                )
                                Text(
                                    text = group.feedingTime.time,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }

                    items(group.feedings, key = { it.id }) { feeding ->
                        HorseFeedingCard(feeding = feeding)
                    }
                }
            }
        }
    }
}

@Composable
private fun HorseFeedingCard(feeding: HorseFeeding) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(feeding.horseName, style = MaterialTheme.typography.titleSmall)
                Text(
                    text = feeding.feedTypeName,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                feeding.notes?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = feeding.formattedQuantity,
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.primary
                )
                AssistChip(
                    onClick = {},
                    label = { Text(categoryDisplayName(feeding.feedTypeCategory)) },
                    modifier = Modifier.height(24.dp)
                )
            }
        }
    }
}

@Composable
private fun FeedTypeListTab(viewModel: FeedingViewModel) {
    val feedTypes by viewModel.feedTypes.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    if (isLoading && feedTypes.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
    } else if (feedTypes.isEmpty()) {
        EmptyStateView(
            icon = Icons.Default.Inventory,
            title = "Inga fodertyper",
            message = "Inga fodertyper har skapats ännu"
        )
    } else {
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(feedTypes, key = { it.id }) { feedType ->
                FeedTypeCard(feedType = feedType)
            }
        }
    }
}

@Composable
private fun FeedTypeCard(feedType: FeedType) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(feedType.name, style = MaterialTheme.typography.titleMedium)
                    if (feedType.brand.isNotBlank()) {
                        Text(
                            text = feedType.brand,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                AssistChip(
                    onClick = {},
                    label = { Text(categoryDisplayName(feedType.category)) }
                )
            }

            if (feedType.defaultQuantity > 0) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Standard: ${feedType.defaultQuantity.let { if (it == it.toLong().toDouble()) it.toLong().toString() else "%.1f".format(it) }} ${feedType.quantityMeasure.abbreviation}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            feedType.warning?.let { warning ->
                Spacer(modifier = Modifier.height(8.dp))
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer
                    )
                ) {
                    Row(
                        modifier = Modifier.padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Warning,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.error
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = warning,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                    }
                }
            }

            if (!feedType.isActive) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Inaktiv",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.error
                )
            }
        }
    }
}

private fun categoryDisplayName(category: FeedCategory): String = when (category) {
    FeedCategory.ROUGHAGE -> "Grovfoder"
    FeedCategory.CONCENTRATE -> "Kraftfoder"
    FeedCategory.SUPPLEMENT -> "Tillskott"
    FeedCategory.MEDICINE -> "Medicin"
}
