package com.equiduty.ui.facilities.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.equiduty.domain.model.FacilityReservation
import java.time.LocalTime
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter

data class TimeSlot(
    val time: String,
    val isAvailable: Boolean,
    val isBooked: Boolean
)

@Composable
fun AvailabilityTimeSlots(
    availableFrom: String?,
    availableTo: String?,
    reservations: List<FacilityReservation>,
    modifier: Modifier = Modifier
) {
    val slots = generateTimeSlots(availableFrom, availableTo, reservations)

    Row(
        modifier = modifier
            .horizontalScroll(rememberScrollState())
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        slots.forEach { slot ->
            val backgroundColor = when {
                slot.isBooked -> Color(0xFFFFCDD2)
                slot.isAvailable -> Color(0xFFC8E6C9)
                else -> Color(0xFFE0E0E0)
            }

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .clip(RoundedCornerShape(4.dp))
                    .background(backgroundColor)
                    .padding(horizontal = 6.dp, vertical = 8.dp)
                    .width(36.dp)
            ) {
                Text(
                    text = slot.time,
                    fontSize = 10.sp,
                    color = Color.DarkGray
                )
            }
        }
    }
}

private fun generateTimeSlots(
    availableFrom: String?,
    availableTo: String?,
    reservations: List<FacilityReservation>
): List<TimeSlot> {
    val startHour = availableFrom?.take(2)?.toIntOrNull() ?: 6
    val endHour = availableTo?.take(2)?.toIntOrNull() ?: 22
    val slots = mutableListOf<TimeSlot>()

    for (hour in startHour until endHour) {
        for (minute in listOf(0, 30)) {
            val timeStr = "%02d:%02d".format(hour, minute)
            val slotStart = LocalTime.of(hour, minute)
            val slotEnd = slotStart.plusMinutes(30)

            val isBooked = reservations.any { reservation ->
                try {
                    val resStart = OffsetDateTime.parse(reservation.startTime).toLocalTime()
                    val resEnd = OffsetDateTime.parse(reservation.endTime).toLocalTime()
                    slotStart < resEnd && slotEnd > resStart
                } catch (e: Exception) {
                    false
                }
            }

            slots.add(TimeSlot(time = timeStr, isAvailable = !isBooked, isBooked = isBooked))
        }
    }

    return slots
}
