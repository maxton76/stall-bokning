package com.equiduty.ui.facilities.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.equiduty.domain.model.FacilityReservation
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter

@Composable
fun ReservationCard(
    reservation: FacilityReservation,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val startFormatted = formatReservationTime(reservation.startTime)
    val endFormatted = formatReservationTime(reservation.endTime)
    val dateFormatted = formatReservationDate(reservation.startTime)

    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = reservation.facilityName,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
                ReservationStatusBadge(status = reservation.status)
            }

            Spacer(modifier = Modifier.height(4.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Schedule,
                    contentDescription = null,
                    modifier = Modifier.size(14.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = "$dateFormatted  $startFormatted – $endFormatted",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            val horseNames = reservation.allHorseNames
            if (horseNames.isNotEmpty()) {
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = if (horseNames.size == 1) horseNames[0] else "${horseNames.size} hästar",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

private fun formatReservationTime(isoDateTime: String): String {
    return try {
        val dt = OffsetDateTime.parse(isoDateTime)
        dt.format(DateTimeFormatter.ofPattern("HH:mm"))
    } catch (e: Exception) {
        isoDateTime.substringAfter("T").take(5)
    }
}

private fun formatReservationDate(isoDateTime: String): String {
    return try {
        val dt = OffsetDateTime.parse(isoDateTime)
        dt.format(DateTimeFormatter.ofPattern("d MMM"))
    } catch (e: Exception) {
        isoDateTime.take(10)
    }
}
