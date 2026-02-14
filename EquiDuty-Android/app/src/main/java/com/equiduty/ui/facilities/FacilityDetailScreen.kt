package com.equiduty.ui.facilities

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
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
import com.equiduty.ui.facilities.components.*
import com.equiduty.ui.navigation.Route
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FacilityDetailScreen(
    navController: NavController,
    viewModel: FacilityDetailViewModel = hiltViewModel()
) {
    val facility by viewModel.facility.collectAsState()
    val reservations by viewModel.liveReservations.collectAsState()
    val selectedDate by viewModel.selectedDate.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(facility?.name ?: stringResource(R.string.facility_detail_title)) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.back))
                    }
                }
            )
        },
        floatingActionButton = {
            facility?.let { f ->
                ExtendedFloatingActionButton(
                    onClick = { navController.navigate(Route.ReservationForm.createRoute(facilityId = f.id)) },
                    text = { Text(stringResource(R.string.facilities_book)) },
                    icon = { }
                )
            }
        }
    ) { padding ->
        if (isLoading && facility == null) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            facility?.let { f ->
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Header card
                    item {
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = f.name,
                                        style = MaterialTheme.typography.headlineSmall,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    FacilityTypeBadge(type = f.type)
                                }
                                if (f.description != null) {
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = f.description,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }

                    // Booking rules
                    item {
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = stringResource(R.string.facility_booking_rules),
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Spacer(modifier = Modifier.height(8.dp))

                                if (f.availableFrom != null && f.availableTo != null) {
                                    DetailRow(stringResource(R.string.facility_available_hours), "${f.availableFrom} – ${f.availableTo}")
                                }
                                if (f.minSlotDuration != null) {
                                    DetailRow(stringResource(R.string.facility_min_duration), "${f.minSlotDuration} min")
                                }
                                if (f.maxDuration != null) {
                                    DetailRow(stringResource(R.string.facility_max_duration), "${f.maxDuration} ${f.maxDurationUnit ?: "min"}")
                                }
                                if (f.maxHorses != null) {
                                    DetailRow(stringResource(R.string.facility_max_horses), "${f.maxHorses}")
                                }
                            }
                        }
                    }

                    // Date navigation
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            IconButton(onClick = { viewModel.navigateDate(-1) }) {
                                Icon(Icons.Default.ChevronLeft, contentDescription = stringResource(R.string.nav_previous))
                            }
                            Text(
                                text = selectedDate.format(DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM)),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Medium
                            )
                            IconButton(onClick = { viewModel.navigateDate(1) }) {
                                Icon(Icons.Default.ChevronRight, contentDescription = stringResource(R.string.nav_next))
                            }
                        }
                    }

                    // Availability time slots
                    item {
                        Text(
                            text = stringResource(R.string.facility_availability),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        AvailabilityTimeSlots(
                            availableFrom = f.availableFrom,
                            availableTo = f.availableTo,
                            reservations = reservations
                        )
                    }

                    // Reservations for selected date
                    if (reservations.isNotEmpty()) {
                        item {
                            Text(
                                text = stringResource(R.string.facilities_reservations_today),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(top = 8.dp)
                            )
                        }
                        items(reservations) { reservation ->
                            ReservationCard(
                                reservation = reservation,
                                onClick = {
                                    navController.navigate(Route.ReservationDetail.createRoute(reservation.id))
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(text = label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(text = value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
    }
}
