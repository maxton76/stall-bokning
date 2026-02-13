package com.equiduty.ui.featurerequests

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.equiduty.R
import com.equiduty.domain.model.FeatureRequestCategory
import com.equiduty.domain.model.FeatureRequestSortBy
import com.equiduty.domain.model.FeatureRequestStatus
import com.equiduty.ui.featurerequests.components.FeatureRequestCard
import com.equiduty.ui.navigation.Route

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeatureRequestListScreen(
    navController: NavController,
    viewModel: FeatureRequestListViewModel = hiltViewModel()
) {
    val requests by viewModel.requests.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val isLoadingMore by viewModel.isLoadingMore.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val nextCursor by viewModel.nextCursor.collectAsState()
    val selectedStatus by viewModel.selectedStatus.collectAsState()
    val selectedCategory by viewModel.selectedCategory.collectAsState()
    val sortBy by viewModel.sortBy.collectAsState()
    val showMineOnly by viewModel.showMineOnly.collectAsState()

    var showCategoryMenu by remember { mutableStateOf(false) }
    var showSortMenu by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.loadData()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.fr_title)) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.back))
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { navController.navigate(Route.CreateFeatureRequest.route) }
            ) {
                Icon(Icons.Default.Add, contentDescription = stringResource(R.string.fr_create_title))
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Status tabs
            StatusTabRow(
                selectedStatus = selectedStatus,
                onStatusSelected = { viewModel.setStatus(it) }
            )

            // Filter row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Category filter
                Box {
                    FilterChip(
                        selected = selectedCategory != null,
                        onClick = { showCategoryMenu = true },
                        label = {
                            Text(
                                if (selectedCategory != null)
                                    stringResource(categoryLabelRes(selectedCategory!!))
                                else
                                    stringResource(R.string.fr_filter_category)
                            )
                        }
                    )
                    DropdownMenu(expanded = showCategoryMenu, onDismissRequest = { showCategoryMenu = false }) {
                        DropdownMenuItem(
                            text = { Text(stringResource(R.string.facilities_filter_all)) },
                            onClick = { viewModel.setCategory(null); showCategoryMenu = false }
                        )
                        FeatureRequestCategory.entries.forEach { cat ->
                            DropdownMenuItem(
                                text = { Text(stringResource(categoryLabelRes(cat))) },
                                onClick = { viewModel.setCategory(cat); showCategoryMenu = false }
                            )
                        }
                    }
                }

                // Sort
                Box {
                    FilterChip(
                        selected = true,
                        onClick = { showSortMenu = true },
                        label = { Text(stringResource(sortLabelRes(sortBy))) }
                    )
                    DropdownMenu(expanded = showSortMenu, onDismissRequest = { showSortMenu = false }) {
                        FeatureRequestSortBy.entries.forEach { sort ->
                            DropdownMenuItem(
                                text = { Text(stringResource(sortLabelRes(sort))) },
                                onClick = { viewModel.setSortBy(sort); showSortMenu = false }
                            )
                        }
                    }
                }

                // My Requests toggle
                FilterChip(
                    selected = showMineOnly,
                    onClick = { viewModel.setShowMineOnly(!showMineOnly) },
                    label = { Text(stringResource(R.string.fr_my_requests)) }
                )
            }

            // Content
            when {
                isLoading && requests.isEmpty() -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                }
                errorMessage != null && requests.isEmpty() -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = errorMessage ?: stringResource(R.string.error_generic),
                                style = MaterialTheme.typography.bodyLarge,
                                color = MaterialTheme.colorScheme.error
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Button(onClick = { viewModel.refresh() }) {
                                Text(stringResource(R.string.retry))
                            }
                        }
                    }
                }
                requests.isEmpty() -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = stringResource(R.string.fr_empty_title),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = stringResource(R.string.fr_empty_message),
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(requests, key = { it.id }) { request ->
                            FeatureRequestCard(
                                request = request,
                                onTap = {
                                    navController.navigate(Route.FeatureRequestDetail.createRoute(request.id))
                                },
                                onVote = { viewModel.toggleVote(request.id) }
                            )
                        }

                        if (nextCursor != null) {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    if (isLoadingMore) {
                                        CircularProgressIndicator(modifier = Modifier.size(24.dp))
                                    } else {
                                        TextButton(onClick = { viewModel.loadMore() }) {
                                            Text(stringResource(R.string.fr_load_more))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatusTabRow(
    selectedStatus: FeatureRequestStatus?,
    onStatusSelected: (FeatureRequestStatus?) -> Unit
) {
    val tabs = listOf<Pair<FeatureRequestStatus?, Int>>(
        null to R.string.facilities_filter_all,
        FeatureRequestStatus.OPEN to R.string.fr_status_open,
        FeatureRequestStatus.PLANNED to R.string.fr_status_planned,
        FeatureRequestStatus.IN_PROGRESS to R.string.fr_status_in_progress,
        FeatureRequestStatus.COMPLETED to R.string.fr_status_completed
    )

    val selectedIndex = tabs.indexOfFirst { it.first == selectedStatus }.coerceAtLeast(0)

    ScrollableTabRow(
        selectedTabIndex = selectedIndex,
        edgePadding = 16.dp
    ) {
        tabs.forEachIndexed { index, (status, labelRes) ->
            Tab(
                selected = selectedIndex == index,
                onClick = { onStatusSelected(status) },
                text = { Text(stringResource(labelRes)) }
            )
        }
    }
}

private fun categoryLabelRes(category: FeatureRequestCategory): Int = when (category) {
    FeatureRequestCategory.IMPROVEMENT -> R.string.fr_category_improvement
    FeatureRequestCategory.NEW_FEATURE -> R.string.fr_category_new_feature
    FeatureRequestCategory.INTEGRATION -> R.string.fr_category_integration
    FeatureRequestCategory.BUG_FIX -> R.string.fr_category_bug_fix
    FeatureRequestCategory.OTHER -> R.string.fr_category_other
}

private fun sortLabelRes(sort: FeatureRequestSortBy): Int = when (sort) {
    FeatureRequestSortBy.VOTES -> R.string.fr_sort_votes
    FeatureRequestSortBy.NEWEST -> R.string.fr_sort_newest
    FeatureRequestSortBy.OLDEST -> R.string.fr_sort_oldest
}
