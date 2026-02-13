package com.equiduty.ui.facilities

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.History
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.equiduty.R
import com.equiduty.domain.model.FacilityType
import com.equiduty.ui.facilities.components.FacilityCard
import com.equiduty.ui.facilities.components.ReservationCard
import com.equiduty.ui.navigation.Route

@Composable
fun FacilitiesScreen(
    navController: NavController,
    viewModel: FacilitiesViewModel = hiltViewModel()
) {
    val facilities by viewModel.filteredFacilities.collectAsState()
    val upcomingReservations by viewModel.upcomingReservations.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val selectedType by viewModel.selectedTypeFilter.collectAsState()

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = { navController.navigate(Route.ReservationForm.createRoute()) }
            ) {
                Icon(Icons.Default.Add, contentDescription = stringResource(R.string.facilities_new_booking))
            }
        }
    ) { padding ->
        if (isLoading && facilities.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Header
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = stringResource(R.string.facilities_title),
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold
                        )
                        TextButton(
                            onClick = { navController.navigate(Route.MyReservations.route) }
                        ) {
                            Icon(Icons.Default.History, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(stringResource(R.string.facilities_my_reservations))
                        }
                    }
                }

                // Type filter chips
                item {
                    val types = listOf(null) + FacilityType.entries.filter { type ->
                        facilities.any { it.type == type } || viewModel.facilities.value.any { it.type == type }
                    }

                    Row(
                        modifier = Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        types.forEach { type ->
                            FilterChip(
                                selected = selectedType == type,
                                onClick = { viewModel.setTypeFilter(type) },
                                label = {
                                    Text(
                                        if (type == null) stringResource(R.string.facilities_filter_all)
                                        else type.value.replace("_", " ")
                                            .replaceFirstChar { it.uppercase() }
                                    )
                                }
                            )
                        }
                    }
                }

                // Upcoming reservations
                if (upcomingReservations.isNotEmpty()) {
                    item {
                        Text(
                            text = stringResource(R.string.facilities_upcoming),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(top = 8.dp)
                        )
                    }
                    item {
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            items(upcomingReservations) { reservation ->
                                ReservationCard(
                                    reservation = reservation,
                                    onClick = {
                                        navController.navigate(
                                            Route.ReservationDetail.createRoute(reservation.id)
                                        )
                                    },
                                    modifier = Modifier.width(280.dp)
                                )
                            }
                        }
                    }
                }

                // Facilities list
                item {
                    Text(
                        text = stringResource(R.string.facilities_available),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }

                if (facilities.isEmpty()) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant
                            )
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(32.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = stringResource(R.string.facilities_no_facilities),
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                } else {
                    items(facilities) { facility ->
                        FacilityCard(
                            facility = facility,
                            onClick = {
                                navController.navigate(Route.FacilityDetail.createRoute(facility.id))
                            }
                        )
                    }
                }
            }
        }
    }
}
