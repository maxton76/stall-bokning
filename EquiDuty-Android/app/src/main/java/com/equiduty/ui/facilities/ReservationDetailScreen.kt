package com.equiduty.ui.facilities

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Edit
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
import com.equiduty.ui.facilities.components.FacilityTypeBadge
import com.equiduty.ui.facilities.components.ReservationStatusBadge
import com.equiduty.ui.navigation.Route
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReservationDetailScreen(
    navController: NavController,
    viewModel: ReservationDetailViewModel = hiltViewModel()
) {
    val reservation by viewModel.reservation.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val isCancelled by viewModel.isCancelled.collectAsState()
    var showCancelDialog by remember { mutableStateOf(false) }

    LaunchedEffect(isCancelled) {
        if (isCancelled) navController.popBackStack()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(reservation?.facilityName ?: "") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.back))
                    }
                },
                actions = {
                    if (viewModel.canEdit) {
                        IconButton(onClick = {
                            reservation?.let {
                                navController.navigate(Route.ReservationForm.createRoute(reservationId = it.id))
                            }
                        }) {
                            Icon(Icons.Default.Edit, contentDescription = stringResource(R.string.edit))
                        }
                    }
                }
            )
        }
    ) { padding ->
        if (isLoading && reservation == null) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            reservation?.let { res ->
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Status
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center
                    ) {
                        ReservationStatusBadge(status = res.status)
                    }

                    // Details card
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = res.facilityName,
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                FacilityTypeBadge(type = res.facilityType)
                            }

                            HorizontalDivider()

                            DetailRow(stringResource(R.string.reservation_date), formatDate(res.startTime))
                            DetailRow(stringResource(R.string.reservation_start_time), formatTime(res.startTime))
                            DetailRow(stringResource(R.string.reservation_end_time), formatTime(res.endTime))

                            if (res.horseName != null) {
                                DetailRow(stringResource(R.string.reservation_horse), res.horseName)
                            }

                            DetailRow(stringResource(R.string.reservation_booked_by), res.userFullName)

                            if (!res.notes.isNullOrBlank()) {
                                HorizontalDivider()
                                Text(
                                    text = stringResource(R.string.reservation_notes),
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Text(text = res.notes, style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                    }

                    // Cancel button
                    if (viewModel.canCancel) {
                        Spacer(modifier = Modifier.weight(1f))
                        OutlinedButton(
                            onClick = { showCancelDialog = true },
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = MaterialTheme.colorScheme.error
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(stringResource(R.string.reservation_cancel))
                        }
                    }
                }
            }
        }
    }

    // Cancel confirmation dialog
    if (showCancelDialog) {
        AlertDialog(
            onDismissRequest = { showCancelDialog = false },
            title = { Text(stringResource(R.string.reservation_cancel)) },
            text = { Text(stringResource(R.string.reservation_cancel_confirm)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        showCancelDialog = false
                        viewModel.cancelReservation()
                    },
                    colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error)
                ) {
                    Text(stringResource(R.string.yes))
                }
            },
            dismissButton = {
                TextButton(onClick = { showCancelDialog = false }) {
                    Text(stringResource(R.string.no))
                }
            }
        )
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium
        )
    }
}

private fun formatDate(isoDateTime: String): String {
    return try {
        val dt = OffsetDateTime.parse(isoDateTime)
        dt.format(DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM))
    } catch (e: Exception) {
        isoDateTime.take(10)
    }
}

private fun formatTime(isoDateTime: String): String {
    return try {
        val dt = OffsetDateTime.parse(isoDateTime)
        dt.format(DateTimeFormatter.ofPattern("HH:mm"))
    } catch (e: Exception) {
        isoDateTime
    }
}
