package com.equiduty.ui.featurerequests.components

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.equiduty.R
import com.equiduty.domain.model.FeatureRequestStatus

@Composable
fun StatusBadge(status: FeatureRequestStatus, modifier: Modifier = Modifier) {
    val (backgroundColor, textColor, labelRes) = when (status) {
        FeatureRequestStatus.OPEN -> Triple(Color(0xFFDBEAFE), Color(0xFF1D4ED8), R.string.fr_status_open)
        FeatureRequestStatus.UNDER_REVIEW -> Triple(Color(0xFFFEF9C3), Color(0xFFA16207), R.string.fr_status_under_review)
        FeatureRequestStatus.PLANNED -> Triple(Color(0xFFEDE9FE), Color(0xFF7C3AED), R.string.fr_status_planned)
        FeatureRequestStatus.IN_PROGRESS -> Triple(Color(0xFFFFEDD5), Color(0xFFC2410C), R.string.fr_status_in_progress)
        FeatureRequestStatus.COMPLETED -> Triple(Color(0xFFDCFCE7), Color(0xFF15803D), R.string.fr_status_completed)
        FeatureRequestStatus.DECLINED -> Triple(Color(0xFFFEE2E2), Color(0xFFDC2626), R.string.fr_status_declined)
    }

    Surface(
        color = backgroundColor,
        shape = RoundedCornerShape(12.dp),
        modifier = modifier
    ) {
        Text(
            text = stringResource(labelRes),
            color = textColor,
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
        )
    }
}
