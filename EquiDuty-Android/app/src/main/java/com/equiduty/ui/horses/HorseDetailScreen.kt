package com.equiduty.ui.horses

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.equiduty.ui.navigation.Route
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HorseDetailScreen(
    navController: NavController,
    viewModel: HorseDetailViewModel = hiltViewModel()
) {
    val horse by viewModel.horse.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()

    val tabs = listOf("Info", "Hälsa", "Team", "Historik")
    val pagerState = rememberPagerState(pageCount = { tabs.size })
    val scope = rememberCoroutineScope()

    // Load tab-specific data when tab is selected
    LaunchedEffect(pagerState.currentPage) {
        when (pagerState.currentPage) {
            1 -> viewModel.loadVaccinations()
            2 -> {
                viewModel.loadTeam()
                viewModel.loadOwnerships()
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(horse?.name ?: "Häst") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Tillbaka")
                    }
                },
                actions = {
                    horse?.let { h ->
                        if (h.isOwner || (h.accessLevel?.numericLevel ?: 0) >= 4) {
                            IconButton(
                                onClick = { navController.navigate(Route.HorseForm.createRoute(h.id)) }
                            ) {
                                Icon(Icons.Default.Edit, contentDescription = "Redigera")
                            }
                        }
                    }
                }
            )
        }
    ) { padding ->
        if (isLoading && horse == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else if (error != null && horse == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(error ?: "", color = MaterialTheme.colorScheme.error)
                    Spacer(modifier = Modifier.height(16.dp))
                    OutlinedButton(onClick = viewModel::loadHorse) {
                        Text("Försök igen")
                    }
                }
            }
        } else {
            Column(modifier = Modifier.padding(padding)) {
                TabRow(selectedTabIndex = pagerState.currentPage) {
                    tabs.forEachIndexed { index, title ->
                        Tab(
                            selected = pagerState.currentPage == index,
                            onClick = { scope.launch { pagerState.animateScrollToPage(index) } },
                            text = { Text(title) }
                        )
                    }
                }

                HorizontalPager(
                    state = pagerState,
                    modifier = Modifier.fillMaxSize()
                ) { page ->
                    when (page) {
                        0 -> HorseInfoTab(viewModel)
                        1 -> HorseHealthTab(viewModel)
                        2 -> HorseTeamTab(viewModel)
                        3 -> HorseActivityHistoryTab(viewModel)
                    }
                }
            }
        }
    }
}
