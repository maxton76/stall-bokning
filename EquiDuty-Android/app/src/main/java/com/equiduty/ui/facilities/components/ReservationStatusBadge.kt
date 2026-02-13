package com.equiduty.ui.facilities.components

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.equiduty.R
import com.equiduty.domain.model.ReservationStatus

@Composable
fun ReservationStatusBadge(status: ReservationStatus, modifier: Modifier = Modifier) {
    val (backgroundColor, textColor, labelRes) = when (status) {
        ReservationStatus.PENDING -> Triple(Color(0xFFFFF3CD), Color(0xFF856404), R.string.reservation_status_pending)
        ReservationStatus.CONFIRMED -> Triple(Color(0xFFD4EDDA), Color(0xFF155724), R.string.reservation_status_confirmed)
        ReservationStatus.CANCELLED -> Triple(Color(0xFFE2E3E5), Color(0xFF383D41), R.string.reservation_status_cancelled)
        ReservationStatus.COMPLETED -> Triple(Color(0xFFCCE5FF), Color(0xFF004085), R.string.reservation_status_completed)
        ReservationStatus.NO_SHOW -> Triple(Color(0xFFF8D7DA), Color(0xFF721C24), R.string.reservation_status_no_show)
        ReservationStatus.REJECTED -> Triple(Color(0xFFF8D7DA), Color(0xFF721C24), R.string.reservation_status_rejected)
    }

    Surface(
        color = backgroundColor,
        shape = RoundedCornerShape(4.dp),
        modifier = modifier
    ) {
        Text(
            text = stringResource(labelRes),
            color = textColor,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
        )
    }
}
